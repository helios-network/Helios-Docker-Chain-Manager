# Stage 1
FROM alpine/git as clone
WORKDIR /clone
RUN git clone https://username:githubtoken@github.com/helios-network/helios-core.git
RUN git clone https://github.com/Helios-Chain-Labs/Helios-Docker-Chain-Manager.git
# Stage 2
FROM golang:1.23.3-bullseye AS build
WORKDIR /helios-core
COPY --from=clone /clone/helios-core/ .
RUN go build ./cmd/heliades/
# Stage 3
FROM node:18.16.0 AS final
WORKDIR /app
COPY --from=build /helios-core/heliades /usr/bin/heliades
COPY --from=clone /clone/Helios-Docker-Chain-Manager/ .
ADD https://github.com/CosmWasm/wasmvm/releases/download/v2.1.2/libwasmvm.x86_64.so /lib/libwasmvm.x86_64.so
ADD https://github.com/CosmWasm/wasmvm/releases/download/v2.1.2/libwasmvm.aarch64.so /lib/libwasmvm.aarch64.so
RUN npm install
RUN apt-get update
RUN apt-get install jq --yes
ENTRYPOINT ["npm", "run", "prod"]