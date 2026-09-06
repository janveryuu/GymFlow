<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MemberPreference extends Model
{
    protected $fillable = [
        'user_id',
        'workout_type',
        'intensity',
        'weekly_workout_goal',
    ];

    protected function casts(): array
    {
        return [
            'weekly_workout_goal' => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
