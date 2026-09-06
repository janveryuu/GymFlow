<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PreferencesController extends Controller
{
    /**
     * GET /api/v1/member/preferences
     */
    public function show(Request $request): JsonResponse
    {
        $prefs = $request->user()->preferences
            ?? $request->user()->preferences()->create([
                'workout_type'        => 'full-body',
                'intensity'           => 'moderate',
                'weekly_workout_goal' => 3,
            ]);

        return response()->json($this->prefsResponse($prefs));
    }

    /**
     * PATCH /api/v1/member/preferences
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'workout_type'        => ['sometimes', 'in:chest,back,leg,arm,full-body,hiit,strength'],
            'intensity'           => ['sometimes', 'in:light,moderate,intense'],
            'weekly_workout_goal' => ['sometimes', 'integer', 'between:1,7'],
        ]);

        $prefs = $request->user()->preferences
            ?? $request->user()->preferences()->create([
                'workout_type'        => 'full-body',
                'intensity'           => 'moderate',
                'weekly_workout_goal' => 3,
            ]);

        $prefs->update($request->only(['workout_type', 'intensity', 'weekly_workout_goal']));
        $prefs->refresh();

        return response()->json($this->prefsResponse($prefs));
    }

    private function prefsResponse($prefs): array
    {
        return [
            'workout_type'        => $prefs->workout_type,
            'intensity'           => $prefs->intensity,
            'weekly_workout_goal' => (int) $prefs->weekly_workout_goal,
            'updated_at'          => $prefs->updated_at->toIso8601String(),
        ];
    }
}
