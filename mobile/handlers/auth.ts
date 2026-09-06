import { http, HttpResponse } from 'msw';
import { handleSimulation, isAuthorized, unauthorized } from './middleware';
import { validCredentials, seedLogin, state } from './fixtures/seed';

export const authHandlers = [
  // POST /api/v1/auth/login
  http.post('*/api/v1/auth/login', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;

    const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: {
            ...(!email ? { email: ['The email field is required.'] } : {}),
            ...(!password ? { password: ['The password field is required.'] } : {}),
          },
        },
        { status: 422 },
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: { email: ['The email must be a valid email address.'] },
        },
        { status: 422 },
      );
    }

    const matched = validCredentials.some(
      (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password,
    );

    if (matched) {
      const isMustChange = email.toLowerCase().includes('mustchange');
      const displayName = email.toLowerCase().includes('alex')
        ? 'Alex Vance'
        : seedLogin.user.name;
      const userPayload = isMustChange
        ? {
            ...seedLogin.user,
            name: displayName,
            must_change_password: true,
          }
        : {
            ...seedLogin.user,
            name: displayName,
          };
      return HttpResponse.json(
        {
          ...seedLogin,
          user: userPayload,
        },
        { status: 200 },
      );
    }

    return HttpResponse.json(
      { message: 'These credentials do not match our records.' },
      { status: 401 },
    );
  }),

  // Optional match without /api/v1
  http.post('*/auth/login', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;

    const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: {
            ...(!email ? { email: ['The email field is required.'] } : {}),
            ...(!password ? { password: ['The password field is required.'] } : {}),
          },
        },
        { status: 422 },
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: { email: ['The email must be a valid email address.'] },
        },
        { status: 422 },
      );
    }

    const matched = validCredentials.some(
      (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password,
    );

    if (matched) {
      const isMustChange = email.toLowerCase().includes('mustchange');
      const displayName = email.toLowerCase().includes('alex')
        ? 'Alex Vance'
        : seedLogin.user.name;
      const userPayload = isMustChange
        ? {
            ...seedLogin.user,
            name: displayName,
            must_change_password: true,
          }
        : {
            ...seedLogin.user,
            name: displayName,
          };
      return HttpResponse.json(
        {
          ...seedLogin,
          user: userPayload,
        },
        { status: 200 },
      );
    }

    return HttpResponse.json(
      { message: 'These credentials do not match our records.' },
      { status: 401 },
    );
  }),

  // POST /api/v1/auth/forgot-password & */auth/forgot-password
  http.post('*/api/v1/auth/forgot-password', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;

    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: { email: ['The email must be a valid email address.'] },
        },
        { status: 422 },
      );
    }

    return HttpResponse.json(
      { message: 'If an account exists with this email, password reset instructions have been sent.' },
      { status: 200 },
    );
  }),

  http.post('*/auth/forgot-password', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;

    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: { email: ['The email must be a valid email address.'] },
        },
        { status: 422 },
      );
    }

    return HttpResponse.json(
      { message: 'If an account exists with this email, password reset instructions have been sent.' },
      { status: 200 },
    );
  }),

  // POST /api/v1/auth/change-password & */auth/change-password
  http.post('*/api/v1/auth/change-password', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;

    if (!isAuthorized(request)) return unauthorized();

    const body = (await request.json().catch(() => ({}))) as {
      current_password?: string;
      new_password?: string;
      new_password_confirmation?: string;
      password?: string;
    };

    const isCurrentPasswordValid =
      Boolean(body.current_password) &&
      (validCredentials.some((c) => c.password === body.current_password) ||
        body.current_password === 'password123' ||
        body.current_password === 'Password123!' ||
        body.current_password === 'TempPass!23');

    if (!isCurrentPasswordValid) {
      return HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 });
    }

    const newPass = body.new_password || body.password;
    if (!newPass || newPass.length < 8) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: { new_password: ['The password must be at least 8 characters.'] },
        },
        { status: 422 },
      );
    }

    if (body.new_password_confirmation && body.new_password_confirmation !== newPass) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: { new_password_confirmation: ['Password confirmation does not match.'] },
        },
        { status: 422 },
      );
    }

    state.profile.must_change_password = false;
    return HttpResponse.json(
      { message: 'Password has been successfully updated.' },
      { status: 200 },
    );
  }),

  http.post('*/auth/change-password', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;

    if (!isAuthorized(request)) return unauthorized();

    const body = (await request.json().catch(() => ({}))) as {
      current_password?: string;
      new_password?: string;
      new_password_confirmation?: string;
      password?: string;
    };

    const isCurrentPasswordValid =
      Boolean(body.current_password) &&
      (validCredentials.some((c) => c.password === body.current_password) ||
        body.current_password === 'password123' ||
        body.current_password === 'Password123!' ||
        body.current_password === 'TempPass!23');

    if (!isCurrentPasswordValid) {
      return HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 });
    }

    const newPass = body.new_password || body.password;
    if (!newPass || newPass.length < 8) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: { new_password: ['The password must be at least 8 characters.'] },
        },
        { status: 422 },
      );
    }

    if (body.new_password_confirmation && body.new_password_confirmation !== newPass) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: { new_password_confirmation: ['Password confirmation does not match.'] },
        },
        { status: 422 },
      );
    }

    state.profile.must_change_password = false;
    return HttpResponse.json(
      { message: 'Password has been successfully updated.' },
      { status: 200 },
    );
  }),
];
