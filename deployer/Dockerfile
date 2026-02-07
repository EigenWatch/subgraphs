FROM node:20-alpine

WORKDIR /app

# Install graph-cli globally
RUN npm install -g @graphprotocol/graph-cli@0.97.1

# Copy deployment script
COPY deploy.sh /app/deploy.sh
RUN chmod +x /app/deploy.sh

ENTRYPOINT ["/app/deploy.sh"]
