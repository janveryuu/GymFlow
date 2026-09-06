# API & Integrations Contract

## 1. Domain Modeling & SQLite Schema
The application's local SQLite store has been extended with the following entities:

### `WaterIntakeEntry`
- `id`: TEXT PRIMARY KEY NOT NULL
- `amount_ml`: INTEGER NOT NULL
- `logged_at`: TEXT NOT NULL
- `date_key`: TEXT NOT NULL

### `NutritionEntry`
- `id`: TEXT PRIMARY KEY NOT NULL
- `food_name`: TEXT NOT NULL
- `calories`: INTEGER NOT NULL
- `protein_g`: REAL NOT NULL
- `carbs_g`: REAL NOT NULL
- `fat_g`: REAL NOT NULL
- `serving_size`: TEXT
- `meal_type`: TEXT NOT NULL
- `source`: TEXT NOT NULL (barcode | manual | ai_scan)
- `logged_at`: TEXT NOT NULL
- `date_key`: TEXT NOT NULL
- `barcode`: TEXT

### `ChatMessage`
- `id`: TEXT PRIMARY KEY NOT NULL
- `role`: TEXT NOT NULL (user | assistant)
- `content`: TEXT NOT NULL
- `timestamp`: TEXT NOT NULL
- `session_id`: TEXT NOT NULL

### `Preferences` (Extended)
- `weight_kg`: REAL
- `daily_nutrition_target_calories`: INTEGER
*Note: These fields should be added to the `PATCH /member/profile` endpoint when syncing to the backend.*

## 2. Water Formula Documentation
The daily target for water intake is calculated as follows:
`daily_target_ml = weight_kg * 35`
If the user's intensity is set to `HIGH`, an additional `500ml` is added.
Water intake is a candidate for future server-side synchronization.

## 3. Open Food Facts Endpoint
**Endpoint:** `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
**Method:** GET
**Shape:**
```json
{
  "product": {
    "product_name": "Product Name",
    "image_url": "https://...",
    "nutriments": {
      "energy-kcal_100g": 250,
      "proteins_100g": 10,
      "carbohydrates_100g": 20,
      "fat_100g": 5
    },
    "serving_size": "100g"
  },
  "status": 1
}
```

## 4. Pending Real AI Integration

### AI Food Scanner
- **Requirement:** Needs GPT-4 Vision API or LogMeal API.
- **Request Contract:**
  - `image_base64`: string
- **Response Contract:**
  - `food_name`: string
  - `calories`: number
  - `protein_g`: number
  - `carbs_g`: number
  - `fat_g`: number
  - `serving_size`: string

### AI Coach Chatbot
- **Requirement:** Needs LLM endpoint (e.g., OpenAI gpt-4o).
- **Request Contract:**
  - `messages`: Array of `{ role: string, content: string }`
  - `user_context`: `{ weight_kg, weekly_workout_goal, intensity }`
- **Response Contract:**
  - `content`: string (AI's reply)
