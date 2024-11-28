# Stage 1
FROM alpine/git as clone
WORKDIR /clone
RUN git clone https://github.com/Helios-Chain-Labs/helios-core.git
RUN git clone https://github.com/Helios-Chain-Labs/Helios-Docker-Chain-Manager.git
# Stage 2
FROM golang:1.20.0-alpine3.17 AS build
WORKDIR /helios-core
COPY --from=clone /clone/helios-core/ .
RUN make install
# Stage 3
FROM node:18.16.0 AS final
WORKDIR /app
COPY --from=clone /clone/Helios-Docker-Chain-Manager/ .
RUN npm install
ENTRYPOINT ["npm", "run", "prod"]
