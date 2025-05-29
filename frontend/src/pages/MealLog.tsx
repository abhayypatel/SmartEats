import React, { useState } from "react";
import { format, subDays, addDays } from "date-fns";
import toast from "react-hot-toast";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FireIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { useMeals } from "../contexts/MealsContext";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mealType: string;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  mealType,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
          Delete Meal
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          Are you sure you want to delete this {mealType} meal? This action
          cannot be undone.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const MealLog: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingMeal, setEditingMeal] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    mealId: string | null;
    mealType: string;
  }>({
    isOpen: false,
    mealId: null,
    mealType: "",
  });
  const { getMealsByDate, deleteMeal, updateMeal } = useMeals();

  // Get meals for the selected date
  const selectedDateString = format(selectedDate, "yyyy-MM-dd");
  const dayMeals = getMealsByDate(selectedDateString);

  // Calculate daily totals
  const dailyTotals = dayMeals.reduce(
    (totals, meal) => {
      meal.items.forEach((item) => {
        totals.calories += item.calories;
        totals.protein += item.protein;
        totals.carbs += item.carbs;
        totals.fat += item.fat;
      });
      return totals;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const handleDeleteMeal = (mealId: string, mealType: string) => {
    setDeleteModal({
      isOpen: true,
      mealId,
      mealType,
    });
  };

  const confirmDeleteMeal = () => {
    if (deleteModal.mealId) {
      deleteMeal(deleteModal.mealId);
      toast.success("Meal deleted successfully!");
      setDeleteModal({ isOpen: false, mealId: null, mealType: "" });
    }
  };

  const cancelDeleteMeal = () => {
    setDeleteModal({ isOpen: false, mealId: null, mealType: "" });
  };

  const handleEditMeal = (meal: any) => {
    setEditingMeal(meal.id);
    setEditingItems([...meal.items]);
  };

  const handleSaveEdit = () => {
    if (editingMeal && editingItems.length > 0) {
      updateMeal(editingMeal, { items: editingItems });
      setEditingMeal(null);
      setEditingItems([]);
      toast.success("Meal updated successfully!");
    }
  };

  const handleCancelEdit = () => {
    setEditingMeal(null);
    setEditingItems([]);
  };

  const updateEditingItem = (index: number, field: string, value: any) => {
    const updated = [...editingItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditingItems(updated);
  };

  const removeEditingItem = (index: number) => {
    const updated = editingItems.filter((_, i) => i !== index);
    setEditingItems(updated);
  };

  const getMealTypeIcon = (type: string) => {
    switch (type) {
      case "breakfast":
        return "🌅";
      case "lunch":
        return "☀️";
      case "dinner":
        return "🌙";
      case "snack":
        return "🍎";
      default:
        return "🍽️";
    }
  };

  const getMealTypeColor = (type: string) => {
    switch (type) {
      case "breakfast":
        return "from-orange-400 to-yellow-400";
      case "lunch":
        return "from-blue-400 to-cyan-400";
      case "dinner":
        return "from-purple-400 to-pink-400";
      case "snack":
        return "from-green-400 to-teal-400";
      default:
        return "from-gray-400 to-gray-500";
    }
  };

  // Helper function to round decimals properly
  const roundMacro = (value: number) => {
    return Math.round(value * 10) / 10;
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-900 min-h-screen">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Meal Log
          </h1>
          <Link
            to="/search"
            className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {format(selectedDate, "EEEE")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {format(selectedDate, "MMMM d, yyyy")}
            </p>
          </div>
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-3">
              <FireIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {roundMacro(dailyTotals.calories)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Calories</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center bg-white dark:bg-gray-700 rounded-xl p-3">
              <div className="flex items-center justify-center w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-2">
                <span className="text-xs text-red-600 dark:text-red-400 font-bold">
                  P
                </span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {roundMacro(dailyTotals.protein)}g
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Protein
              </p>
            </div>
            <div className="text-center bg-white dark:bg-gray-700 rounded-xl p-3">
              <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mx-auto mb-2">
                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-bold">
                  C
                </span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {roundMacro(dailyTotals.carbs)}g
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Carbs</p>
            </div>
            <div className="text-center bg-white dark:bg-gray-700 rounded-xl p-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-2">
                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                  F
                </span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {roundMacro(dailyTotals.fat)}g
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Fat</p>
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Meals & Snacks
            </h3>
            <Link
              to="/search"
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add Meal</span>
            </Link>
          </div>

          {dayMeals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🍽️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No meals logged yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Start tracking your meals to see your daily nutrition
              </p>
              <Link
                to="/search"
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Your First Meal</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {dayMeals.map((meal, mealIndex) => {
                const mealTotal = meal.items.reduce(
                  (sum, item) => sum + item.calories,
                  0,
                );
                const isEditing = editingMeal === meal.id;

                return (
                  <div
                    key={meal.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-12 h-12 bg-gradient-to-r ${getMealTypeColor(
                            meal.type,
                          )} rounded-xl flex items-center justify-center text-white text-lg font-semibold`}
                        >
                          {getMealTypeIcon(meal.type)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                            {meal.type}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {format(new Date(meal.timestamp), "h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSaveEdit}
                              className="p-2 text-green-600 hover:text-green-700 transition-colors duration-200 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded-lg"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditMeal(meal)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteMeal(meal.id, meal.type)
                              }
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      {isEditing ? (
                        // Editing mode
                        <div className="space-y-3">
                          {editingItems.map((item, itemIndex) => (
                            <div
                              key={item.id}
                              className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) =>
                                    updateEditingItem(
                                      itemIndex,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  className="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  onClick={() => removeEditingItem(itemIndex)}
                                  className="ml-2 p-1 text-red-500 hover:text-red-700 transition-colors"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                <div>
                                  <label className="text-xs text-gray-600 dark:text-gray-400">
                                    Calories
                                  </label>
                                  <input
                                    type="number"
                                    value={item.calories}
                                    onChange={(e) =>
                                      updateEditingItem(
                                        itemIndex,
                                        "calories",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-full p-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600 dark:text-gray-400">
                                    Protein
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={item.protein}
                                    onChange={(e) =>
                                      updateEditingItem(
                                        itemIndex,
                                        "protein",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-full p-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600 dark:text-gray-400">
                                    Carbs
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={item.carbs}
                                    onChange={(e) =>
                                      updateEditingItem(
                                        itemIndex,
                                        "carbs",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-full p-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600 dark:text-gray-400">
                                    Fat
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={item.fat}
                                    onChange={(e) =>
                                      updateEditingItem(
                                        itemIndex,
                                        "fat",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-full p-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // View mode
                        meal.items.map((item, itemIndex) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {item.name}
                              </p>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {item.serving_size}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                                    P: {roundMacro(item.protein)}g
                                  </span>
                                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded">
                                    C: {roundMacro(item.carbs)}g
                                  </span>
                                  <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                    F: {roundMacro(item.fat)}g
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="font-semibold text-gray-900 dark:text-white ml-2">
                              {roundMacro(item.calories)} cal
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Total
                      </span>
                      <span className="font-bold text-lg text-gray-900 dark:text-white">
                        {isEditing
                          ? roundMacro(
                              editingItems.reduce(
                                (sum, item) => sum + item.calories,
                                0,
                              ),
                            )
                          : roundMacro(mealTotal)}{" "}
                        calories
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={cancelDeleteMeal}
        onConfirm={confirmDeleteMeal}
        mealType={deleteModal.mealType}
      />
    </div>
  );
};

export default MealLog;
