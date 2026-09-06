<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\Workout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkoutsController extends Controller
{
    /**
     * GET /api/v1/member/workouts
     */
    public function index(Request $request): JsonResponse
    {
        $query = Workout::query();

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('difficulty')) {
            $query->where('difficulty', $request->difficulty);
        }

        if ($request->filled('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        $workouts = $query->get();

        return response()->json([
            'data' => $workouts->map(fn ($w) => $this->workoutItem($w)),
            'meta' => ['total' => $workouts->count()],
        ]);
    }

    /**
     * GET /api/v1/member/workouts/:id
     */
    public function show(int $id): JsonResponse
    {
        $workout = Workout::find($id);

        if (! $workout) {
            return response()->json(['message' => 'Workout not found'], 404);
        }

        return response()->json($this->workoutItem($workout));
    }

    private function workoutItem(Workout $w): array
    {
        return [
            'id'                   => (string) $w->id,
            'title'                => $w->title,
            'category'             => $w->category,
            'difficulty'           => $w->difficulty,
            'source'               => $w->source,
            'duration_minutes'     => $w->duration_minutes,
            'calories'             => $w->calories,
            'sets'                 => $w->sets,
            'reps'                 => $w->reps,
            'reps_sets'            => $w->reps_sets ?? "{$w->sets} sets x {$w->reps} reps",
            'image_url'            => $w->image_url,
            'exercise_slug'        => $w->exercise_slug,
            'description'          => $w->description,
            'completion_percentage' => 0, // client tracks this locally
        ];
    }
}
