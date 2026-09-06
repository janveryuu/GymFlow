import { apiClient } from '../../src/api/client';
import axios from 'axios';
import { resetState, state } from '../../handlers/fixtures/seed';

describe('Auth MSW Handlers', () => {
  beforeEach(() => {
    resetState();
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 200 OK with confirmed contract matching byte-for-byte on valid credentials', async () => {
      const payload = {
        email: 'jane.doe@example.com',
        password: 'Password123!',
      };

      const res = await apiClient.post('/api/v1/auth/login', payload);

      expect(res.status).toBe(200);
      expect(res.data).toEqual({
        token: '1|abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
        user: {
          id: 1,
          name: 'Jane Doe',
          role: 'member',
        },
      });
    });

    it('returns 401 Unauthorized when credentials do not match', async () => {
      expect.assertions(2);
      try {
        await apiClient.post('/api/v1/auth/login', {
          email: 'wrong@example.com',
          password: 'BadPassword!',
        });
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(401);
          expect(err.response?.data).toEqual({
            message: 'These credentials do not match our records.',
          });
        }
      }
    });

    it('returns 422 Unprocessable Entity when email or password is missing', async () => {
      expect.assertions(3);
      try {
        await apiClient.post('/api/v1/auth/login', {
          email: '',
          password: '',
        });
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(422);
          expect(err.response?.data.message).toBe('The given data was invalid.');
          expect(err.response?.data.errors).toHaveProperty('email');
        }
      }
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns 200 OK with recovery instructions on valid email', async () => {
      const res = await apiClient.post('/api/v1/auth/forgot-password', {
        email: 'jane.doe@example.com',
      });
      expect(res.status).toBe(200);
      expect(res.data.message).toContain('password reset instructions have been sent');
    });

    it('returns 422 Unprocessable Entity on invalid email format', async () => {
      expect.assertions(2);
      try {
        await apiClient.post('/api/v1/auth/forgot-password', {
          email: 'not-an-email',
        });
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(422);
          expect(err.response?.data.errors).toHaveProperty('email');
        }
      }
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('returns 200 OK and flips must_change_password to false on valid update', async () => {
      state.profile.must_change_password = true;

      const res = await apiClient.post(
        '/api/v1/auth/change-password',
        {
          current_password: 'Password123!',
          new_password: 'NewStrongPassword456!',
          new_password_confirmation: 'NewStrongPassword456!',
        },
        { headers: { Authorization: 'Bearer valid-member-token' } },
      );
      expect(res.status).toBe(200);
      expect(res.data.message).toBe('Password has been successfully updated.');
      expect(state.profile.must_change_password).toBe(false);
    });

    it('returns 401 Unauthorized when Bearer token is missing or expired', async () => {
      expect.assertions(2);
      try {
        await apiClient.post('/api/v1/auth/change-password', {
          current_password: 'Password123!',
          new_password: 'NewStrongPassword456!',
          new_password_confirmation: 'NewStrongPassword456!',
        });
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(401);
          expect(err.response?.data.message).toBe('Unauthenticated.');
        }
      }
    });

    it('returns 422 Unprocessable Entity when password confirmation does not match', async () => {
      expect.assertions(2);
      try {
        await apiClient.post(
          '/api/v1/auth/change-password',
          {
            current_password: 'Password123!',
            new_password: 'NewStrongPassword456!',
            new_password_confirmation: 'DifferentPassword789!',
          },
          { headers: { Authorization: 'Bearer valid-member-token' } },
        );
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(422);
          expect(err.response?.data.errors).toHaveProperty('new_password_confirmation');
        }
      }
    });
  });
});
