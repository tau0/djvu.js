#!/bin/sh
cd $(dirname $0)
g++ ./main_new.cpp ./zp.cpp
./a.out
