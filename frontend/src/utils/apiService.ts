interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
}

class ApiService {
  private config: ApiConfig;

  constructor() {
    this.config = {
      baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
      timeout: 30000, // 30 seconds for cold starts
      retries: 3,
      retryDelay: 1000, // Start with 1 second
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    attempt = 1,
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const token = localStorage.getItem("smarteats_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${this.config.baseURL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          localStorage.removeItem("smarteats_token");
          window.location.href = "/login";
          throw new Error("Authentication expired");
        }

        if (response.status >= 500 && attempt <= this.config.retries) {
          // Server error - retry with exponential backoff
          const retryDelay = this.config.retryDelay * Math.pow(2, attempt - 1);
          console.log(
            `API call failed (attempt ${attempt}), retrying in ${retryDelay}ms...`,
          );
          await this.delay(retryDelay);
          return this.makeRequest<T>(endpoint, options, attempt + 1);
        }

        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Retry on network errors for free tier cold starts
      if (
        (error instanceof TypeError ||
          (error as Error).name === "AbortError") &&
        attempt <= this.config.retries
      ) {
        const retryDelay = this.config.retryDelay * Math.pow(2, attempt - 1);
        console.log(
          `Network error (attempt ${attempt}), retrying in ${retryDelay}ms...`,
        );
        await this.delay(retryDelay);
        return this.makeRequest<T>(endpoint, options, attempt + 1);
      }

      throw error;
    }
  }

  // Auth methods
  async login(email: string, password: string): Promise<ApiResponse> {
    return this.makeRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: any): Promise<ApiResponse> {
    return this.makeRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async getProfile(): Promise<ApiResponse> {
    return this.makeRequest("/auth/me");
  }

  async updateProfile(userData: any): Promise<ApiResponse> {
    return this.makeRequest("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  // Meal methods
  async getMeals(): Promise<ApiResponse> {
    return this.makeRequest("/meals");
  }

  async addMeal(mealData: any): Promise<ApiResponse> {
    return this.makeRequest("/meals", {
      method: "POST",
      body: JSON.stringify(mealData),
    });
  }

  async deleteMeal(mealId: string): Promise<ApiResponse> {
    return this.makeRequest(`/meals/${mealId}`, {
      method: "DELETE",
    });
  }

  async getStreak(): Promise<ApiResponse> {
    return this.makeRequest("/meals/streak");
  }

  // Progress methods
  async getWeightEntries(): Promise<ApiResponse> {
    return this.makeRequest("/progress/weight");
  }

  async addWeightEntry(weight: number): Promise<ApiResponse> {
    return this.makeRequest("/progress/weight", {
      method: "POST",
      body: JSON.stringify({ weight }),
    });
  }

  async getAchievements(): Promise<ApiResponse> {
    return this.makeRequest("/progress/achievements");
  }

  async updateAchievements(achievements: any[]): Promise<ApiResponse> {
    return this.makeRequest("/progress/achievements", {
      method: "PUT",
      body: JSON.stringify({ achievements }),
    });
  }

  // Food analysis
  async analyzeImage(imageData: string): Promise<ApiResponse> {
    return this.makeRequest("/food/analyze-image", {
      method: "POST",
      body: JSON.stringify({ image: imageData }),
    });
  }

  async searchFood(query: string): Promise<ApiResponse> {
    return this.makeRequest(`/food/search?q=${encodeURIComponent(query)}`);
  }
}

export const apiService = new ApiService();
export default apiService;
