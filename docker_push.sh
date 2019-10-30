#!/bin/sh
export GIT_BRANCH="$CODEBUILD_WEBHOOK_TRIGGER"

echo "Current git branch is $GIT_BRANCH"
if [ "$GIT_BRANCH" = "branch/master" ] ; then
  echo Pushing master branch image to docker registry...
  docker tag gainstrack docker.gainstrack.com/gainstrack
  docker push docker.gainstrack.com/gainstrack
fi
