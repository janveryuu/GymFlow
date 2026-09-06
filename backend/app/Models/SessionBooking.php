<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SessionBooking extends Model
{
    protected $fillable = [
        'user_id',
        'gym_session_id',
        'status',
        'cancel_reason',
        'checked_in',
    ];

    protected function casts(): array
    {
        return [
            'checked_in' => 'boolean',
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
