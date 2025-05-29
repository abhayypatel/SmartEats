const OpenAI = require("openai");

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is required");
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeFoodImage(imageUrl, options = {}) {
    try {
      const {
        includePortionSizes = true,
        includeMicronutrients = false,
        userPreferences = {},
      } = options;

      const prompt = this.buildFoodAnalysisPrompt(
        includePortionSizes,
        includeMicronutrients,
        userPreferences,
      );

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.1, // Low temperature for consistent results
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Parse the JSON response
      const analysisResult = this.parseAnalysisResponse(content);

      return {
        success: true,
        data: {
          ...analysisResult,
          confidence: this.calculateOverallConfidence(analysisResult.foods),
          analysisId: response.id,
          model: response.model,
          usage: response.usage,
        },
      };
    } catch (error) {
      console.error("OpenAI Analysis Error:", error);

      if (error.type === "rate_limit_error") {
        throw new Error(
          "AI service rate limit exceeded. Please try again later.",
        );
      }

      if (error.type === "invalid_request_error") {
        throw new Error(
          "Invalid image or request. Please try a different image.",
        );
      }

      throw new Error("Failed to analyze image. Please try again.");
    }
  }

  /**
   * Build the prompt for food analysis
   */
  buildFoodAnalysisPrompt(
    includePortionSizes,
    includeMicronutrients,
    userPreferences,
  ) {
    let prompt = `Analyze this food image and provide detailed nutritional information. Return your response as a valid JSON object with the following structure:

{
  "foods": [
    {
      "name": "food name",
      "category": "food category (fruits, vegetables, grains, protein, dairy, etc.)",
      "confidence": 0.95,
      "estimatedWeight": 150,
      "unit": "g",
      "nutrition": {
        "calories": 250,
        "protein": 12.5,
        "carbs": 30.2,
        "fat": 8.1,
        "fiber": 3.2,
        "sugar": 5.1,
        "sodium": 450
      }`;

    if (includeMicronutrients) {
      prompt += `,
      "micronutrients": {
        "vitaminC": 15.2,
        "calcium": 120,
        "iron": 2.1,
        "potassium": 300
      }`;
    }

    if (includePortionSizes) {
      prompt += `,
      "portionDescription": "1 medium serving",
      "alternativePortions": [
        {"amount": 1, "unit": "cup", "description": "1 cup chopped"}
      ]`;
    }

    prompt += `
    }
  ],
  "totalNutrition": {
    "calories": 500,
    "protein": 25.0,
    "carbs": 60.4,
    "fat": 16.2,
    "fiber": 6.4,
    "sugar": 10.2,
    "sodium": 900
  },
  "mealType": "breakfast|lunch|dinner|snack",
  "notes": "Additional observations about the meal"
}

Guidelines:
- Identify all visible food items in the image
- Estimate portion sizes based on visual cues (plates, utensils, hands for scale)
- Provide nutritional values per 100g for each food item
- Calculate total nutrition for the entire meal
- Use confidence scores (0-1) based on how clearly you can identify each food
- If you can't identify a food clearly, use a lower confidence score
- For mixed dishes, try to break down into individual components
- Consider cooking methods (fried, grilled, steamed) as they affect nutrition
- Be conservative with estimates rather than overestimating`;

    if (userPreferences.dietaryRestrictions) {
      prompt += `\n- Note any dietary concerns: ${userPreferences.dietaryRestrictions.join(", ")}`;
    }

    prompt += "\n\nReturn only the JSON object, no additional text.";

    return prompt;
  }

  /**
   * Parse the AI response and validate the structure
   */
  parseAnalysisResponse(content) {
    try {
      // Clean the response - remove any markdown formatting
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent
          .replace(/```json\n?/, "")
          .replace(/\n?```$/, "");
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent
          .replace(/```\n?/, "")
          .replace(/\n?```$/, "");
      }

      const parsed = JSON.parse(cleanContent);

      // Validate required fields
      if (!parsed.foods || !Array.isArray(parsed.foods)) {
        throw new Error("Invalid response format: foods array missing");
      }

      if (!parsed.totalNutrition) {
        throw new Error("Invalid response format: totalNutrition missing");
      }

      // Validate each food item
      parsed.foods.forEach((food, index) => {
        if (!food.name || !food.nutrition) {
          throw new Error(`Invalid food item at index ${index}`);
        }

        // Ensure confidence is between 0 and 1
        if (food.confidence > 1) {
          food.confidence = food.confidence / 100;
        }

        // Ensure all nutrition values are numbers
        Object.keys(food.nutrition).forEach((key) => {
          if (typeof food.nutrition[key] !== "number") {
            food.nutrition[key] = parseFloat(food.nutrition[key]) || 0;
          }
        });
      });

      return parsed;
    } catch (error) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI analysis response");
    }
  }

  /**
   * Calculate overall confidence score for the analysis
   */
  calculateOverallConfidence(foods) {
    if (!foods || foods.length === 0) return 0;

    const totalConfidence = foods.reduce(
      (sum, food) => sum + (food.confidence || 0),
      0,
    );
    return Math.round((totalConfidence / foods.length) * 100) / 100;
  }

  /**
   * Generate meal suggestions based on user preferences and goals
   */
  async generateMealSuggestions(userGoals, preferences = {}) {
    try {
      const prompt = `Generate 3 healthy meal suggestions based on these requirements:

Daily Calorie Goal: ${userGoals.dailyCalories}
Protein Goal: ${userGoals.macros.protein}%
Carbs Goal: ${userGoals.macros.carbs}%
Fat Goal: ${userGoals.macros.fat}%
Weight Goal: ${userGoals.weightGoal}

${preferences.dietaryRestrictions ? `Dietary Restrictions: ${preferences.dietaryRestrictions.join(", ")}` : ""}
${preferences.cuisinePreferences ? `Preferred Cuisines: ${preferences.cuisinePreferences.join(", ")}` : ""}

Return a JSON array of meal suggestions with this format:
[
  {
    "name": "Meal name",
    "description": "Brief description",
    "mealType": "breakfast|lunch|dinner|snack",
    "estimatedCalories": 400,
    "estimatedProtein": 25,
    "estimatedCarbs": 45,
    "estimatedFat": 15,
    "ingredients": ["ingredient1", "ingredient2"],
    "cookingTime": 20,
    "difficulty": "easy|medium|hard"
  }
]`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      return JSON.parse(content);
    } catch (error) {
      console.error("Meal suggestion error:", error);
      throw new Error("Failed to generate meal suggestions");
    }
  }

  /**
   * Analyze nutrition trends and provide insights
   */
  async analyzeNutritionTrends(nutritionData, userGoals) {
    try {
      const prompt = `Analyze this nutrition data and provide insights:

User Goals:
- Daily Calories: ${userGoals.dailyCalories}
- Protein: ${userGoals.macros.protein}%
- Carbs: ${userGoals.macros.carbs}%
- Fat: ${userGoals.macros.fat}%

Recent Nutrition Data:
${JSON.stringify(nutritionData, null, 2)}

Provide insights in this JSON format:
{
  "insights": [
    {
      "type": "positive|warning|suggestion",
      "title": "Insight title",
      "message": "Detailed message",
      "priority": "high|medium|low"
    }
  ],
  "recommendations": [
    "Specific actionable recommendation"
  ],
  "overallScore": 85
}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      return JSON.parse(content);
    } catch (error) {
      console.error("Nutrition analysis error:", error);
      throw new Error("Failed to analyze nutrition trends");
    }
  }
}

module.exports = new OpenAIService();
