import { Centrifuge } from "centrifuge";
// import { WebSocket } from "ws";
// import { SockJS } from "sockjs";
// const { Centrifuge } = require("centrifuge");
// const { WebSocket } = require("ws");

// live
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MDAwMDAwMDAwIiwiZXhwIjo2NTQ4NDg3NTY5fQ.o_qBZltZdDHBH3zHPQkcRhVBQCtejIuyq8V1yj5kYq8";
const socket = "wss://api.prod.rabbitx.io/ws";
// test
// const token =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwIiwiZXhwIjo1MjYyNjUyMDEwfQ.x_245iYDEvTTbraw1gt4jmFRFfgMJb-GJ-hsU9HuDik";
// const socket = "wss://api.testnet.rabbitx.io/ws";

export const marketIds = [
  "BTC-USD",
  "ETH-USD",
  "SOL-USD",
  "ARB-USD",
  "DOGE-USD",
  "LDO-USD",
  "SUI-USD",
  "PEPE1000-USD",
  "BCH-USD",
  "XRP-USD",
  "WLD-USD",
  "TON-USD",
  "STX-USD",
  "MATIC-USD",
  "TRB-USD",
  "APT-USD",
  "INJ-USD",
  "AAVE-USD",
  "LINK-USD",
  "BNB-USD",
  "RNDR-USD",
  "MKR-USD",
  "RLB-USD",
  "ORDI-USD",
  "STG-USD",
  "SATS1000000-USD",
  "TIA-USD",
  "BLUR-USD",
  "JTO-USD",
  "MEME-USD",
  "SEI-USD",
  "YES-USD",
  "WIF-USD",
  "STRK-USD",
  "SHIB1000-USD",
  "BOME-USD",
  "SLERF-USD",
  "W-USD",
  "ENA-USD",
  "PAC-USD",
  "MAGA-USD",
  "TRUMP-USD",
  "MOG1000-USD",
  "NOT-USD",
  "MOTHER-USD",
  "BONK1000-USD",
  "TAIKO-USD",
  "FLOKI1000-USD",
];

const subs = {};

export const orderbook = {
  bids: [],
  asks: [],
  sequence: null,
  timestamp: null,
  bidsLen: 0,
  asksLen: 0,
  disconnects: 0,
  marketId: null,
};

export const clearOrderBook = () => {
  orderbook.bids = [];
  orderbook.asks = [];
  orderbook.sequence = null;
  orderbook.timestamp = null;
  orderbook.bidsLen = 0;
  orderbook.asksLen = 0;
};

export const addToOrderBook = (ctx, group) => {
  // iterates through each of the entries in either the asks or bids array for the current update
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
  orderbook[group] = [...orderbook[group]];
};

export const checkIntegrity = (ctx) => {
  const prevSeq = orderbook.sequence;
  const newSeq = ctx.data.sequence;
  if (prevSeq && prevSeq + 1 != newSeq) {
    orderbook.disconnects += 1;
    return false;
  }
  orderbook.timestamp = ctx.data.timestamp;
  orderbook.sequence = newSeq;
  return true;
};

// let reconnectProc;

export const centrifuge = new Centrifuge(socket, {
  debug: true,
  // websocket: SockJS,
  // websocket: WebSocket,
});
centrifuge.setToken(token);

export const disconnect = () => {
  centrifuge.disconnect();
};

export const connectTo = (market) => {
  orderbook.marketId = market;
  if (market in subs) {
    subs[market].subscribe();
    return subs[market];
  } else {
    subs[market] = centrifuge.newSubscription(
      `orderbook:${orderbook.marketId}`,
    );
    orderbook.marketId = market;
  }
  subs[market].subscribe();
  return subs[market];
};

centrifuge.connect();
