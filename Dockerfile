FROM node:erbium-alpine

WORKDIR /var/www/binance/server

COPY ./package.json ./
COPY ./yarn.lock ./

RUN yarn --frozen-lockfile

COPY ./ ./

RUN yarn build

ENTRYPOINT [ "yarn", "start" ]
