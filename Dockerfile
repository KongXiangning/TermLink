FROM node:20-bookworm

# Install system dependencies including tmux
# python3, make, g++ are needed for node-pty build if prebuilds are missing, 
# but node:20-bookworm usually handles it well. 
# We explicitly install tmux as it's the core dependency for this app.
RUN apt-get update && apt-get install -y \
    tmux \
    vim \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
