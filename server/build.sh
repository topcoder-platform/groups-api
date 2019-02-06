#!/bin/bash
set -eo pipefail
UPDATE_CACHE=""
docker-compose -f server/docker/docker-compose.yml build groups-api
docker create --name app groups-api:latest

if [ -d node_modules ]
then
  mv server/package-lock.json server/old-package-lock.json
  docker cp app:/server/package-lock.json server/package-lock.json
  set +eo pipefail
  UPDATE_CACHE=$(cmp server/package-lock.json server/old-package-lock.json)
  set -eo pipefail
else
  UPDATE_CACHE=1
fi

if [ "$UPDATE_CACHE" == 1 ]
then
  docker cp app:/server/node_modules ./server/
fi
