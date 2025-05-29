const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = require("../src/config/database");
const FoodItem = require("../src/models/FoodItem");

const sampleFoods = [
  {
    name: "Apple",
    category: "fruits",
    servingSize: { amount: 100, unit: "g" },
    nutrition: {
      calories: 52,
      protein: 0.3,
      carbs: 14,
      fat: 0.2,
      fiber: 2.4,
      sugar: 10.4,
      sodium: 1,
    },
    dataSource: "usda",
    isVerified: true,
  },
  {
    name: "Banana",
    category: "fruits",
    servingSize: { amount: 100, unit: "g" },
    nutrition: {
      calories: 89,
      protein: 1.1,
      carbs: 23,
      fat: 0.3,
      fiber: 2.6,
      sugar: 12.2,
      sodium: 1,
    },
    dataSource: "usda",
    isVerified: true,
  },
  {
    name: "Chicken Breast",
    category: "protein",
    servingSize: { amount: 100, unit: "g" },
    nutrition: {
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      fiber: 0,
      sugar: 0,
      sodium: 74,
    },
    dataSource: "usda",
    isVerified: true,
  },
  {
    name: "Brown Rice",
    category: "grains",
    servingSize: { amount: 100, unit: "g" },
    nutrition: {
      calories: 111,
      protein: 2.6,
      carbs: 23,
      fat: 0.9,
      fiber: 1.8,
      sugar: 0.4,
      sodium: 5,
    },
    dataSource: "usda",
    isVerified: true,
  },
  {
    name: "Broccoli",
    category: "vegetables",
    servingSize: { amount: 100, unit: "g" },
    nutrition: {
      calories: 34,
      protein: 2.8,
      carbs: 7,
      fat: 0.4,
      fiber: 2.6,
      sugar: 1.5,
      sodium: 33,
    },
    dataSource: "usda",
    isVerified: true,
  },
];

async function seedDatabase() {
  try {
    await connectDB();

    console.log("🌱 Starting database seeding...");

    await FoodItem.deleteMany({});
    console.log("🗑️  Cleared existing food items");

    const foods = await FoodItem.insertMany(sampleFoods);
    console.log(`✅ Inserted ${foods.length} food items`);

    console.log("🎉 Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
