FROM node:hydrogen-alpine

WORKDIR /var/www/binance/server

COPY ./package.json ./
COPY ./yarn.lock ./

RUN yarn

COPY ./ ./

RUN yarn build

ENTRYPOINT [ "node", "dist/dmiTradeStrategy.js" ]
