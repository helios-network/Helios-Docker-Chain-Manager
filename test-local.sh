docker buildx build --build-context clone=../ -t docker-helios-nodemanager -f ./Dockerfile-local-repositories .
node docker-compose-x.js 5 --local-repositories
docker compose -f docker-compose-5-nodes.yml up