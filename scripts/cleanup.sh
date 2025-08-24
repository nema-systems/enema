#!/bin/bash

echo "🧹 Cleaning up Nema Sandbox"

# Function to ask for confirmation
confirm() {
    read -r -p "${1:-Are you sure?} [y/N] " response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            true
            ;;
        *)
            false
            ;;
    esac
}

# Docker cleanup
if docker-compose ps | grep -q "Up"; then
    if confirm "Stop Docker Compose services?"; then
        echo "🐳 Stopping Docker Compose services..."
        docker-compose down
    fi
fi

if confirm "Remove Docker volumes (This will delete all data)?"; then
    echo "🗑️  Removing Docker volumes..."
    docker-compose down -v
    docker volume prune -f
fi

if confirm "Remove Docker images?"; then
    echo "🗑️  Removing Docker images..."
    docker rmi nema-core:latest 2>/dev/null || true
    docker rmi nema-client-app:latest 2>/dev/null || true
    docker rmi nema-client-landing:latest 2>/dev/null || true
    
    # Remove dangling images
    docker image prune -f
fi

# Kubernetes cleanup
if kubectl get namespace nema &> /dev/null; then
    if confirm "Delete Kubernetes deployment?"; then
        echo "☸️  Deleting Kubernetes resources..."
        kubectl delete namespace nema
        
        # Wait for namespace to be deleted
        echo "⏳ Waiting for namespace deletion..."
        while kubectl get namespace nema &> /dev/null; do
            sleep 2
        done
        
        echo "✅ Kubernetes resources cleaned up"
    fi
fi

# Clean up local files (optional)
if confirm "Remove generated files (.env, logs, etc.)?"; then
    echo "🗑️  Cleaning up local files..."
    rm -f .env
    rm -rf logs/
    rm -rf .vscode/
    rm -rf .idea/
fi

echo ""
echo "✅ Cleanup completed!"
echo ""
echo "To start fresh:"
echo "   ./scripts/setup.sh"