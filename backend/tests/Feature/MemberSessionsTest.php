<?php

namespace Tests\Feature;

use App\Models\GymSession;
use App\Models\SessionBooking;
use App\Models\Trainer;
use App\Models\User;
use App\Models\Workout;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberSessionsTest extends TestCase
{
    use RefreshDatabase;

    private function memberToken(): array
    {
        $user  = User::factory()->create(['role' => 'member']);
        $token = $user->createToken('test')->plainTextToken;
        return [$user, $token];
    }

    private function makeSession(string $status = 'scheduled'): GymSession
    {
        $workout = Workout::create([
            'title' => 'S Workout', 'category' => 'chest',
            'difficulty' => 'beginner', 'source' => 'trainer',
            'duration_minutes' => 30, 'calories' => 200,
            'sets' => 3, 'reps' => 10,
        ]);
        $trainer = Trainer::create(['name' => 'Coach A']);
        return GymSession::create([
            'workout_id' => $workout->id,
            'trainer_id' => $trainer->id,
            'title'      => 'Session A',
            'location'   => 'Main Floor',
            'starts_at'  => Carbon::now()->addDay(),
            'ends_at'    => Carbon::now()->addDay()->addHour(),
            'status'     => $status,
        ]);
    }

    public function test_get_sessions_returns_data_array(): void
    {
        [$user, $token] = $this->memberToken();
        $session = $this->makeSession();
        SessionBooking::create([
            'user_id' => $user->id, 'gym_session_id' => $session->id,
            'status' => 'booked', 'checked_in' => false,
        ]);

        $this->withToken($token)
            ->getJson('/api/v1/member/sessions')
            ->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'title', 'trainer', 'location', 'starts_at', 'ends_at', 'status', 'can_cancel', 'checked_in']]]);
    }

    public function test_cancel_session_returns_200(): void
    {
        [$user, $token] = $this->memberToken();
        $session = $this->makeSession();
        SessionBooking::create([
            'user_id' => $user->id, 'gym_session_id' => $session->id,
            'status' => 'booked', 'checked_in' => false,
        ]);

        $this->withToken($token)
            ->postJson("/api/v1/member/sessions/{$session->id}/cancel")
            ->assertStatus(200)
            ->assertJsonPath('status', 'cancelled')
            ->assertJsonPath('can_cancel', false);
    }

    public function test_cancel_gym_cancelled_session_returns_409(): void
    {
        [$user, $token] = $this->memberToken();
        $session = $this->makeSession('cancelled_by_gym');
        SessionBooking::create([
            'user_id' => $user->id, 'gym_session_id' => $session->id,
            'status' => 'cancelled_by_gym', 'checked_in' => false,
        ]);

        $this->withToken($token)
            ->postJson("/api/v1/member/sessions/{$session->id}/cancel")
            ->assertStatus(409)
            ->assertJsonPath('reason', 'session_cancelled')
            ->assertJsonPath('code', 'SESSION_CANCELLED_BY_GYM');
    }

    public function test_cancel_nonexistent_session_returns_404(): void
    {
        [$user, $token] = $this->memberToken();

        $this->withToken($token)
            ->postJson('/api/v1/member/sessions/99999/cancel')
            ->assertStatus(404);
    }
}
