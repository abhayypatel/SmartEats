# 🍎 SmartEats – AI-Powered Calorie Tracking

SmartEats is a mobile-first calorie tracking app that uses AI to analyze food photos and give you instant nutrition info. Snap a pic, get the calories and macros, track your progress. No more guessing what's in your food.

[![SmartEats](https://img.shields.io/badge/SmartEats-AI%20Calorie%20Tracker-4F46E5?style=for-the-badge)](https://github.com/yourusername/smarteats)

**LIVE DEMO**: [CLICK HERE](https://smarteats-delta.vercel.app/)

> **📢 Live Demo Notice:** This app runs on free hosting, so it might be a bit slow at first (30-60 seconds to load). If something doesn't work right away, just wait a bit and try again. Sometimes you might need to click a button twice because of the free hosting limits.

---

## 🔍 Features

- **AI Food Analysis** – Snap photos and get instant nutrition breakdown
- **Real-time Dashboard** – Track calories, macros, and weight progress  
- **Achievement System** – Unlock achievements as you build healthy habits
- **Food Search** – Manually add foods from our database
- **Weight Tracking** – Monitor your progress with charts and trends
- **Mobile-First** – Works great on phones and tablets

---

## ⚙️ Tech Stack

**Frontend:** React, TypeScript, TailwindCSS, Chart.js  
**Backend:** Node.js, Express, MongoDB  
**AI:** OpenAI Vision API  
**Cloud:** Cloudinary (image storage), Vercel (deployment)

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/abhayypatel/SmartEats.git
cd smarteats
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create `.env` file:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:3000
```

### 3. Set up the frontend

```bash
cd frontend
npm install
```

Create `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Start both servers

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm start
```

App runs at `http://localhost:3000`

---

## 🔑 What You Need

- **MongoDB Atlas** – Free database hosting
- **OpenAI API Key** – For food image analysis
- **Cloudinary Account** – Free image storage

---

## 📱 How It Works

1. **Sign Up** – Create your account and set your goals
2. **Snap Photos** – Take pics of your food for AI analysis
3. **Track Progress** – See your daily calories and macros
4. **Hit Goals** – Unlock achievements and track weight trends
