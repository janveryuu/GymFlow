<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workouts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('category'); // chest, back, leg, arm, full-body, hiit, strength
            $table->string('difficulty'); // beginner, intermediate, advanced
            $table->string('source')->default('trainer'); // trainer | community
            $table->unsignedSmallInteger('duration_minutes')->default(30);
            $table->unsignedSmallInteger('calories')->default(200);
            $table->unsignedTinyInteger('sets')->default(3);
            $table->unsignedTinyInteger('reps')->default(10);
            $table->string('reps_sets')->nullable();
            $table->string('image_url')->nullable();
            $table->string('exercise_slug')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workouts');
    }
};
