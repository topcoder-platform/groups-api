#!/bin/bash
set -eo pipefail
UPDATE_CACHE=""
docker-compose -f docker/docker-compose.yml build leaderboard-api
docker create --name app leaderboard-api:latest

if [ -d node_modules ]
then
  mv package-lock.json old-package-lock.json
  docker cp app:/leaderboard-api/package-lock.json package-lock.json
  set +eo pipefail
  UPDATE_CACHE=$(cmp package-lock.json old-package-lock.json)
  set -eo pipefail
else
  UPDATE_CACHE=1
fi

if [ "$UPDATE_CACHE" == 1 ]
then
  docker cp app:/leaderboard-api/node_modules .
fi