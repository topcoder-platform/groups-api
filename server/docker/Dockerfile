# Use the base image with Node.js
FROM node:latest

# Copy the current directory into the Docker image
COPY . /server
# Set working directory for future use
WORKDIR /server

# Install the dependencies from package.json
RUN npm install

CMD npm start
