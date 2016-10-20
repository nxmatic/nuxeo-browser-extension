#!/bin/bash -e
set -x
GULP=${GULP:=gulp}
git checkout -b release
# Freeze dependency versions
npm shrinkwrap --dev
git add -f npm-shrinkwrap.json
$GULP release
V=$(ls package/chrome | cut -d'-' -f3)
VERSION=${V::-4}
git commit -m "Update $VERSION"
git tag release-$VERSION
git push --tags
git checkout -f master
git clean -fd
$GULP release
git commit -am "Post-release $VERSION"
git push origin master
echo Deploying Browser Developer Extension to http://community.nuxeo.com/static/bde
scp -Cr package/firefox/* package/chrome/* nuxeo@lethe.nuxeo.com:/var/www/community.nuxeo.com/static/bde/