# Use the base image with Node.js
FROM node:latest

# Copy the current directory into the Docker image
COPY . /groups-api
# Set working directory for future use
WORKDIR /groups-api

# Install the dependencies from package.json
RUN npm install

CMD npm start
