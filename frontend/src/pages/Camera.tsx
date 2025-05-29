import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  CameraIcon,
  ArrowLeftIcon,
  PhotoIcon,
  SparklesIcon,
  CheckIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import { useMeals } from "../contexts/MealsContext";

interface FoodAnalysis {
  items: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: number;
    serving_size: string;
  }>;
  total_calories: number;
  confidence_score: number;
}

interface EditableFoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
}

const Camera: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addMeal } = useMeals();
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [editingItems, setEditingItems] = useState<EditableFoodItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<
    "breakfast" | "lunch" | "dinner" | "snack"
  >("lunch");
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );

  const analyzeImageMutation = useMutation({
    mutationFn: async (imageData: string) => {
      // Convert base64 to blob
      const response = await fetch(imageData);
      const blob = await response.blob();

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append("images", blob, "food-image.jpg");
      formData.append("includePortionSizes", "true");
      formData.append("includeMicronutrients", "false");

      // Make API call to backend
      const apiResponse = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5001/api"}/food/analyze-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("smarteats_token")}`,
          },
          body: formData,
        },
      );

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.message || "Failed to analyze image");
      }

      const data = await apiResponse.json();

      // Transform the backend response to match frontend interface
      const transformedAnalysis: FoodAnalysis = {
        items: data.data.analysis.foods.map((food: any) => ({
          name: food.name,
          calories: Math.round(food.nutrition.calories),
          protein: Math.round(food.nutrition.protein * 10) / 10,
          carbs: Math.round(food.nutrition.carbs * 10) / 10,
          fat: Math.round(food.nutrition.fat * 10) / 10,
          confidence: food.confidence,
          serving_size:
            food.portionDescription ||
            `${food.estimatedWeight}${food.unit || "g"}`,
        })),
        total_calories: Math.round(data.data.analysis.totalNutrition.calories),
        confidence_score: data.data.confidence,
      };

      return transformedAnalysis;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      setEditingItems(
        data.items.map((item) => ({
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          serving_size: item.serving_size,
        })),
      );
      toast.success("Food analysis complete!");
    },
    onError: (error: any) => {
      console.error("Analysis error:", error);
      toast.error(
        error.message || "Failed to analyze image. Please try again.",
      );
    },
  });

  const saveMealMutation = useMutation({
    mutationFn: async (mealData: any) => {
      // Use the MealsContext to save the meal
      const mealItems = editingItems.map((item, index) => ({
        id: `item-${Date.now()}-${index}`,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        serving_size: item.serving_size,
      }));

      addMeal({
        type: selectedMealType,
        items: mealItems,
        timestamp: new Date().toISOString(),
      });

      return mealData;
    },
    onSuccess: () => {
      // Invalidate queries to refresh the home page stats
      queryClient.invalidateQueries({ queryKey: ["dailyStats"] });
      queryClient.invalidateQueries({ queryKey: ["recentMeals"] });

      toast.success("Meal saved successfully!");
      navigate("/");
    },
    onError: () => {
      toast.error("Failed to save meal. Please try again.");
    },
  });

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
    }
  }, [webcamRef]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCapturedImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = () => {
    if (capturedImage) {
      analyzeImageMutation.mutate(capturedImage);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setEditingItems([]);
    setIsEditing(false);
  };

  const updateFoodItem = (
    index: number,
    field: keyof EditableFoodItem,
    value: string | number,
  ) => {
    const updated = [...editingItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditingItems(updated);
  };

  const saveMeal = () => {
    const totalCalories = editingItems.reduce(
      (sum, item) => sum + item.calories,
      0,
    );
    const mealData = {
      items: editingItems,
      total_calories: totalCalories,
      image: capturedImage,
      timestamp: new Date().toISOString(),
      type: selectedMealType,
    };
    saveMealMutation.mutate(mealData);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600";
    if (confidence >= 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return "High";
    if (confidence >= 0.7) return "Medium";
    return "Low";
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
        >
          <ArrowLeftIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Snap Food
        </h1>
        <button
          onClick={() =>
            setFacingMode(facingMode === "user" ? "environment" : "user")
          }
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
        >
          <CameraIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {!capturedImage ? (
        <div className="relative">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode,
              width: 400,
              height: 600,
            }}
            className="w-full h-96 object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-6">
            <div className="flex items-center justify-center space-x-8">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition-all duration-200 transform hover:scale-110"
              >
                <PhotoIcon className="h-6 w-6 text-white" />
              </button>
              <button
                onClick={capture}
                className="p-4 bg-white rounded-full shadow-lg hover:scale-110 transition-transform duration-200 active:scale-95"
              >
                <CameraIcon className="h-8 w-8 text-gray-900" />
              </button>
              <div className="w-12 h-12" />
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      ) : (
        <div className="p-4">
          <div className="relative mb-4">
            <img
              src={capturedImage}
              alt="Captured food"
              className="w-full h-64 object-cover rounded-2xl"
            />
            <button
              onClick={retakePhoto}
              className="absolute top-3 right-3 p-2 bg-black/50 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors duration-200"
            >
              <CameraIcon className="h-5 w-5 text-white" />
            </button>
          </div>

          {!analysis && !analyzeImageMutation.isPending && (
            <button
              onClick={analyzeImage}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              <SparklesIcon className="h-5 w-5" />
              <span>Analyze with AI</span>
            </button>
          )}

          {analyzeImageMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-6">
                <LoadingSpinner size="lg" color="text-purple-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Analyzing your food...
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Our AI is identifying ingredients and calculating nutrition
                </p>
              </div>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Analysis Results
                  </h3>
                  <span
                    className={`text-sm font-medium ${getConfidenceColor(analysis.confidence_score)}`}
                  >
                    {getConfidenceText(analysis.confidence_score)} Confidence
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingItems.reduce((sum, item) => sum + item.calories, 0)}{" "}
                  calories
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Detected Items
                  </h4>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 text-sm hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                  >
                    {isEditing ? (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        <span>Done</span>
                      </>
                    ) : (
                      <>
                        <PencilIcon className="h-4 w-4" />
                        <span>Edit</span>
                      </>
                    )}
                  </button>
                </div>

                {editingItems.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            updateFoodItem(index, "name", e.target.value)
                          }
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-600 dark:text-gray-400">
                              Calories
                            </label>
                            <input
                              type="number"
                              value={item.calories}
                              onChange={(e) =>
                                updateFoodItem(
                                  index,
                                  "calories",
                                  Number(e.target.value),
                                )
                              }
                              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 dark:text-gray-400">
                              Protein (g)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={item.protein}
                              onChange={(e) =>
                                updateFoodItem(
                                  index,
                                  "protein",
                                  Number(e.target.value),
                                )
                              }
                              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </h5>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {item.serving_size}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div className="text-center">
                            <p className="text-gray-600 dark:text-gray-400">
                              Cal
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {item.calories}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600 dark:text-gray-400">
                              Protein
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {item.protein}g
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600 dark:text-gray-400">
                              Carbs
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {item.carbs}g
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600 dark:text-gray-400">
                              Fat
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {item.fat}g
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meal Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["breakfast", "lunch", "dinner", "snack"] as const).map(
                      (type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedMealType(type)}
                          className={`p-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            selectedMealType === type
                              ? "bg-blue-500 text-white transform scale-105"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <button
                  onClick={saveMeal}
                  disabled={saveMealMutation.isPending}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-4 rounded-2xl font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 transform hover:scale-105 active:scale-95"
                >
                  {saveMealMutation.isPending ? (
                    <LoadingSpinner size="sm" color="text-white" />
                  ) : (
                    <>
                      <CheckIcon className="h-5 w-5" />
                      <span>Save Meal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Camera;
