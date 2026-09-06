/**
 * Sync Queue Engine for GymFlow Mobile E2E tests.
 * Implements FIFO per entity type, attendance-before-progress priority,
 * exponential backoff (2s -> 5m ±20% jitter), 401 pause policy,
 * 409 conflict rejection & dismissible banner, and 7-day TTL check.
 */

import { MockServer } from './mock-server.ts';
import { SQLiteStorageEngine } from './sqlite-storage.ts';
import type { SyncEngineStatus, WriteQueueItem } from './types.ts';

export class SyncEngine {
  private server: MockServer;
  private db: SQLiteStorageEngine;

  public state: 'idle' | 'syncing' | 'paused' | 'offline' = 'idle';
  public activeToken: string | null = null;
  public activeBanner: string | null = null;
  public processedOrder: string[] = []; // Tracks IDs of processed items to verify priority order

  constructor(server: MockServer, db: SQLiteStorageEngine) {
    this.server = server;
    this.db = db;
  }

  public setToken(token: string | null): void {
    this.activeToken = token;
    if (token && this.state === 'paused') {
      this.state = 'idle';
    }
  }

  public dismissBanner(): void {
    this.activeBanner = null;
  }

  /**
   * Calculates exponential backoff with ±20% jitter.
   * Formula:
   * Base Delay = min(300000, 2000 * 2^retry_count)
   * Jitter Factor = 1 + (random * 0.4 - 0.2)
   * Final Delay = Base Delay * Jitter Factor
   */
  public static calculateBackoffDelay(retryCount: number, deterministicRandom?: number): number {
    const baseDelay = Math.min(300000, 2000 * Math.pow(2, retryCount));
    const randomVal = deterministicRandom !== undefined ? deterministicRandom : Math.random();
    const jitterFactor = 1 + (randomVal * 0.4 - 0.2); // ±20%
    return Math.round(baseDelay * jitterFactor);
  }

  public async getStatus(now: Date = new Date()): Promise<SyncEngineStatus> {
    const allPending = await this.db.getQueueItems('pending');
    const allRejected = await this.db.getQueueItems('rejected');
    const has7Day = this.db.has7DayTtlExpired(now);

    return {
      state: this.state,
      pending_count: allPending.length,
      rejected_count: allRejected.length,
      has_7day_warning: has7Day,
      active_banner: this.activeBanner,
    };
  }

  /**
   * Drains the queue in strict priority and FIFO order:
   * 1. Attendance mutations execute first (FIFO by created_at)
   * 2. Progress mutations execute second (FIFO by created_at)
   * 3. Other mutations execute in FIFO
   */
  public async drainQueue(): Promise<{
    processed: number;
    paused: boolean;
    rejected: number;
    failed: number;
  }> {
    if (this.state === 'paused') {
      return { processed: 0, paused: true, rejected: 0, failed: 0 };
    }

    if (!this.server.networkConnected) {
      this.state = 'offline';
      return { processed: 0, paused: false, rejected: 0, failed: 0 };
    }

    this.state = 'syncing';
    this.processedOrder = [];
    let processedCount = 0;
    let rejectedCount = 0;
    let failedCount = 0;

    const pendingItems = await this.db.getQueueItems('pending');

    // Priority sorting: attendance before progress; within entity FIFO by created_at
    const sorted = [...pendingItems].sort((a, b) => {
      const getPriority = (type: string) => {
        if (type === 'attendance') return 1;
        if (type === 'progress') return 2;
        return 3;
      };

      const pA = getPriority(a.entity_type);
      const pB = getPriority(b.entity_type);

      if (pA !== pB) {
        return pA - pB;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    for (const item of sorted) {
      if (this.state === 'paused') {
        break;
      }

      await this.db.updateQueueItem(item.id, { status: 'in_flight' });

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (this.activeToken) {
          headers['Authorization'] = `Bearer ${this.activeToken}`;
        }

        const res = await this.server.request(item.method, item.endpoint, item.payload, headers);

        if (res.status === 200 || res.status === 201) {
          // Success: remove item from queue and record in history
          await this.db.removeQueueItem(item.id);
          this.processedOrder.push(item.id);
          processedCount++;
        } else if (res.status === 401) {
          // 401 Unauthorized Pause Policy:
          // Immediately pause queue without deleting or dropping items!
          await this.db.updateQueueItem(item.id, {
            status: 'pending',
            last_error: '401 Unauthorized: Session token expired',
          });
          this.state = 'paused';
          return { processed: processedCount, paused: true, rejected: rejectedCount, failed: failedCount };
        } else if (res.status === 409) {
          // 409 Conflict Rejection Policy:
          // Mark item as 'rejected' (NOT deleted), surface dismissible banner, label session
          await this.db.updateQueueItem(item.id, {
            status: 'rejected',
            last_error: res.data?.message || '409 Conflict',
            rejected_reason: 'session_cancelled_by_gym',
          });
          rejectedCount++;

          this.activeBanner = 'Session was cancelled by the gym.';

          // If session attendance or cancel, update session in cache
          if (item.payload?.session_id) {
            await this.db.updateSessionStatus(item.payload.session_id, 'cancelled_by_gym', {
              can_cancel: false,
            });
          }
        } else {
          // Other error (e.g. 500, 422) -> increment retry count, calculate backoff
          const nextRetry = item.retry_count + 1;
          await this.db.updateQueueItem(item.id, {
            status: 'pending',
            retry_count: nextRetry,
            last_error: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
          });
          failedCount++;
        }
      } catch (err: any) {
        // Network timeout / dropped connection
        const nextRetry = item.retry_count + 1;
        await this.db.updateQueueItem(item.id, {
          status: 'pending',
          retry_count: nextRetry,
          last_error: err.message || 'Network error',
        });
        failedCount++;
        this.state = 'offline';
        break; // Stop draining on network failure
      }
    }

    if (this.state !== 'paused' && this.state !== 'offline') {
      this.state = 'idle';
    }

    return {
      processed: processedCount,
      paused: this.state === 'paused',
      rejected: rejectedCount,
      failed: failedCount,
    };
  }

  public resumeQueue(): void {
    if (this.state === 'paused') {
      this.state = 'idle';
    }
  }

  public pauseQueue(): void {
    this.state = 'paused';
  }
}
