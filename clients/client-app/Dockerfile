FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application for production
RUN npm run build

# Expose port
EXPOSE 3000

# Start production server (preview serves the built files)
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]