#!/bin/bash

set -e

echo "🚀 Setting up Nema Sandbox Environment"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📋 Creating .env file from template"
    cp .env.example .env
    echo "✅ Please edit .env file with your Clerk credentials"
    echo "   - CLERK_SECRET_KEY"
    echo "   - VITE_CLERK_PUBLISHABLE_KEY"
    echo ""
    echo "   Run this script again after updating .env"
    exit 0
fi

echo "🏗️  Building Docker images..."

# Build nema-core service
echo "Building nema-core..."
docker build -t nema-core:latest ./services/nema-core/

# Build client applications (if Dockerfiles exist)
for client in client-app client-landing; do
    if [ -d "./clients/$client" ] && [ -f "./clients/$client/Dockerfile" ]; then
        echo "Building $client..."
        docker build -t nema-$client:latest ./clients/$client/
    fi
done

echo "🐳 Starting services with Docker Compose..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U nema; do
    sleep 2
done

# Wait for Temporal
echo "Waiting for Temporal..."
until curl -f http://localhost:8080 > /dev/null 2>&1; do
    sleep 2
done

# Wait for nema-core
echo "Waiting for nema-core..."
until curl -f http://localhost:8000/health > /dev/null 2>&1; do
    sleep 2
done

echo ""
echo "✅ Nema Sandbox is ready!"
echo ""
echo "🔗 Access Points:"
echo "   Frontend:     http://localhost:3000"
echo "   API Docs:     http://localhost:8000/docs"
echo "   Temporal UI:  http://localhost:8080" 
echo ""
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "📝 Next Steps:"
echo "   1. Visit http://localhost:3000 to access the frontend"
echo "   2. Check the API documentation at http://localhost:8000/docs"
echo "   3. Monitor workflows at http://localhost:8080"
echo "   4. View logs: docker-compose logs -f [service-name]"