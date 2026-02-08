#!/bin/sh
set -e

# Check required environment variables
if [ -z "$GRAPHQL_API_KEY" ]; then
    echo "ERROR: GRAPHQL_API_KEY environment variable is not set"
    echo "Please set GRAPHQL_API_KEY in your environment"
    exit 1
fi

echo "Starting nginx with API key configured..."

# Substitute environment variables and generate config
envsubst '${GRAPHQL_API_KEY}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Test nginx config before starting
echo "Testing nginx configuration..."
nginx -t

# Start nginx
echo "Starting nginx..."
exec nginx -g 'daemon off;'
