<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\ProgressEntry;
use App\Models\Workout;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProgressController extends Controller
{
    /**
     * POST /api/v1/member/progress
     * Mandatory idempotency_key — true idempotent.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'workout_id'       => ['required'],
            'started_at'       => ['sometimes', 'nullable', 'date'],
            'completed_at'     => ['required', 'date'],
            'duration_seconds' => ['required', 'integer', 'min:0'],
            'calories_burned'  => ['required', 'integer', 'min:0'],
            'heart_rate'       => ['sometimes', 'nullable', 'integer', 'min:0'],
            'idempotency_key'  => ['required', 'string', 'max:255'],
        ]);

        $userId = $request->user()->id;
        $ikey   = $request->idempotency_key;

        // True idempotency: same key → same 200 response, no new row
        $existing = ProgressEntry::where('idempotency_key', $ikey)
            ->where('user_id', $userId)
            ->first();

        if ($existing) {
            return response()->json($this->progressResponse($existing), 200);
        }

        // Resolve workout
        $workout = Workout::find($request->workout_id);

        $entry = DB::transaction(function () use ($request, $userId, $ikey) {
            return ProgressEntry::create([
                'user_id'          => $userId,
                'workout_id'       => $request->workout_id,
                'started_at'       => $request->started_at,
                'completed_at'     => $request->completed_at,
                'duration_seconds' => $request->duration_seconds,
                'calories_burned'  => $request->calories_burned,
                'heart_rate'       => $request->heart_rate,
                'idempotency_key'  => $ikey,
            ]);
        });

        $entry->setRelation('workout', $workout);

        return response()->json($this->progressResponse($entry), 201);
    }

    /**
     * GET /api/v1/member/progress?period=week|month|year|all
     */
    public function index(Request $request): JsonResponse
    {
        $user   = $request->user();
        $period = $request->query('period', 'week');

        $from = match ($period) {
            'week'  => Carbon::now()->startOfWeek(),
            'month' => Carbon::now()->startOfMonth(),
            'year'  => Carbon::now()->startOfYear(),
            'all'   => null,
            // Legacy numeric day support (7, 30, 90)
            '7'     => Carbon::now()->subDays(7),
            '30'    => Carbon::now()->subDays(30),
            '90'    => Carbon::now()->subDays(90),
            default => Carbon::now()->startOfWeek(),
        };

        $query = ProgressEntry::with('workout')
            ->where('user_id', $user->id);

        if ($from) {
            $query->where('completed_at', '>=', $from);
        }

        $entries = $query->orderBy('completed_at')->get();

        // Aggregates
        $totalWorkouts         = $entries->count();
        $totalDurationSeconds  = $entries->sum('duration_seconds');
        $totalCalories         = $entries->sum('calories_burned');
        $heartRates            = $entries->whereNotNull('heart_rate')->pluck('heart_rate');
        $averageHeartRate      = $heartRates->isNotEmpty() ? round($heartRates->avg()) : null;

        // Weekly goal from preferences
        $prefs       = $user->preferences;
        $weeklyGoal  = $prefs ? $prefs->weekly_workout_goal : 3;

        // Goal progress (based on current week regardless of selected period)
        $weekStart      = Carbon::now()->startOfWeek();
        $weekWorkouts   = ProgressEntry::where('user_id', $user->id)
            ->where('completed_at', '>=', $weekStart)
            ->count();
        $goalPercentage = $weeklyGoal > 0
            ? min(100, round(($weekWorkouts / $weeklyGoal) * 100))
            : 0;

        // Chart data (always 7-day view for the chart, week or current period)
        $chartData = $this->buildChartData($user->id, $period);

        $history = $entries->map(fn ($e) => [
            'id'               => (string) $e->id,
            'workout_id'       => (string) $e->workout_id,
            'workout_title'    => $e->workout ? $e->workout->title : 'Unknown Workout',
            'completed_at'     => $e->completed_at->toIso8601String(),
            'duration_seconds' => $e->duration_seconds,
            'calories_burned'  => $e->calories_burned,
            'heart_rate'       => $e->heart_rate,
        ]);

        return response()->json([
            'period'                 => $period,
            'total_workouts'         => $totalWorkouts,
            'total_duration_seconds' => $totalDurationSeconds,
            'total_calories'         => $totalCalories,
            'weekly_goal'            => $weeklyGoal,
            'goal_progress_percentage' => $goalPercentage,
            'average_heart_rate'     => $averageHeartRate,
            'chart_data'             => $chartData,
            'history'                => $history,
        ]);
    }

    /**
     * Build daily chart data for the last 7 days.
     */
    private function buildChartData(int $userId, string $period): array
    {
        $days = match ($period) {
            'month' => 30,
            'year'  => 365,
            '30'    => 30,
            '90'    => 90,
            default => 7,
        };

        // Limit chart to 7-day granularity for display (as per mobile contract example)
        $chartDays = min($days, 7);
        $result    = [];

        for ($i = $chartDays - 1; $i >= 0; $i--) {
            $date    = Carbon::now()->subDays($i)->toDateString();
            $dayName = Carbon::parse($date)->format('D');

            $dayEntries = ProgressEntry::where('user_id', $userId)
                ->whereDate('completed_at', $date)
                ->get();

            $result[] = [
                'label'            => $dayName,
                'calories'         => $dayEntries->sum('calories_burned'),
                'duration_minutes' => (int) round($dayEntries->sum('duration_seconds') / 60),
                'date'             => $date,
            ];
        }

        return $result;
    }

    private function progressResponse(ProgressEntry $e): array
    {
        $workoutTitle = $e->workout ? $e->workout->title
            : (Workout::find($e->workout_id)?->title ?? 'Unknown Workout');

        return [
            'id'               => (string) $e->id,
            'workout_id'       => (string) $e->workout_id,
            'workout_title'    => $workoutTitle,
            'completed_at'     => $e->completed_at->toIso8601String(),
            'duration_seconds' => $e->duration_seconds,
            'calories_burned'  => $e->calories_burned,
            'heart_rate'       => $e->heart_rate,
            'idempotency_key'  => $e->idempotency_key,
        ];
    }
}
