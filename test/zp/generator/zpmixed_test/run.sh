#!/bin/sh
cd $(dirname $0)
g++ ./main.cpp ./zp.cpp
./a.out
