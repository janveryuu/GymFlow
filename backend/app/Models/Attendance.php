<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $fillable = [
        'user_id',
        'gym_session_id',
        'status',
        'checked_in_at',
        'idempotency_key',
    ];

    protected function casts(): array
    {
        return [
            'checked_in_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function gymSession()
    {
        return $this->belongsTo(GymSession::class);
    }
}
