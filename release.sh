version=v0.0.111
docker buildx build --platform linux/amd64 --build-context clone=../ --label version=$version -t docker-helios-nodemanager:$version -f ./Dockerfile-local-repositories .
