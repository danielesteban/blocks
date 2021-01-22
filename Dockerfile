FROM node:fermium

ENV NODE_ENV production

# Create working directory
RUN mkdir -p /usr/src/blocks
WORKDIR /usr/src/blocks

# Install server dependencies
COPY package.json .
COPY package-lock.json .
RUN npm ci

# Copy and build destinations client
COPY destinations/ destinations/
RUN npm --prefix destinations ci
RUN npm --prefix destinations run build
RUN rm -rf destinations/node_modules/ destinations/*.json destinations/*.js

# Copy server & client source
COPY server/ server/
COPY client/ client/

# De-escalate privileges
USER node

# Start server
CMD [ "node", "server/main.js" ]
