import { Centrifuge } from "centrifuge";
import { WebSocket } from "ws";

// live
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MDAwMDAwMDAwIiwiZXhwIjo2NTQ4NDg3NTY5fQ.o_qBZltZdDHBH3zHPQkcRhVBQCtejIuyq8V1yj5kYq8";
const socket = "wss://api.prod.rabbitx.io/ws";
// test
// const token =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwIiwiZXhwIjo1MjYyNjUyMDEwfQ.x_245iYDEvTTbraw1gt4jmFRFfgMJb-GJ-hsU9HuDik";
// const socket = "wss://api.testnet.rabbitx.io/ws";

const orderbook = {
  bids: [],
  asks: [],
  sequence: null,
  timestamp: null,
  bidsLen: 0,
  asksLen: 0,
  disconnects: 0,
};

const clearOrderBook = () => {
  orderbook.bids = [];
  orderbook.asks = [];
  orderbook.sequence = null;
  orderbook.timestamp = null;
  orderbook.bidsLen = 0;
  orderbook.asksLen = 0;
};

const addToOrderBook = (ctx, group) => {
  // iterate through each of the entries in either the asks or bids array for the current update
  for (let trans of ctx.data[group]) {
    // locate the price level of the current update
    const idx = orderbook[group].findIndex(
      (el) => parseFloat(el[0]) === parseFloat(trans[0]),
    );

    // if the size for the update at this price level is zero, remove it from the orderbook
    if (trans[1] === "0") {
      idx >= 0
        ? orderbook[group].splice(idx, 1)
        : (orderbook[`${group}Len`] += 1);
      orderbook[`${group}Len`] -= 1;
      continue;
    }

    if (idx === -1) {
      // If price level does not appear in orderbook, add it at the appropriate location and increment length
      const insertIdx = orderbook[group].findIndex(
        (el) => parseFloat(el[0]) > parseFloat(trans[0]),
      );
      if (insertIdx < 0) {
        // if new price level is higher than all existing ones, put it at the end of array
        orderbook[group].push(trans);
      } else {
        orderbook[group].splice(insertIdx, 0, trans);
      }
      orderbook[`${group}Len`] += 1;
    } else {
      // otherwise, locate the existing entry and modify it with the new size
      orderbook[group][idx] = trans;
    }
  }
};

const restartConnection = () => {
  sub.unsubscribe();
  sub.subscribe();
};

const checkIntegrity = (ctx) => {
  const prevSeq = orderbook.sequence;
  const newSeq = ctx.data.sequence;
  if (prevSeq && prevSeq + 1 != newSeq) {
    // throw new Error("Missed push!");
    orderbook.disconnects += 1;
    clearOrderBook();
    restartConnection();
  }
  orderbook.timestamp = ctx.data.timestamp;
  orderbook.sequence = newSeq;
  if (newSeq % 100 === 0) {
    console.log(orderbook);
  }
};

let reconnectProc;

const centrifuge = new Centrifuge(socket, {
  debug: true,
  websocket: WebSocket,
});
centrifuge.setToken(token);

const sub = centrifuge.newSubscription("orderbook:BTC-USD");

centrifuge.on("connected", () => {
  clearInterval(reconnectProc);
});

centrifuge.on("disconnected", () => {
  console.log("Disconnected!");
  reconnectProc = setInterval(() => {
    console.log("Attemping to reconnect...");
    centrifuge.connect();
  }, 5000);
});

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
  addToOrderBook(ctx, "asks");
  addToOrderBook(ctx, "bids");
});

sub.subscribe();

centrifuge.connect();
