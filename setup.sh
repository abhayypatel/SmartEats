#!/bin/bash

# SmartEats Setup Script
echo "🍽️  Setting up SmartEats - AI-Powered Calorie Tracking App"
echo "============================================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment files from examples
echo "📝 Creating environment files..."

if [ ! -f backend/.env ]; then
    cp backend/env.example backend/.env
    echo "✅ Created backend/.env from example"
else
    echo "⚠️  backend/.env already exists, skipping..."
fi

if [ ! -f frontend/.env ]; then
    cp frontend/env.example frontend/.env
    echo "✅ Created frontend/.env from example"
else
    echo "⚠️  frontend/.env already exists, skipping..."
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit backend/.env and frontend/.env with your API keys"
echo "2. Start the application with: docker-compose up -d"
echo "3. Seed the database with: cd backend && npm run seed"
echo "4. Visit http://localhost:3000 to see the app"
echo ""
echo "🔑 Required API Keys:"
echo "- OpenAI API Key (for food analysis)"
echo "- Cloudinary credentials (for image storage)"
echo "- Google OAuth credentials (optional)"
echo "- Firebase credentials (for push notifications)"
echo ""
echo "📚 For more information, see the README.md file" 