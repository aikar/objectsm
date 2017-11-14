#!/bin/bash
TMPDIR=$(npm config get tmp)
dir=$(find $TMPDIR/npm-*/ -amin 1 -type f -name "package.tgz" | xargs echo)
file="package.tgz"
if [ -z "$dir" ]; then
	file=$(ls *-*.tgz)
	dir=.
else
	cd $(dirname $dir)
fi
tar -xzf $file --transform='flags=r;s|package/dist|package|'
rm $file
tar -czf $file package
rm -rf package

