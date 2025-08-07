version=v0.0.122
docker tag docker-helios-nodemanager:$version heliosfoundation/docker-helios-nodemanager:$version
docker push heliosfoundation/docker-helios-nodemanager:$version
docker tag docker-helios-nodemanager:$version heliosfoundation/docker-helios-nodemanager:latest
docker push heliosfoundation/docker-helios-nodemanager:latest