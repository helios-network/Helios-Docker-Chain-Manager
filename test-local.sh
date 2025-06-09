docker buildx build --build-context clone=../ -t docker-helios-nodemanager -f ./Dockerfile-local-repositories .
node docker-compose-x.js 1 --local-repositories
docker compose -f docker-compose-1-nodes.yml up