<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workout;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberProgressTest extends TestCase
{
    use RefreshDatabase;

    private function memberToken(): array
    {
        $user  = User::factory()->create(['role' => 'member']);
        $token = $user->createToken('test')->plainTextToken;
        return [$user, $token];
    }

    private function workout(): Workout
    {
        return Workout::create([
            'title'            => 'Test Workout',
            'category'         => 'chest',
            'difficulty'       => 'beginner',
            'source'           => 'trainer',
            'duration_minutes' => 30,
            'calories'         => 200,
            'sets'             => 3,
            'reps'             => 10,
        ]);
    }

    public function test_post_progress_creates_entry_returns_201(): void
    {
        [$user, $token] = $this->memberToken();
        $workout = $this->workout();

        $this->withToken($token)
            ->postJson('/api/v1/member/progress', [
                'workout_id'       => $workout->id,
                'completed_at'     => now()->toIso8601String(),
                'duration_seconds' => 1800,
                'calories_burned'  => 300,
                'idempotency_key'  => 'unique-key-001',
            ])
            ->assertStatus(201)
            ->assertJsonStructure([
                'id', 'workout_id', 'workout_title',
                'completed_at', 'duration_seconds', 'calories_burned',
                'heart_rate', 'idempotency_key',
            ]);
    }

    public function test_idempotent_progress_retry_returns_200_no_duplicate(): void
    {
        [$user, $token] = $this->memberToken();
        $workout = $this->workout();

        $payload = [
            'workout_id'       => $workout->id,
            'completed_at'     => now()->toIso8601String(),
            'duration_seconds' => 1800,
            'calories_burned'  => 300,
            'idempotency_key'  => 'retry-key-abc-123',
        ];

        // First call → 201
        $first = $this->withToken($token)
            ->postJson('/api/v1/member/progress', $payload)
            ->assertStatus(201)
            ->json();

        // Second call (retry) → 200, same response body
        $second = $this->withToken($token)
            ->postJson('/api/v1/member/progress', $payload)
            ->assertStatus(200)
            ->json();

        $this->assertEquals($first['id'], $second['id']);
        $this->assertEquals($first['idempotency_key'], $second['idempotency_key']);

        // Only one row in DB
        $this->assertDatabaseCount('progress_entries', 1);
    }

    public function test_get_progress_returns_aggregated_shape(): void
    {
        [$user, $token] = $this->memberToken();

        $this->withToken($token)
            ->getJson('/api/v1/member/progress?period=week')
            ->assertStatus(200)
            ->assertJsonStructure([
                'period', 'total_workouts', 'total_duration_seconds',
                'total_calories', 'weekly_goal', 'goal_progress_percentage',
                'average_heart_rate', 'chart_data', 'history',
            ]);
    }
}
