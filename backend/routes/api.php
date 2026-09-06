<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Member\AttendanceController;
use App\Http\Controllers\Member\PreferencesController;
use App\Http\Controllers\Member\ProfileController;
use App\Http\Controllers\Member\ProgressController;
use App\Http\Controllers\Member\SessionsController;
use App\Http\Controllers\Member\WorkoutsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — GymFlow v1
|--------------------------------------------------------------------------
| /api/v1/auth/*    — Public + authenticated auth endpoints
| /api/v1/admin/*   — Admin role only (stub — routing boundary exists)
| /api/v1/staff/*   — Staff role only (stub — routing boundary exists)
| /api/v1/member/*  — Member role only
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // ── Auth endpoints ───────────────────────────────────────────────────
    Route::prefix('auth')->group(function () {

        // Public
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);

        // Authenticated
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::post('/change-password', [AuthController::class, 'changePassword']);
        });
    });

    // ── Admin routes (boundary stub — rejects non-admin via role middleware) ──
    Route::prefix('admin')
        ->middleware(['auth:sanctum', 'role:admin'])
        ->group(function () {
            // v1.1: branch, plan, staff management
            Route::get('/', fn () => response()->json(['message' => 'Admin API v1']));
        });

    // ── Staff routes (boundary stub) ────────────────────────────────────
    Route::prefix('staff')
        ->middleware(['auth:sanctum', 'role:staff'])
        ->group(function () {
            // v1.1: member CRUD, attendance logging
            Route::get('/', fn () => response()->json(['message' => 'Staff API v1']));
        });

    // ── Member routes ────────────────────────────────────────────────────
    Route::prefix('member')
        ->middleware(['auth:sanctum', 'role:member'])
        ->group(function () {

            // Profile
            Route::get('/profile', [ProfileController::class, 'show']);
            Route::patch('/profile', [ProfileController::class, 'update']);

            // Preferences
            Route::get('/preferences', [PreferencesController::class, 'show']);
            Route::patch('/preferences', [PreferencesController::class, 'update']);

            // Workouts catalog
            Route::get('/workouts', [WorkoutsController::class, 'index']);
            Route::get('/workouts/{id}', [WorkoutsController::class, 'show']);

            // Attendance (offline sync queue)
            Route::post('/attendance', [AttendanceController::class, 'store']);

            // Progress (offline sync queue)
            Route::post('/progress', [ProgressController::class, 'store']);
            Route::get('/progress', [ProgressController::class, 'index']);

            // Sessions
            Route::get('/sessions', [SessionsController::class, 'index']);
            Route::post('/sessions/{id}/cancel', [SessionsController::class, 'cancel']);
        });
});
