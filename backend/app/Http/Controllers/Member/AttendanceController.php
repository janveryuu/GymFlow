<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\GymSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    /**
     * POST /api/v1/member/attendance
     * Idempotent: same idempotency_key returns 200 with original response.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'session_id'      => ['required'],
            'checked_in_at'   => ['required', 'date'],
            'idempotency_key' => ['required', 'string', 'max:255'],
        ]);

        $userId = $request->user()->id;
        $ikey   = $request->idempotency_key;

        // Idempotency check — scoped to this specific key (globally unique per mobile contract)
        $existing = Attendance::where('idempotency_key', $ikey)->first();
        if ($existing) {
            return response()->json($this->attendanceResponse($existing), 200);
        }

        // Resolve session
        $session = GymSession::find($request->session_id);
        if (! $session) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        // Conflict: session cancelled by gym
        if (in_array($session->status, ['cancelled', 'cancelled_by_gym'], true)) {
            return response()->json([
                'error'   => 'conflict',
                'code'    => 'SESSION_CANCELLED_BY_GYM',
                'reason'  => 'session_cancelled',
                'message' => 'This session has already been cancelled by the gym.',
            ], 409);
        }

        // Create atomically
        $attendance = DB::transaction(function () use ($request, $userId, $session, $ikey) {
            return Attendance::create([
                'user_id'         => $userId,
                'gym_session_id'  => $session->id,
                'status'          => 'confirmed',
                'checked_in_at'   => $request->checked_in_at,
                'idempotency_key' => $ikey,
            ]);
        });

        return response()->json($this->attendanceResponse($attendance), 201);
    }

    private function attendanceResponse(Attendance $a): array
    {
        return [
            'id'            => (string) $a->id,
            'session_id'    => (string) $a->gym_session_id,
            'status'        => $a->status,
            'checked_in_at' => $a->checked_in_at
                ? $a->checked_in_at->toIso8601String()
                : null,
        ];
    }
}
