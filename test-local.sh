#!/bin/bash

echo "🧹 Cleaning previous setup..."
docker compose -f docker-compose-5-nodes.yml down --volumes 2>/dev/null || true
rm -rf ./data

echo "🔨 Building Docker image..."
docker buildx build --build-context clone=../ -t docker-helios-nodemanager -f ./Dockerfile-local-repositories .

echo "📝 Generating Docker Compose configuration..."
node docker-compose-x.js 1 --local-repositories

echo "🚀 Starting Helios network with monitoring..."
docker compose -f docker-compose-1-nodes.yml up


echo "⏳ Waiting for services to start..."
sleep 10

echo ""
echo "✅ Setup complete!"
echo "📊 Prometheus: http://localhost:9091"
echo "📈 Grafana: http://localhost:3000 (admin/admin123)"
echo "💻 Node Exporter: http://localhost:9100"
