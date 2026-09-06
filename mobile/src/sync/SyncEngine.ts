/**
 * SyncEngine: Offline-first mutation queue processor for GymFlow Mobile.
 * Implements:
 * 1. Priority Drain: attendance before progress before general mutations; FIFO by created_at.
 * 2. Exponential Backoff: base = 2000ms, max = 300,000ms (5min), ±20% jitter.
 * 3. HTTP 401 Unauthorized: pauses queue without dropping items; resumes on re-authentication.
 * 4. HTTP 409 Conflict: marks item rejected (never deleted); updates local session status to
 *    'cancelled_by_gym' with can_cancel = false; surfaces active dismissible banner.
 * 5. 7-Day TTL: pending items older than 7 days trigger amber warning indicator flag.
 * 6. Idempotency Deduplication: handles 200/201 response equivalence without duplicate data.
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../db/connection';
import { rowToWriteQueueItem } from '../db/mappers';
import { apiClient as defaultApiClient } from '../api/client';
import { useSyncStore } from '../store/syncStore';
import type {
  WriteQueueItem,
  SyncEngineStatus,
  SyncEngineState,
  DrainResult,
} from './types';

export const ENTITY_PRIORITIES: Record<string, number> = {
  attendance: 1,
  progress: 2,
  session_cancel: 3,
  preferences: 3,
  profile: 3,
};

/**
 * Pure comparison function for queue drain ordering.
 * 1. Attendance (1) before Progress (2) before others (3).
 * 2. Strict FIFO by created_at timestamp ascending.
 * 3. Tie-breaker: entity priority, then ID.
 */
export function compareQueueItems(a: WriteQueueItem, b: WriteQueueItem): number {
  const pA = ENTITY_PRIORITIES[a.entity_type] ?? 3;
  const pB = ENTITY_PRIORITIES[b.entity_type] ?? 3;

  if (pA !== pB) {
    return pA - pB;
  }

  const timeA = new Date(a.created_at).getTime();
  const timeB = new Date(b.created_at).getTime();
  if (timeA !== timeB) {
    return timeA - timeB;
  }

  return (a.id || '').localeCompare(b.id || '');
}

/**
 * Evaluates whether any pending or paused item exceeds 7 days (604,800,000 ms).
 */
export function has7DayTtlExpired(items: WriteQueueItem[], now: Date = new Date()): boolean {
  const TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();
  for (const item of items) {
    if (item.status === 'pending' || item.status === 'paused') {
      const itemAge = nowMs - new Date(item.created_at).getTime();
      if (itemAge > TTL_MS) {
        return true;
      }
    }
  }
  return false;
}

export class SyncEngine {
  private customDb: SQLiteDatabase | null = null;
  private client: any;
  private netInfoUnsubscribe: (() => void) | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private isDraining = false;

  public state: SyncEngineState = 'idle';
  public activeToken: string | null = null;
  public activeBanner: string | null = null;
  public processedOrder: string[] = []; // Tracks IDs of processed items to verify priority order

  constructor(optionsOrServer?: any, maybeDb?: any) {
    if (optionsOrServer && maybeDb) {
      this.client = optionsOrServer;
      this.customDb = maybeDb;
    } else if (optionsOrServer && (optionsOrServer.db || optionsOrServer.client)) {
      this.customDb = optionsOrServer.db || null;
      this.client = optionsOrServer.client || null;
    } else {
      this.client = optionsOrServer || null;
    }

    this.initNetworkListener();
  }

  private async getDb(): Promise<SQLiteDatabase> {
    if (this.customDb) {
      return this.customDb;
    }
    return getDatabase();
  }

  private getHttpClient(): any {
    return this.client || defaultApiClient;
  }

