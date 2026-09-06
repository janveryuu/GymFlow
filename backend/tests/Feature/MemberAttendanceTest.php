<?php

namespace Tests\Feature;

use App\Models\GymSession;
use App\Models\Trainer;
use App\Models\User;
use App\Models\Workout;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberAttendanceTest extends TestCase
{
    use RefreshDatabase;

    private function memberToken(): array
    {
        $user  = User::factory()->create(['role' => 'member']);
        $token = $user->createToken('test')->plainTextToken;
        return [$user, $token];
    }

    private function scheduledSession(): GymSession
    {
        $workout = Workout::create([
            'title' => 'Test', 'category' => 'chest',
            'difficulty' => 'beginner', 'source' => 'trainer',
            'duration_minutes' => 30, 'calories' => 200,
            'sets' => 3, 'reps' => 10,
        ]);
        $trainer = Trainer::create(['name' => 'T1']);
        return GymSession::create([
            'workout_id' => $workout->id,
            'trainer_id' => $trainer->id,
            'title'      => 'Test Session',
            'location'   => 'Main Floor',
            'starts_at'  => Carbon::now()->addDay(),
            'ends_at'    => Carbon::now()->addDay()->addHour(),
            'status'     => 'scheduled',
        ]);
    }

    private function cancelledSession(): GymSession
    {
        $workout = Workout::create([
            'title' => 'Cancelled', 'category' => 'chest',
            'difficulty' => 'beginner', 'source' => 'trainer',
            'duration_minutes' => 30, 'calories' => 200,
            'sets' => 3, 'reps' => 10,
        ]);
        $trainer = Trainer::create(['name' => 'T2']);
        return GymSession::create([
            'workout_id' => $workout->id,
            'trainer_id' => $trainer->id,
            'title'      => 'Cancelled Session',
            'location'   => 'Room B',
            'starts_at'  => Carbon::now()->addDays(2),
            'ends_at'    => Carbon::now()->addDays(2)->addHour(),
            'status'     => 'cancelled_by_gym',
        ]);
    }

    public function test_attendance_creates_record_returns_201(): void
    {
        [$user, $token] = $this->memberToken();
        $session = $this->scheduledSession();

        $this->withToken($token)
            ->postJson('/api/v1/member/attendance', [
                'session_id'      => $session->id,
                'checked_in_at'   => now()->toIso8601String(),
                'idempotency_key' => 'att-test-001',
            ])
            ->assertStatus(201)
            ->assertJsonStructure(['id', 'session_id', 'status', 'checked_in_at'])
            ->assertJsonPath('status', 'confirmed');
    }

    public function test_attendance_idempotent_retry_returns_200(): void
    {
        [$user, $token] = $this->memberToken();
        $session = $this->scheduledSession();

        $payload = [
            'session_id'      => $session->id,
            'checked_in_at'   => now()->toIso8601String(),
            'idempotency_key' => 'att-retry-002',
        ];

        $first  = $this->withToken($token)->postJson('/api/v1/member/attendance', $payload)->assertStatus(201)->json();
        $second = $this->withToken($token)->postJson('/api/v1/member/attendance', $payload)->assertStatus(200)->json();

        $this->assertEquals($first['id'], $second['id']);
        $this->assertDatabaseCount('attendances', 1);
    }

    public function test_attendance_session_cancelled_by_gym_returns_409(): void
    {
        [$user, $token] = $this->memberToken();
        $session = $this->cancelledSession();

        $this->withToken($token)
            ->postJson('/api/v1/member/attendance', [
                'session_id'      => $session->id,
                'checked_in_at'   => now()->toIso8601String(),
                'idempotency_key' => 'att-conflict-003',
            ])
            ->assertStatus(409)
            ->assertJsonPath('reason', 'session_cancelled')
            ->assertJsonPath('code', 'SESSION_CANCELLED_BY_GYM');
    }
}
