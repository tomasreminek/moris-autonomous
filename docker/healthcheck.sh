#!/bin/sh
# 🩺 Health Check

curl -sf http://localhost:3001/health >/dev/null && \
curl -sf http://localhost:3456/health >/dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "Healthy"
    exit 0
else
    echo "Unhealthy"
    exit 1
fi
