<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProgressEntry extends Model
{
    protected $fillable = [
        'user_id',
        'workout_id',
        'started_at',
        'completed_at',
        'duration_seconds',
        'calories_burned',
        'heart_rate',
        'idempotency_key',
    ];

    protected function casts(): array
    {
        return [
            'started_at'   => 'datetime',
            'completed_at' => 'datetime',
            'heart_rate'   => 'integer',
        ];
    }

    public function workout()
    {
        return $this->belongsTo(Workout::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
