#!/bin/bash
set -e

psql -U postgres --no-password postgres < ../test.sql
echo "initialization ended"
