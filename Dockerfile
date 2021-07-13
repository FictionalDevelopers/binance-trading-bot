FROM node:erbium-alpine

WORKDIR /var/www/binance/server

COPY ./package.json ./
COPY ./package-lock.json ./
COPY ./yarn.lock ./

RUN yarn

COPY ./ ./

RUN yarn build

ENTRYPOINT [ "node", "dist/dmiTradeStrategy.js" ]

