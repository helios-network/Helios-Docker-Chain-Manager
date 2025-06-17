docker buildx build --platform linux/amd64 --build-context clone=../ --label version=v0.0.54 -t docker-helios-nodemanager:v0.0.54 -f ./Dockerfile-local-repositories .
