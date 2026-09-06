<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('session_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('gym_session_id')->constrained()->cascadeOnDelete();
            // status: booked | cancelled | cancelled_by_gym
            $table->string('status')->default('booked');
            $table->string('cancel_reason')->nullable();
            $table->boolean('checked_in')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_bookings');
    }
};
