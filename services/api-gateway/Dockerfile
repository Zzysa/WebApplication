FROM node:20-alpine AS development
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8000
CMD ["npm","run","dev"]

FROM node:20-alpine AS production
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev
COPY config ./config/
COPY middleware ./middleware/
COPY server.js .
EXPOSE 8000
CMD ["npm","start"]