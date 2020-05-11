FROM node:erbium

# Create working directory
RUN mkdir -p /usr/src/unnamed
WORKDIR /usr/src/unnamed

# Install dependencies
COPY package.json .
COPY package-lock.json .
RUN npm install

# Copy server & client
COPY server/ server/
COPY client/ client/

# De-escalate privileges
USER node

# Start server
CMD [ "node", "server/main.js" ]
