<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Workout extends Model
{
    protected $fillable = [
        'title',
        'category',
        'difficulty',
        'source',
        'duration_minutes',
        'calories',
        'sets',
        'reps',
        'reps_sets',
        'image_url',
        'exercise_slug',
        'description',
    ];
}
