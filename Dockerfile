FROM node:carbon

RUN mkdir -p /naivechain
WORKDIR /naivechain
ADD . /naivechain

RUN cd /naivechain && npm install

EXPOSE 3001
EXPOSE 6001

ENTRYPOINT cd /naivechain && npm install && PEERS=$PEERS npm start