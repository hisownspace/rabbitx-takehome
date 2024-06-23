const { Centrifuge } = require("centrifuge");
const { WebSocket } = require("ws");

// live
token = process.env.JWT_TOKEN;
socket = "wss://api.prod.rabbitx.io/ws";
// test
// token =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwIiwiZXhwIjo1MjYyNjUyMDEwfQ.x_245iYDEvTTbraw1gt4jmFRFfgMJb-GJ-hsU9HuDik";
// socket = "wss://api.testnet.rabbitx.io/ws";

const orderbook = {
  bids: [],
  asks: [],
  sequence: null,
  timestamp: null,
  bidsLen: 0,
  asksLen: 0,
};

const centrifuge = new Centrifuge(socket, {
  debug: true,
  websocket: WebSocket,
});
centrifuge.setToken(token);

const sub = centrifuge.newSubscription("orderbook:BTC-USD");

const addToOrderBookNew = (ctx, group) => {
  for (let trans of ctx.data[group]) {
    const idx = orderbook[group].findIndex(
      (el) => parseFloat(el[0]) === parseFloat(trans[0]),
    );
    if (trans[1] === "0") {
      removeIdx >= 0 ? orderbook[group].splice(removeIdx, 1) : null;
      orderbook[`${group}Len`] -= 1;
      continue;
    }
    if (idx === -1) {
      const insertIdx = orderbook[group].findIndex(
        (el) => parseFloat(el[0]) > parseFloat(trans[0]),
      );
      orderbook[group].splice(insertIdx, 0, trans);
      orderbook[`${group}Len`] += 1;
    } else {
      orderbook[group][idx] = trans;
    }
  }
};

const checkIntegrity = (ctx) => {
  const prevSeq = orderbook.sequence;
  const newSeq = ctx.data.sequence;
  if (prevSeq + 1 != newSeq) {
    throw new Error("Missed push!");
  }
  orderbook.timestamp = ctx.data.timestamp;
  orderbook.sequence = newSeq;
  if (newSeq % 100 === 0) {
    console.log(orderbook);
  }
};

sub.on("subscribed", (ctx) => {
  orderbook.bids = ctx.data.bids;
  orderbook.asks = ctx.data.asks;
  orderbook.sequence = ctx.data.sequence;
  orderbook.timestamp = ctx.data.timestamp;
  orderbook.bidsLen = orderbook.bids.length;
  orderbook.asksLen = orderbook.asks.length;
  console.log(orderbook);
});

sub.on("publication", (ctx) => {
  checkIntegrity(ctx);
  addToOrderBookNew(ctx, "asks");
  addToOrderBookNew(ctx, "bids");
});

sub.subscribe();

centrifuge.connect();
