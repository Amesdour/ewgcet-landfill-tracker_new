#!/bin/sh
node server.js &
SERVER_PID=$!
npx vite --host 0.0.0.0 --port 5000 &
VITE_PID=$!
trap "kill $SERVER_PID $VITE_PID 2>/dev/null" EXIT INT TERM
wait
