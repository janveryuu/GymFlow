<?php

namespace Tests\Feature;

use App\Models\Membership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberProfileTest extends TestCase
{
    use RefreshDatabase;

    private function memberWithToken(array $override = []): array
    {
        $user = User::factory()->create(array_merge([
            'role'                 => 'member',
            'must_change_password' => false,
        ], $override));

        Membership::create([
            'user_id' => $user->id,
            'tier'    => 'Test Plan',
            'status'  => 'active',
        ]);

        $token = $user->createToken('test')->plainTextToken;
        return [$user, $token];
    }

    public function test_get_profile_returns_correct_shape(): void
    {
        [$user, $token] = $this->memberWithToken();

        $this->withToken($token)
            ->getJson('/api/v1/member/profile')
            ->assertStatus(200)
            ->assertJsonStructure([
                'id', 'name', 'email', 'phone', 'photo_url',
                'must_change_password',
                'membership' => ['id', 'tier', 'status', 'expires_at'],
                'created_at', 'updated_at',
            ])
            ->assertJsonPath('must_change_password', false);
    }

    public function test_get_profile_must_change_password_true(): void
    {
        [$user, $token] = $this->memberWithToken(['must_change_password' => true]);

        $this->withToken($token)
            ->getJson('/api/v1/member/profile')
            ->assertStatus(200)
            ->assertJsonPath('must_change_password', true);
    }

    public function test_patch_profile_updates_and_returns_profile(): void
    {
        [$user, $token] = $this->memberWithToken();

        $this->withToken($token)
            ->patchJson('/api/v1/member/profile', [
                'phone' => '+1 (555) 999-0000',
            ])
            ->assertStatus(200)
            ->assertJsonPath('phone', '+1 (555) 999-0000')
            ->assertJsonStructure(['membership']);
    }

    public function test_unauthenticated_profile_returns_401(): void
    {
        $this->getJson('/api/v1/member/profile')->assertStatus(401);
    }

    public function test_admin_cannot_access_member_profile(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/member/profile')
            ->assertStatus(403);
    }
}
