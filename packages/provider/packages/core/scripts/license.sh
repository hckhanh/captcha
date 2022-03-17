#!/bin/bash

for i in $(git ls-files | grep "\.ts$"); do
  year=$(git log --follow --diff-filter=A $i | grep Date | tail -1 | awk '{ print $6 }')
  echo "Adding GPL3 header w/ year $year to $i"
  cat $(pwd)/scripts/LICENSEHEADER.txt |sed "s|THEDATE|$year|" | cat - $i > /tmp/temp && mv /tmp/temp $i
done

