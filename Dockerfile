FROM node:erbium

ENV NODE_ENV production

# Create working directory
RUN mkdir -p /usr/src/blocks
WORKDIR /usr/src/blocks

# Install dependencies
COPY package.json .
COPY package-lock.json .
RUN npm ci

# Copy server & clients
COPY server/ server/
COPY client/ client/
COPY destinations/ destinations/

# De-escalate privileges
USER node

# Start server
CMD [ "node", "server/main.js" ]
