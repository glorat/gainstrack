#!/bin/sh
export GIT_BRANCH="$(git symbolic-ref HEAD --short 2>/dev/null)"
if [ "GIT_BRANCH" = "master" ] ; then
  echo Pushing master branch image to docker registry...
  docker tag gainstrack docker.gainstrack.com/gainstrack
  docker push docker.gainstrack.com/gainstrack
fi