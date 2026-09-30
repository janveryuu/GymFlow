<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    /**
     * POST /api/v1/chat
     * AI Coach chat endpoint powered by Groq LLM.
     */
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'messages' => ['required', 'array', 'min:1'],
            'messages.*.role' => ['required', 'string', 'in:user,assistant,system'],
            'messages.*.content' => ['required', 'string'],
            'user_context' => ['nullable', 'array'],
            // Body metrics
            'user_context.weight_kg' => ['nullable', 'numeric'],
            'user_context.height_cm' => ['nullable', 'numeric'],
            'user_context.gender' => ['nullable', 'string'],
            'user_context.age' => ['nullable', 'numeric'],
            'user_context.bmi' => ['nullable', 'numeric'],
            'user_context.fitness_goal' => ['nullable', 'string'],
            // Training
            'user_context.weekly_workout_goal' => ['nullable', 'numeric'],
            'user_context.intensity' => ['nullable', 'string'],
            // Nutrition
            'user_context.daily_calorie_target' => ['nullable', 'numeric'],
            'user_context.calories_consumed_today' => ['nullable', 'numeric'],
            'user_context.protein_g_today' => ['nullable', 'numeric'],
            'user_context.carbs_g_today' => ['nullable', 'numeric'],
            'user_context.fat_g_today' => ['nullable', 'numeric'],
            'user_context.meals_logged_today' => ['nullable', 'array'],
            // Hydration
            'user_context.water_intake_ml_today' => ['nullable', 'numeric'],
            'user_context.water_target_ml' => ['nullable', 'numeric'],
            // Workout history
            'user_context.recent_workouts' => ['nullable', 'array'],
            'user_context.workouts_this_week' => ['nullable', 'numeric'],
            'user_context.current_streak_days' => ['nullable', 'numeric'],
        ]);

        $apiKey = config('services.groq.api_key');
        if (empty($apiKey)) {
            return response()->json([
                'error' => 'AI Coach service is not configured. Missing GROQ_API_KEY.',
            ], 500);
        }

        // Extract the latest user query to search web if applicable
        $lastUserMessage = '';
        foreach (array_reverse($validated['messages']) as $msg) {
            if ($msg['role'] === 'user') {
                $lastUserMessage = $msg['content'];
                break;
            }
        }

        // Live web grounding for questions, people, facts, or news
        $snippets = !empty($lastUserMessage) ? $this->fetchWebSnippets($lastUserMessage) : [];

        // Build context-aware system prompt from the user's real-time health data
        $userContext = $validated['user_context'] ?? [];
        $systemInstruction = $this->buildSystemPrompt($userContext);

        // Append web search snippets for factual grounding when available
        if (!empty($snippets)) {
            $systemInstruction .= "\n\nReal-time web search results (use these to answer factual questions):\n" . implode("\n", $snippets);
        }

        // Enforce formatting rules
        $systemInstruction .= "\n\nFORMATTING RULE: Do NOT use asterisks (*) anywhere in your reply. Never use asterisks for bolding, emphasis, or bullet points. Do NOT use markdown header tags like ##, ###, or # anywhere in your reply. Never use ## for titles or section headings. Use clean bullets (•) or dashes (-) for lists, and write section headings as clean, plain text on their own line without hashes.";

        $formattedMessages = [
            [
                'role' => 'system',
                'content' => $systemInstruction,
            ],
        ];

        // Append last 15 messages from conversation history
        $clientMessages = array_slice($validated['messages'], -15);
        foreach ($clientMessages as $msg) {
            $formattedMessages[] = [
                'role' => $msg['role'],
                'content' => $msg['content'],
            ];
        }

        $primaryModel = config('services.groq.model', 'qwen/qwen3.8-27b');
        $fallbackModel = config('services.groq.fallback_model', 'openai/gpt-oss-120b');

        try {
            $reply = $this->callGroq($apiKey, $primaryModel, $formattedMessages);
        } catch (\Throwable $e) {
            Log::warning('[ChatController] Primary model failed (' . $primaryModel . '): ' . $e->getMessage() . '. Trying fallback...');
            try {
                $reply = $this->callGroq($apiKey, $fallbackModel, $formattedMessages);
            } catch (\Throwable $fallbackError) {
                Log::error('[ChatController] Groq fallback failed: ' . $fallbackError->getMessage());
                return response()->json([
                    'error' => 'The AI Coach is momentarily unavailable. Please try again shortly.',
                ], 502);
            }
        }

        // Clean any stray or formatting asterisks and markdown header hashes so output never contains * or ##
        $cleanReply = preg_replace('/\*\*(.*?)\*\*/', '$1', $reply);
        $cleanReply = preg_replace('/^\s*\*\s+/m', '• ', $cleanReply);
        $cleanReply = str_replace('*', '', $cleanReply);
        $cleanReply = preg_replace('/^\s*#{1,6}\s+/m', '', $cleanReply);
        $cleanReply = preg_replace('/#{2,}/', '', $cleanReply);

        return response()->json([
            'content' => trim($cleanReply),
        ]);
    }

    /**
     * Perform a lightweight web search to ground queries about real-world facts, people, or events.
     */
    private function fetchWebSnippets(string $query): array
    {
        $trimmed = trim(strtolower($query));
        $greetings = ['hi', 'hello', 'hey', 'sup', 'yo', 'thanks', 'thank you', 'bye', 'goodbye', 'ok', 'okay'];
        if (in_array($trimmed, $greetings, true) || strlen($trimmed) < 4) {
            return [];
        }

        try {
            $url = 'https://html.duckduckgo.com/html/?q=' . urlencode($query);
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language' => 'en-US,en;q=0.9',
            ])->timeout(4)->get($url);

            if (!$response->successful()) {
                return [];
            }

            $html = $response->body();
            if (empty($html)) {
                return [];
            }

            $dom = new \DOMDocument();
            @$dom->loadHTML($html);
            $xpath = new \DOMXPath($dom);

            $snippets = [];
            $nodes = $xpath->query('//div[contains(@class, "web-result")]');
            foreach ($nodes as $node) {
                $titles = $xpath->query('.//a[contains(@class, "result__a")]', $node);
                $bodies = $xpath->query('.//a[contains(@class, "result__snippet")]', $node);
                if ($titles->length > 0 && $bodies->length > 0) {
                    $title = trim($titles->item(0)->textContent);
                    $body = trim($bodies->item(0)->textContent);
                    if (!empty($title) && !empty($body)) {
                        $snippets[] = "- {$title}: {$body}";
                    }
                }
                if (count($snippets) >= 4) {
                    break;
                }
            }

            return $snippets;
        } catch (\Throwable $e) {
            Log::info('[ChatController] Web search skipped: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Call Groq OpenAI-compatible chat completions API.
     */
    private function callGroq(string $apiKey, string $model, array $messages): string
    {
        $response = Http::withToken($apiKey)
            ->timeout(20)
            ->post('https://api.groq.com/openai/v1/chat/completions', [
                'model' => $model,
                'messages' => $messages,
                'temperature' => 0.7,
                'max_tokens' => 800,
            ]);

        if (!$response->successful()) {
            throw new \Exception('Groq API returned HTTP ' . $response->status() . ': ' . $response->body());
        }

        $json = $response->json();
        $content = $json['choices'][0]['message']['content'] ?? null;

        if (!$content) {
            throw new \Exception('Invalid or empty response structure from Groq API');
        }

        return trim($content);
    }

    /**
     * Build a comprehensive, context-aware system prompt using the user's real-time
     * health, nutrition, hydration, and training data so the AI can give
     * hyper-personalized answers (meal plans, water advice, workout suggestions).
     */
    private function buildSystemPrompt(array $context): string
    {
        // ── Body metrics ────────────────────────────────────────────────────
        $weight      = isset($context['weight_kg'])  ? $context['weight_kg'] . ' kg'   : 'Not provided';
        $height      = isset($context['height_cm'])  ? $context['height_cm'] . ' cm'   : 'Not provided';
        $bmi         = isset($context['bmi'])         ? $context['bmi']                 : 'Not calculated';
        $gender      = $context['gender']             ?? 'Not specified';
        $age         = isset($context['age'])         ? $context['age'] . ' years old'  : 'Not specified';
        $fitnessGoal = $context['fitness_goal']       ?? 'Not specified';

        // ── Training ────────────────────────────────────────────────────────
        $weeklyGoal       = isset($context['weekly_workout_goal']) ? $context['weekly_workout_goal'] . ' sessions/week' : 'Not set';
        $intensity         = $context['intensity'] ?? 'moderate';
        $workoutsThisWeek  = $context['workouts_this_week'] ?? 0;
        $streak            = $context['current_streak_days'] ?? 0;

        // ── Nutrition ───────────────────────────────────────────────────────
        $calorieTarget  = isset($context['daily_calorie_target'])    ? $context['daily_calorie_target'] . ' kcal'                : 'Not calculated';
        $caloriesEaten  = isset($context['calories_consumed_today']) ? $context['calories_consumed_today'] . ' kcal'              : '0 kcal';
        $protein        = isset($context['protein_g_today'])         ? round($context['protein_g_today']) . 'g'                   : '0g';
        $carbs          = isset($context['carbs_g_today'])           ? round($context['carbs_g_today']) . 'g'                     : '0g';
        $fat            = isset($context['fat_g_today'])             ? round($context['fat_g_today']) . 'g'                       : '0g';
        $mealsLogged    = !empty($context['meals_logged_today'])     ? implode(', ', $context['meals_logged_today'])              : 'None yet';

        // Calculate remaining calories
        $caloriesRemaining = '';
        if (isset($context['daily_calorie_target'], $context['calories_consumed_today'])) {
            $remaining = $context['daily_calorie_target'] - $context['calories_consumed_today'];
            $caloriesRemaining = $remaining > 0
                ? "{$remaining} kcal remaining for today"
                : abs($remaining) . ' kcal OVER target today';
        }

        // ── Hydration ───────────────────────────────────────────────────────
        $waterIntake = isset($context['water_intake_ml_today']) ? $context['water_intake_ml_today'] . ' ml' : '0 ml';
        $waterTarget = isset($context['water_target_ml'])       ? $context['water_target_ml'] . ' ml'       : 'Not calculated';

        // ── Recent workouts ─────────────────────────────────────────────────
        $recentWorkoutText = 'None recorded recently';
        if (!empty($context['recent_workouts']) && is_array($context['recent_workouts'])) {
            $lines = [];
            foreach (array_slice($context['recent_workouts'], 0, 5) as $w) {
                $title = $w['title'] ?? 'Workout';
                $cal   = $w['calories_burned'] ?? 0;
                $date  = $w['date'] ?? '';
                $lines[] = "  - {$title} ({$cal} kcal, {$date})";
            }
            $recentWorkoutText = implode("\n", $lines);
        }

        return <<<PROMPT
You are Alab AI Coach, an elite, motivational, and science-grounded personal fitness trainer and sports nutrition coach.

CRITICAL: You have access to this user's REAL-TIME health and fitness data below. Use it to give hyper-personalized, accurate answers. When the user asks about calories, meals, water, or workouts — reference their ACTUAL numbers, don't guess.

═══ USER BODY PROFILE ═══
- Weight: {$weight}
- Height: {$height}
- BMI: {$bmi}
- Gender: {$gender}
- Age: {$age}
- Fitness Goal: {$fitnessGoal}

═══ TODAY'S NUTRITION ═══
- Daily Calorie Target (TDEE-adjusted): {$calorieTarget}
- Calories Consumed So Far: {$caloriesEaten}
- {$caloriesRemaining}
- Macros Today → Protein: {$protein} | Carbs: {$carbs} | Fat: {$fat}
- Meals Logged: {$mealsLogged}

═══ HYDRATION ═══
- Water Consumed Today: {$waterIntake}
- Daily Water Target: {$waterTarget}

═══ TRAINING ═══
- Weekly Workout Goal: {$weeklyGoal}
- Training Intensity: {$intensity}
- Workouts Completed This Week: {$workoutsThisWeek}
- Current Streak: {$streak} day(s)
- Recent Workouts:
{$recentWorkoutText}

═══ COACHING RULES ═══
1. ALWAYS use the user's actual data when answering nutrition or fitness questions. Example: if they ask for a meal plan, calculate meals that fit their REMAINING calories and macro gaps.
2. For meal plans, divide remaining calories across the requested number of meals and suggest specific foods with gram amounts.
3. For water advice, reference their current intake vs target.
4. For workout suggestions, account for recent workouts (avoid overtraining same muscle groups), their intensity preference, and weekly goal progress.
5. Keep answers structured and mobile-friendly: use short paragraphs, clean plain capitalized section titles without hashes, bullet points (•), and dashes (-). Never use asterisks (*) or markdown header hashes (##, ###, #).
6. Be encouraging, energetic, and professional.
7. If asked about injuries, severe pain, or medical conditions, provide safe general advice but explicitly urge consulting a medical professional.
PROMPT;
    }
}
