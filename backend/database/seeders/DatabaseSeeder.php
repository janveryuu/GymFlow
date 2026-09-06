<?php

namespace Database\Seeders;

use App\Models\GymSession;
use App\Models\Membership;
use App\Models\MemberPreference;
use App\Models\ProgressEntry;
use App\Models\SessionBooking;
use App\Models\Trainer;
use App\Models\User;
use App\Models\Workout;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Trainers ────────────────────────────────────────────────────
        $trainer1 = Trainer::create([
            'name'           => 'Marco D.',
            'email'          => 'marco@gymflow.test',
            'specialization' => 'Strength & Conditioning',
        ]);

        $trainer2 = Trainer::create([
            'name'           => 'Sarah L.',
            'email'          => 'sarah@gymflow.test',
            'specialization' => 'HIIT & Cardio',
        ]);

        // ── Workouts catalog ────────────────────────────────────────────
        $workouts = [
            [
                'title'            => 'Bench Press Power',
                'category'         => 'chest',
                'difficulty'       => 'intermediate',
                'source'           => 'trainer',
                'duration_minutes' => 45,
                'calories'         => 320,
                'sets'             => 4,
                'reps'             => 10,
                'reps_sets'        => '4 sets x 10 reps',
                'image_url'        => 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=70',
                'exercise_slug'    => 'bench-press',
                'description'      => 'Barbell bench progression with incline accessory work.',
            ],
            [
                'title'            => 'Pull Day Strength',
                'category'         => 'back',
                'difficulty'       => 'intermediate',
                'source'           => 'trainer',
                'duration_minutes' => 50,
                'calories'         => 380,
                'sets'             => 4,
                'reps'             => 8,
                'reps_sets'        => '4 sets x 8 reps',
                'image_url'        => 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=800&q=70',
                'exercise_slug'    => 'pull-up',
                'description'      => 'Deadlift, rows, and lat pulldown superset.',
            ],
            [
                'title'            => 'Leg Day Crusher',
                'category'         => 'leg',
                'difficulty'       => 'advanced',
                'source'           => 'trainer',
                'duration_minutes' => 60,
                'calories'         => 520,
                'sets'             => 5,
                'reps'             => 8,
                'reps_sets'        => '5 sets x 8 reps',
                'image_url'        => 'https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?w=800&q=70',
                'exercise_slug'    => 'squat',
                'description'      => 'Squat, leg press, lunges, and hamstring curls.',
            ],
            [
                'title'            => 'Arms Blast',
                'category'         => 'arm',
                'difficulty'       => 'beginner',
                'source'           => 'trainer',
                'duration_minutes' => 35,
                'calories'         => 220,
                'sets'             => 3,
                'reps'             => 12,
                'reps_sets'        => '3 sets x 12 reps',
                'image_url'        => 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=70',
                'exercise_slug'    => 'bicep-curl',
                'description'      => 'Bicep curls, tricep dips, and hammer curls.',
            ],
            [
                'title'            => 'Full Body Burn',
                'category'         => 'full-body',
                'difficulty'       => 'intermediate',
                'source'           => 'trainer',
                'duration_minutes' => 55,
                'calories'         => 450,
                'sets'             => 4,
                'reps'             => 10,
                'reps_sets'        => '4 sets x 10 reps',
                'image_url'        => 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=70',
                'exercise_slug'    => 'burpee',
                'description'      => 'Compound movements targeting all major muscle groups.',
            ],
            [
                'title'            => 'HIIT Inferno',
                'category'         => 'hiit',
                'difficulty'       => 'advanced',
                'source'           => 'trainer',
                'duration_minutes' => 30,
                'calories'         => 480,
                'sets'             => 6,
                'reps'             => 20,
                'reps_sets'        => '6 rounds x 20 reps',
                'image_url'        => 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=800&q=70',
                'exercise_slug'    => 'box-jump',
                'description'      => 'High-intensity interval training for maximum calorie burn.',
            ],
            [
                'title'            => 'Strength Foundation',
                'category'         => 'strength',
                'difficulty'       => 'beginner',
                'source'           => 'trainer',
                'duration_minutes' => 40,
                'calories'         => 280,
                'sets'             => 3,
                'reps'             => 8,
                'reps_sets'        => '3 sets x 8 reps',
                'image_url'        => 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=70',
                'exercise_slug'    => 'deadlift',
                'description'      => 'Foundational compound lifts for beginners.',
            ],
            [
                'title'            => 'Core & Stability',
                'category'         => 'full-body',
                'difficulty'       => 'beginner',
                'source'           => 'trainer',
                'duration_minutes' => 25,
                'calories'         => 150,
                'sets'             => 3,
                'reps'             => 15,
                'reps_sets'        => '3 sets x 15 reps',
                'image_url'        => 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=70',
                'exercise_slug'    => 'plank',
                'description'      => 'Plank variations, dead bugs, and pallof press.',
            ],
        ];

        $createdWorkouts = collect($workouts)->map(
            fn ($w) => Workout::create($w)
        );

        // ── Member: Jane Doe — active member, no forced reset ───────────
        $jane = User::create([
            'name'                 => 'Jane Doe',
            'email'                => 'jane.doe@gymflow.test',
            'password'             => Hash::make('Password123!'),
            'role'                 => 'member',
            'phone'                => '+1 (555) 234-5678',
            'must_change_password' => false,
        ]);

        Membership::create([
            'user_id'     => $jane->id,
            'external_id' => 'mem_tier_elite_01',
            'tier'        => 'Black Diamond All-Access',
            'status'      => 'active',
            'expires_at'  => Carbon::now()->addYear(),
        ]);

        MemberPreference::create([
            'user_id'             => $jane->id,
            'workout_type'        => 'full-body',
            'intensity'           => 'moderate',
            'weekly_workout_goal' => 5,
        ]);

        // ── Member: Alex Smith — MUST CHANGE PASSWORD on first login ────
        $alex = User::create([
            'name'                 => 'Alex Smith',
            'email'                => 'alex.smith@gymflow.test',
            'password'             => Hash::make('TempPass!23'),
            'role'                 => 'member',
            'phone'                => '+1 (555) 987-6543',
            'must_change_password' => true,
        ]);

        Membership::create([
            'user_id'     => $alex->id,
            'external_id' => 'mem_basic_01',
            'tier'        => 'Basic Plan',
            'status'      => 'active',
            'expires_at'  => Carbon::now()->addMonths(3),
        ]);

        MemberPreference::create([
            'user_id'             => $alex->id,
            'workout_type'        => 'strength',
            'intensity'           => 'light',
            'weekly_workout_goal' => 3,
        ]);

        // ── Member: Morgan Lee — INACTIVE membership ─────────────────────
        $morgan = User::create([
            'name'                 => 'Morgan Lee',
            'email'                => 'morgan.lee@gymflow.test',
            'password'             => Hash::make('Password123!'),
            'role'                 => 'member',
            'phone'                => '+1 (555) 456-7890',
            'must_change_password' => false,
        ]);

        Membership::create([
            'user_id'     => $morgan->id,
            'external_id' => 'mem_expired_01',
            'tier'        => 'Standard Plan',
            'status'      => 'inactive',
            'expires_at'  => Carbon::now()->subMonths(2),
        ]);

        MemberPreference::create([
            'user_id'             => $morgan->id,
            'workout_type'        => 'hiit',
            'intensity'           => 'intense',
            'weekly_workout_goal' => 4,
        ]);

        // ── Admin user ───────────────────────────────────────────────────
        User::create([
            'name'                 => 'GymFlow Admin',
            'email'                => 'admin@gymflow.test',
            'password'             => Hash::make('AdminPass!99'),
            'role'                 => 'admin',
            'must_change_password' => false,
        ]);

        // ── Staff user ───────────────────────────────────────────────────
        User::create([
            'name'                 => 'Staff Member',
            'email'                => 'staff@gymflow.test',
            'password'             => Hash::make('StaffPass!77'),
            'role'                 => 'staff',
            'must_change_password' => false,
        ]);

        // ── Gym Sessions ─────────────────────────────────────────────────
        $benchPressWorkout = $createdWorkouts->first();
        $hiitWorkout       = $createdWorkouts->firstWhere('category', 'hiit');

        $session1 = GymSession::create([
            'workout_id' => $benchPressWorkout->id,
            'trainer_id' => $trainer1->id,
            'title'      => 'Bench Press Power',
            'location'   => 'Main Floor',
            'starts_at'  => Carbon::now()->addDays(1)->setTime(6, 30),
            'ends_at'    => Carbon::now()->addDays(1)->setTime(7, 15),
            'status'     => 'scheduled',
        ]);

        $session2 = GymSession::create([
            'workout_id' => $hiitWorkout->id,
            'trainer_id' => $trainer2->id,
            'title'      => 'HIIT Inferno',
            'location'   => 'Cardio Studio',
            'starts_at'  => Carbon::now()->addDays(2)->setTime(7, 0),
            'ends_at'    => Carbon::now()->addDays(2)->setTime(7, 30),
            'status'     => 'scheduled',
        ]);

        // Session that is CANCELLED BY GYM — for 409 conflict testing
        $cancelledSession = GymSession::create([
            'workout_id' => $benchPressWorkout->id,
            'trainer_id' => $trainer1->id,
            'title'      => 'Cancelled Class',
            'location'   => 'Room B',
            'starts_at'  => Carbon::now()->addDays(3)->setTime(9, 0),
            'ends_at'    => Carbon::now()->addDays(3)->setTime(10, 0),
            'status'     => 'cancelled_by_gym',
        ]);

        // ── Session Bookings for Jane ─────────────────────────────────────
        SessionBooking::create([
            'user_id'        => $jane->id,
            'gym_session_id' => $session1->id,
            'status'         => 'booked',
            'checked_in'     => false,
        ]);

        SessionBooking::create([
            'user_id'        => $jane->id,
            'gym_session_id' => $session2->id,
            'status'         => 'booked',
            'checked_in'     => false,
        ]);

        // Booking for cancelled session (for 409 testing)
        SessionBooking::create([
            'user_id'        => $jane->id,
            'gym_session_id' => $cancelledSession->id,
            'status'         => 'cancelled_by_gym',
            'checked_in'     => false,
        ]);

        // ── Seed some progress entries for Jane ───────────────────────────
        $progressData = [
            [
                'workout_id'       => $benchPressWorkout->id,
                'started_at'       => Carbon::now()->subDays(6)->setTime(7, 30),
                'completed_at'     => Carbon::now()->subDays(6)->setTime(8, 20),
                'duration_seconds' => 3000,
                'calories_burned'  => 480,
                'heart_rate'       => null,
                'idempotency_key'  => 'seed-prog-jane-1',
            ],
            [
                'workout_id'       => $hiitWorkout->id,
                'started_at'       => Carbon::now()->subDays(4)->setTime(6, 0),
                'completed_at'     => Carbon::now()->subDays(4)->setTime(6, 35),
                'duration_seconds' => 2100,
                'calories_burned'  => 380,
                'heart_rate'       => null,
                'idempotency_key'  => 'seed-prog-jane-2',
            ],
            [
                'workout_id'       => $benchPressWorkout->id,
                'started_at'       => Carbon::now()->subDays(2)->setTime(8, 0),
                'completed_at'     => Carbon::now()->subDays(2)->setTime(8, 50),
                'duration_seconds' => 3000,
                'calories_burned'  => 480,
                'heart_rate'       => null,
                'idempotency_key'  => 'seed-prog-jane-3',
            ],
            [
                'workout_id'       => $hiitWorkout->id,
                'started_at'       => Carbon::now()->subDays(1)->setTime(7, 0),
                'completed_at'     => Carbon::now()->subDays(1)->setTime(7, 30),
                'duration_seconds' => 1800,
                'calories_burned'  => 400,
                'heart_rate'       => null,
                'idempotency_key'  => 'seed-prog-jane-4',
            ],
        ];

        foreach ($progressData as $pd) {
            ProgressEntry::create(array_merge($pd, ['user_id' => $jane->id]));
        }
    }
}
