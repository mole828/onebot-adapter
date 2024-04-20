FROM node:16

WORKDIR /app

ADD . .

RUN npm install

RUN npm install -g typescript

RUN tsc

EXPOSE 3000

CMD ["node", "dist/app.js"]