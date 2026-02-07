#!/bin/sh
# Substitute environment variables and start nginx
envsubst '${GRAPHQL_API_KEY}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
exec nginx -g 'daemon off;'
