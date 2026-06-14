FROM node:20-alpine

WORKDIR /app/frontend

# Copy package.json and package-lock.json (if exists)
COPY frontend/package.json ./

# Install npm dependencies
RUN npm install

# Copy frontend source files
COPY frontend/ ./

# Expose Vite port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev"]
