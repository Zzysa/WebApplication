FROM node:20-alpine AS development
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm","run","dev"]

FROM node:20-alpine AS production
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev
COPY prisma ./prisma/
RUN npx prisma generate
COPY . .
EXPOSE 3001
CMD ["npm","start"]