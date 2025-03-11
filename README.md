# Helios Docker Chain Manager

## Install

Download docker
Nodejs v20 or greater

```bash
npm install
```

## Build

Edit the release.sh file with the right version you want.
Edit the test.sh file with the right version you want.

```bash
sh release.sh
```

## Run Released Version

Once built you can run:

```bash
sh test.sh
```

## Run locally 1 node With your helios-core

Be sure to have the commande line `heliades` in your PATH.
Then run:

```bash
node server.js
```

you can go on localhost:8080 the Manager will use your local `heliades`

## Run Pool of 5 nodes

```bash
docker compose -f docker-compose-5-nodes.yml up
```

## Procedure for Run Pool of 5 nodes with your locals Helios-Docker-Chain-Manager and helios-core

Be sure to have this directory path architecture:

```bash
DirectoryX/
  helios-core/
  Helios-Docker-Chain-Manager/
```

copy the Dockerfile in DirectoryX/
copy the docker-compose.yml in DirectoryX/
copy clean.sh in DirectoryX/

```bash
cp Dockerfile ../
cp docker-compose.yml ../
cp clean.sh ../
cd ..
```

Replace this lines in Dockerfile

```bash
RUN git clone https://github.com/helios-network/helios-core.git
RUN git clone https://github.com/Helios-Chain-Labs/Helios-Docker-Chain-Manager.git
```

per

```bash
COPY ./helios-core ./helios-core
COPY ./Helios-Docker-Chain-Manager ./Helios-Docker-Chain-Manager
```

then you are ready for using the manager and docker-compose with pool of nodes and with your locals projects.

```bash
docker compose up
```

And voila!

For having more docker-compose cases you can generate some docker-compose by using docker-compose-x.js
