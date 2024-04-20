FROM node:16

WORKDIR /app

ADD . .

RUN npm install

RUN tsc

EXPOSE 3000

CMD ["node", "dist/index.js"]