<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /**
     * GET /api/v1/member/profile
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('membership');
        return response()->json($this->profileResponse($user));
    }

    /**
     * PATCH /api/v1/member/profile
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'      => ['sometimes', 'string', 'max:255'],
            'phone'     => ['sometimes', 'nullable', 'string', 'max:30'],
            'photo_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
        ]);

        $user->update($validated);
        $user->load('membership');

        return response()->json($this->profileResponse($user));
    }

    /**
     * Build the canonical profile response shape.
     */
    private function profileResponse($user): array
    {
        $membership = $user->membership;

        return [
            'id'                   => $user->id,
            'name'                 => $user->name,
            'email'                => $user->email,
            'phone'                => $user->phone,
            'photo_url'            => $user->photo_url,
            'must_change_password' => (bool) $user->must_change_password,
            'membership'           => $membership ? [
                'id'         => $membership->external_id ?? 'mem_' . $membership->id,
                'tier'       => $membership->tier,
                'status'     => $membership->status,
                'expires_at' => $membership->expires_at
                    ? $membership->expires_at->toIso8601String()
                    : null,
            ] : null,
            'created_at' => $user->created_at->toIso8601String(),
            'updated_at' => $user->updated_at->toIso8601String(),
        ];
    }
}
