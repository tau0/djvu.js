#!/bin/bash
cd $(dirname $0)
set -e
for i in $(find ./* -name "run.sh" | grep -v "\./run\.sh"); do
    echo $i
    "$i"
done
