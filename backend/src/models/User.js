const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId; // Password required only if not Google OAuth user
      },
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't include password in queries by default
    },

    // Profile Information
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    avatar: {
      type: String,
      default: null,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
      required: [true, "Gender is required"],
    },

    // Physical Information
    height: {
      value: {
        type: Number,
        required: [true, "Height is required"],
        min: [50, "Height must be at least 50 cm"],
      },
      unit: {
        type: String,
        enum: ["cm", "ft"],
        default: "cm",
      },
    },
    weight: {
      value: {
        type: Number,
        required: [true, "Weight is required"],
        min: [20, "Weight must be at least 20 kg"],
      },
      unit: {
        type: String,
        enum: ["kg", "lbs"],
        default: "kg",
      },
    },
    activityLevel: {
      type: String,
      enum: [
        "sedentary",
        "lightly-active",
        "moderately-active",
        "very-active",
        "extremely-active",
      ],
      required: [true, "Activity level is required"],
      default: "moderately-active",
    },

    // Goals
    goals: {
      weightGoal: {
        type: String,
        enum: ["lose", "maintain", "gain"],
        required: [true, "Weight goal is required"],
        default: "maintain",
      },
      targetWeight: {
        value: Number,
        unit: {
          type: String,
          enum: ["kg", "lbs"],
          default: "kg",
        },
      },
      weeklyWeightChange: {
        type: Number,
        default: 0, // kg per week
        min: [-2, "Weekly weight change cannot exceed -2 kg"],
        max: [2, "Weekly weight change cannot exceed 2 kg"],
      },
      dailyCalories: {
        type: Number,
        required: [true, "Daily calorie goal is required"],
        min: [800, "Daily calories must be at least 800"],
        max: [5000, "Daily calories cannot exceed 5000"],
      },
      macros: {
        protein: {
          type: Number,
          default: 25, // percentage
          min: 10,
          max: 50,
        },
        carbs: {
          type: Number,
          default: 45, // percentage
          min: 20,
          max: 70,
        },
        fat: {
          type: Number,
          default: 30, // percentage
          min: 15,
          max: 50,
        },
      },
    },

    // Preferences
    preferences: {
      units: {
        weight: {
          type: String,
          enum: ["kg", "lbs"],
          default: "kg",
        },
        height: {
          type: String,
          enum: ["cm", "ft"],
          default: "cm",
        },
        temperature: {
          type: String,
          enum: ["celsius", "fahrenheit"],
          default: "celsius",
        },
      },
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "auto",
      },
      language: {
        type: String,
        default: "en",
      },
      timezone: {
        type: String,
        default: "UTC",
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
        mealReminders: {
          type: Boolean,
          default: true,
        },
        waterReminders: {
          type: Boolean,
          default: true,
        },
        weeklyReports: {
          type: Boolean,
          default: true,
        },
      },
    },

    // OAuth
    googleId: {
      type: String,
      sparse: true, // Allows multiple null values
    },

    // Tracking
    streak: {
      current: {
        type: Number,
        default: 0,
      },
      longest: {
        type: Number,
        default: 0,
      },
      lastLogDate: {
        type: Date,
        default: null,
      },
    },

    // Device tokens for push notifications
    deviceTokens: [
      {
        token: String,
        platform: {
          type: String,
          enum: ["ios", "android", "web"],
        },
        lastUsed: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Timestamps
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
});

userSchema.virtual("bmi").get(function () {
  if (!this.height?.value || !this.weight?.value) return null;

  let heightInM = this.height.value;
  let weightInKg = this.weight.value;

  // Convert height to meters if in feet
  if (this.height.unit === "ft") {
    heightInM = this.height.value * 0.3048;
  } else {
    heightInM = this.height.value / 100;
  }

  // Convert weight to kg if in lbs
  if (this.weight.unit === "lbs") {
    weightInKg = this.weight.value * 0.453592;
  }

  const bmi = weightInKg / (heightInM * heightInM);
  return Math.round(bmi * 10) / 10;
});

userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.updateStreak = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastLog = this.streak.lastLogDate
    ? new Date(this.streak.lastLogDate)
    : null;
  if (lastLog) {
    lastLog.setHours(0, 0, 0, 0);
  }

  if (!lastLog) {
    // First time logging
    this.streak.current = 1;
    this.streak.lastLogDate = today;
  } else {
    const daysDiff = Math.floor((today - lastLog) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Already logged today, no change
      return;
    } else if (daysDiff === 1) {
      // Consecutive day
      this.streak.current += 1;
      this.streak.lastLogDate = today;
    } else {
      // Streak broken
      this.streak.current = 1;
      this.streak.lastLogDate = today;
    }
  }

  // Update longest streak
  if (this.streak.current > this.streak.longest) {
    this.streak.longest = this.streak.current;
  }
};

module.exports = mongoose.model("User", userSchema);