  private initNetworkListener(): void {
    try {
      this.netInfoUnsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
        const isConnected = Boolean(netState.isConnected && netState.isInternetReachable !== false);
        this.handleNetworkChange(isConnected);
      });
    } catch {
      // NetInfo unavailable in some test environments
    }
  }

  public handleNetworkChange(isConnected: boolean): void {
    if (!isConnected) {
      this.state = 'offline';
      this.cancelRetryTimer();
      useSyncStore.getState().setIsOnline(false);
    } else {
      useSyncStore.getState().setIsOnline(true);
      if (this.state === 'offline') {
        this.state = 'idle';
        useSyncStore.getState().setSyncState('idle');
        this.drainQueue().catch(() => {});
      }
    }
  }

  public setToken(token: string | null): void {
    this.activeToken = token;
    if (token && this.state === 'paused') {
      this.state = 'idle';
      useSyncStore.getState().setSyncState('idle');
      this.drainQueue().catch(() => {});
    }
  }

  public dismissBanner(): void {
    this.activeBanner = null;
    useSyncStore.getState().dismissBanner();
  }

  public pauseQueue(): void {
    this.state = 'paused';
    useSyncStore.getState().setSyncState('paused');
  }

  public resumeQueue(): void {
    if (this.state === 'paused') {
      this.state = 'idle';
      useSyncStore.getState().setSyncState('idle');
    }
  }

  private cancelRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Calculates exponential backoff with ±20% jitter.
   * Formula:
   * Base Delay = min(300000, 2000 * 2^retry_count)
   * Jitter Factor = 1 + (random * 0.4 - 0.2) = 0.8 + 0.4 * random
   * Final Delay = round(Base Delay * Jitter Factor)
   */
  public static calculateBackoffDelay(retryCount: number, deterministicRandom?: number): number {
    const baseDelay = Math.min(300000, 2000 * Math.pow(2, retryCount));
    const randomVal = deterministicRandom !== undefined ? deterministicRandom : Math.random();
    const jitterFactor = 1 + (randomVal * 0.4 - 0.2); // [0.8, 1.2] (±20%)
    return Math.round(baseDelay * jitterFactor);
  }

  /**
   * Retrieves live status of the queue and engine.
   */
  public async getStatus(now: Date = new Date()): Promise<SyncEngineStatus> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM WriteQueue WHERE status IN ('pending', 'paused', 'rejected') ORDER BY created_at ASC"
    );
    const items = rows.map(rowToWriteQueueItem);

    const pending = items.filter((i) => i.status === 'pending' || i.status === 'paused');
    const rejected = items.filter((i) => i.status === 'rejected');
    const has7Day = has7DayTtlExpired(items, now);

    // Sync state with store
    useSyncStore.getState().setPendingCount(pending.length);
    useSyncStore.getState().setRejectedCount(rejected.length);
    useSyncStore.getState().setAmberWarning(has7Day);
    if (this.activeBanner) {
      useSyncStore.getState().setActiveBanner(this.activeBanner);
    }

    return {
      state: this.state,
      pending_count: pending.length,
      rejected_count: rejected.length,
      has_7day_warning: has7Day,
      active_banner: this.activeBanner,
    };
  }

  /**
   * Enqueues a mutation into the durable SQLite WriteQueue.
   */
  public async enqueue(item: {
    entity_type: string;
    action?: string;
    endpoint?: string;
    method?: string;
    payload: any;
    idempotency_key?: string;
    created_at?: string;
  }): Promise<WriteQueueItem> {
    const db = await this.getDb();
    const id = `wq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = item.created_at || new Date().toISOString();
    const action = item.action || 'create';
    const method = item.method || 'POST';
    const endpoint = item.endpoint || '';
    const payloadJson = typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload ?? {});
    const idempotencyKey = item.idempotency_key || null;

    if (idempotencyKey) {
      const existing = await db.getFirstAsync<any>(
        'SELECT * FROM WriteQueue WHERE idempotency_key = ?',
        [idempotencyKey]
      );
      if (existing) {
        return rowToWriteQueueItem(existing);
      }
    }

    await db.runAsync(
      `INSERT INTO WriteQueue (id, entity_type, action, endpoint, method, payload_json, idempotency_key, attempt_count, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?)`,
      [id, item.entity_type, action, endpoint, method, payloadJson, idempotencyKey, createdAt]
    );

    const queueItem: WriteQueueItem = {
      id,
      entity_type: item.entity_type,
      action,
      endpoint,
      method,
      payload: item.payload,
      idempotency_key: idempotencyKey ?? undefined,
      created_at: createdAt,
      retry_count: 0,
      attempt_count: 0,
      status: 'pending',
      last_error: null,
      rejected_reason: null,
      rejection_reason: null,
    };

    useSyncStore.getState().incrementPending();

    // Re-check 7-day TTL if historical timestamp passed
    await this.getStatus();

    return queueItem;
  }

  /**
   * Drains the queue in strict priority and FIFO order:
   * 1. Attendance mutations execute first (FIFO by created_at)
   * 2. Progress mutations execute second (FIFO by created_at)
   * 3. General mutations execute third (FIFO by created_at)
   */
  public async drainQueue(): Promise<DrainResult> {
    if (this.isDraining) {
      return { processed: 0, paused: this.state === 'paused', rejected: 0, failed: 0 };
    }

    if (this.state === 'paused') {
      return { processed: 0, paused: true, rejected: 0, failed: 0 };
    }

    // Check network connectivity
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected || net.isInternetReachable === false) {
        this.state = 'offline';
        useSyncStore.getState().setIsOnline(false);
        return { processed: 0, paused: false, rejected: 0, failed: 0 };
      }
    } catch {
      // If NetInfo fetch throws, continue
    }

    this.isDraining = true;
    this.state = 'syncing';
    useSyncStore.getState().setSyncState('syncing');

    this.processedOrder = [];
    let processedCount = 0;
    let rejectedCount = 0;
    let failedCount = 0;

    const db = await this.getDb();
    const nowIso = new Date().toISOString();

    try {
      // Query ready pending items (next_attempt_at is null or <= now)
      const rows = await db.getAllAsync<any>(
        `SELECT * FROM WriteQueue
         WHERE status = 'pending'
           AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
         ORDER BY
           CASE entity_type
             WHEN 'attendance' THEN 1
             WHEN 'progress' THEN 2
             WHEN 'preferences' THEN 3
             ELSE 4
           END ASC,
           created_at ASC;`,
        [nowIso]
      );

      const items = rows.map(rowToWriteQueueItem);
      // Double check priority sort in-memory
      items.sort(compareQueueItems);

      for (const item of items) {
        const currentState = (this as any).state as SyncEngineState;
        if (currentState === 'paused' || currentState === 'offline') {
          break;
        }

        // Mark item in_flight
        await db.runAsync("UPDATE WriteQueue SET status = 'in_flight' WHERE id = ?", [item.id]);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        if (this.activeToken) {
          headers['Authorization'] = `Bearer ${this.activeToken}`;
        }
        if (item.idempotency_key) {
          headers['x-idempotency-key'] = item.idempotency_key;
        }

        const client = this.getHttpClient();
        let resStatus = 0;
        let resData: any = null;

        try {
          // Check if client has custom request method or standard axios
          if (typeof client.request === 'function') {
            const resp = await client.request({
              method: item.method || 'POST',
              url: item.endpoint,
              data: item.payload,
              headers,
            });
            resStatus = resp.status;
            resData = resp.data;
          } else if (typeof client === 'function') {
            const resp = await client({
              method: item.method || 'POST',
              url: item.endpoint,
              data: item.payload,
              headers,
            });
            resStatus = resp.status;
            resData = resp.data;
          }
        } catch (err: any) {
          if (err.response) {
            resStatus = err.response.status;
            resData = err.response.data;
          } else {
            // Network failure / timeout
            const nextRetry = (item.retry_count ?? 0) + 1;
            const delay = SyncEngine.calculateBackoffDelay(item.retry_count ?? 0);
            const nextAttempt = new Date(Date.now() + delay).toISOString();

            await db.runAsync(
              `UPDATE WriteQueue
               SET status = 'pending', attempt_count = ?, last_attempt_at = ?, next_attempt_at = ?, last_error = ?
               WHERE id = ?`,
              [nextRetry, new Date().toISOString(), nextAttempt, err.message || 'Network error', item.id]
            );

            failedCount++;
            this.state = 'offline';
            useSyncStore.getState().setIsOnline(false);
            this.retryTimer = setTimeout(() => this.drainQueue().catch(() => {}), delay);
            break;
          }
        }

        // Handle responses
        if (resStatus === 200 || resStatus === 201) {
          // Success: delete item from WriteQueue
          await db.runAsync('DELETE FROM WriteQueue WHERE id = ?', [item.id]);
          this.processedOrder.push(item.id);
          processedCount++;
          useSyncStore.getState().decrementPending();
        } else if (resStatus === 401) {
          // 401 Unauthorized Pause Policy:
          // Revert item to pending without deleting or dropping items!
          await db.runAsync(
            `UPDATE WriteQueue
             SET status = 'pending', last_error = '401 Unauthorized: Session token expired'
             WHERE id = ?`,
            [item.id]
          );
          this.state = 'paused';
          useSyncStore.getState().setSyncState('paused');
          break;
        } else if (resStatus === 409) {
          // 409 Conflict Rejection Policy:
          // Mark item as rejected (NOT deleted), surface dismissible banner, label session
          const reason = 'session_cancelled_by_gym';
          const errorMsg = resData?.message || 'Session was cancelled by the gym.';

          await db.runAsync(
            `UPDATE WriteQueue
             SET status = 'rejected', rejection_reason = ?, last_error = ?
             WHERE id = ?`,
            [reason, errorMsg, item.id]
          );
          rejectedCount++;
          useSyncStore.getState().decrementPending();

          this.activeBanner = 'Session was cancelled by the gym.';
          useSyncStore.getState().addRejectedBanner({
            queueId: item.id,
            sessionId: item.payload?.session_id,
            reason: this.activeBanner,
            occurredAt: new Date().toISOString(),
          });

          // If session attendance or cancel, update session in local SQLite cache
          if (item.payload?.session_id) {
            await db.runAsync(
              "UPDATE Session SET status = 'cancelled_by_gym', can_cancel = 0 WHERE id = ?",
              [item.payload.session_id]
            );
          }
        } else {
          // Other error (e.g. 500, 422) -> increment retry count, calculate backoff
          const nextRetry = (item.retry_count ?? 0) + 1;
          const delay = SyncEngine.calculateBackoffDelay(item.retry_count ?? 0);
          const nextAttempt = new Date(Date.now() + delay).toISOString();

          await db.runAsync(
            `UPDATE WriteQueue
             SET status = 'pending', attempt_count = ?, last_attempt_at = ?, next_attempt_at = ?, last_error = ?
             WHERE id = ?`,
            [nextRetry, new Date().toISOString(), nextAttempt, `HTTP ${resStatus}: ${JSON.stringify(resData)}`, item.id]
          );
          failedCount++;

          this.cancelRetryTimer();
          this.retryTimer = setTimeout(() => this.drainQueue().catch(() => {}), delay);
        }
      }
    } finally {
      this.isDraining = false;
      if (this.state !== 'paused' && this.state !== 'offline') {
        this.state = 'idle';
        useSyncStore.getState().setSyncState('idle');
      }
      useSyncStore.getState().setLastSyncAt(new Date().toISOString());
      // Refresh status after drain
      await this.getStatus();
    }

    return {
      processed: processedCount,
      paused: this.state === 'paused',
      rejected: rejectedCount,
      failed: failedCount,
      succeeded: processedCount,
    };
  }

  public destroy(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    this.cancelRetryTimer();
  }
}
