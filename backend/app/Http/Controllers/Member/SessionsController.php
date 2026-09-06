<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\GymSession;
use App\Models\SessionBooking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionsController extends Controller
{
    /**
     * GET /api/v1/member/sessions
     */
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = GymSession::with(['trainer', 'workout'])
            ->whereHas('bookings', fn ($q) => $q->where('user_id', $user->id)
                ->whereIn('status', ['booked']))
            ->orderBy('starts_at');

        if ($request->filled('from') || $request->filled('start_date')) {
            $from = $request->filled('from') ? $request->from : $request->start_date;
            $query->where('starts_at', '>=', $from);
        }

        if ($request->filled('to') || $request->filled('end_date')) {
            $to = $request->filled('to') ? $request->to : $request->end_date;
            $query->where('starts_at', '<=', $to);
        }

        $sessions = $query->get();

        $data = $sessions->map(function (GymSession $s) use ($user) {
            $booking = $s->bookings->where('user_id', $user->id)->first();

            return [
                'id'         => (string) $s->id,
                'workout_id' => $s->workout_id ? (string) $s->workout_id : null,
                'title'      => $s->title,
                'trainer'    => $s->trainer ? [
                    'id'   => (string) $s->trainer->id,
                    'name' => $s->trainer->name,
                ] : null,
                'location'   => $s->location,
                'starts_at'  => $s->starts_at->toIso8601String(),
                'ends_at'    => $s->ends_at->toIso8601String(),
                'status'     => $s->status,
                'can_cancel' => $booking && $booking->status === 'booked'
                    && $s->status === 'scheduled',
                'checked_in' => $booking && $booking->checked_in,
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * POST /api/v1/member/sessions/{id}/cancel
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $user    = $request->user();
        $session = GymSession::find($id);

        if (! $session) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        // CRITICAL: if gym already cancelled — return exact 409 shape mobile expects
        if (in_array($session->status, ['cancelled', 'cancelled_by_gym'], true)) {
            return response()->json([
                'error'   => 'conflict',
                'code'    => 'SESSION_CANCELLED_BY_GYM',
                'reason'  => 'session_cancelled',
                'message' => 'This session has already been cancelled by the gym.',
            ], 409);
        }

        $booking = SessionBooking::where('user_id', $user->id)
            ->where('gym_session_id', $session->id)
            ->first();

        if (! $booking) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        $booking->update([
            'status'        => 'cancelled',
            'cancel_reason' => $request->reason ?? null,
        ]);

        return response()->json([
            'id'         => (string) $session->id,
            'status'     => 'cancelled',
            'can_cancel' => false,
            'message'    => 'Session successfully cancelled.',
        ]);
    }
}
