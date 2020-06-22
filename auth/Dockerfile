FROM node:erbium

ENV NODE_ENV production

# Create working directory
RUN mkdir -p /usr/src/blocks-auth
WORKDIR /usr/src/blocks-auth

# Install dependencies
COPY package.json .
COPY package-lock.json .
RUN npm ci

# Copy source
COPY endpoints/ endpoints/
COPY models/ models/
COPY main.js .

# De-escalate privileges
USER node

# Start server
CMD [ "node", "main.js" ]
