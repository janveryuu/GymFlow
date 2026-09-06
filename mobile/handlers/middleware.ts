import { delay, HttpResponse } from 'msw';

export async function applyDelay(request: Request): Promise<void> {
  const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
  const mockDelayHeader = request.headers.get('x-mock-delay');

  if (!isTest || mockDelayHeader !== null) {
    if (mockDelayHeader !== null) {
      const ms = parseInt(mockDelayHeader, 10);
      if (!isNaN(ms) && ms > 0) {
        await delay(ms);
      }
    } else {
      const ms = Math.floor(Math.random() * (800 - 300 + 1)) + 300;
      await delay(ms);
    }
  }
}

export async function handleSimulation(request: Request): Promise<Response | null> {
  // Apply latency delay before returning simulated error responses
  await applyDelay(request);

  // Check for error simulation headers (supporting both x-simulate-error and x-mock-status)
  const sim = request.headers.get('x-simulate-error') || request.headers.get('x-mock-status');

  if (sim === 'timeout') {
    return HttpResponse.error();
  }
  if (sim === '401') {
    return HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 });
  }
  if (sim === '404') {
    return HttpResponse.json({ message: 'Resource not found.' }, { status: 404 });
  }
  if (sim === '409') {
    return HttpResponse.json(
      {
        error: 'conflict',
        code: 'SESSION_CANCELLED_BY_GYM',
        reason: 'session_cancelled',
        message: 'This session has already been cancelled by the gym.',
      },
      { status: 409 },
    );
  }
  if (sim === '422') {
    return HttpResponse.json(
      {
        message: 'The given data was invalid.',
        errors: { form: ['Simulated validation failure.'] },
      },
      { status: 422 },
    );
  }
  if (sim === '500') {
    return HttpResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }

  return null;
}

export function isAuthorized(request: Request): boolean {
  let authHeader = '';
  try {
    if (typeof request.headers.get === 'function') {
      authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';
    } else {
      authHeader = (request.headers as any)?.Authorization || (request.headers as any)?.authorization || '';
    }
  } catch {
    authHeader = '';
  }

  console.log('[DEBUG isAuthorized] URL:', request.url, 'Header:', authHeader, 'Keys:', [...(request.headers as any).keys?.() || []]);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  if (
    !token ||
    token === 'null' ||
    token === 'undefined' ||
    token === 'expired-or-invalid-token' ||
    token === 'expired-token'
  ) {
    return false;
  }
  return true;
}

export const unauthorized = () =>
  HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 });
