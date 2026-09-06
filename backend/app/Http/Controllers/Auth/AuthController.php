<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/v1/auth/login  [CONFIRMED / FROZEN]
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'These credentials do not match our records.',
            ], 401);
        }

        // Delete any existing tokens before issuing a fresh one
        $user->tokens()->delete();
        $token = $user->createToken('mobile-app')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'   => $user->id,
                'name' => $user->name,
                'role' => $user->role,
            ],
        ]);
    }

    /**
     * POST /api/v1/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    /**
     * POST /api/v1/auth/forgot-password  [PROPOSED]
     * Anti-enumeration: always returns 200.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        // We attempt the reset but always return the same message
        // to prevent email enumeration attacks.
        Password::sendResetLink(['email' => $request->email]);

        return response()->json([
            'message' => 'If an account exists with this email, password reset instructions have been sent.',
        ]);
    }

    /**
     * POST /api/v1/auth/change-password  [PROPOSED]
     * Supports forced-first-login reset path.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password'             => ['required'],
            'new_password'                 => ['required', 'min:8', 'confirmed'],
            'new_password_confirmation'    => ['required'],
        ]);

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors'  => [
                    'current_password' => ['The current password is incorrect.'],
                ],
            ], 422);
        }

        $user->update([
            'password'             => $request->new_password,
            'must_change_password' => false,
        ]);

        return response()->json([
            'message' => 'Password has been successfully updated.',
        ]);
    }
}
