import { useState, useEffect, useRef } from "react";
import {
  marketIds,
  connectTo,
  disconnectFrom,
  orderbook,
  checkIntegrity,
  addToOrderBook,
  centrifuge,
} from "./helper";
import "./App.css";

function App() {
  const canvasRef = useRef(null);
  const [market, setMarket] = useState("");
  const [asks, setAsks] = useState([]);
  const [bids, setBids] = useState([]);
  const [marketRates, setMarketRates] = useState([]);
  const [sub, setSub] = useState();

  useEffect(() => {
    if (market) {
      setSub(connectTo(market));
      setMarketRates([]);
    }
  }, [market]);

  useEffect(() => {
    if (sub) {
      sub.on("subscribed", (ctx) => {
        // Fills the orderbook object with the values the orderbook received from the server
        orderbook.bids = ctx.data.bids;
        orderbook.asks = ctx.data.asks;
        orderbook.sequence = ctx.data.sequence;
        orderbook.timestamp = ctx.data.timestamp;
        orderbook.bidsLen = orderbook.bids.length;
        orderbook.asksLen = orderbook.asks.length;
        setAsks(orderbook.asks);
        setBids(orderbook.bids);
        console.log(orderbook);
      });

      sub.on("publication", (ctx) => {
        // Updates the orderbook object every time an update is made
        const good = checkIntegrity(ctx);
        if (!good) {
          sub.unsubscribe();
          sub.removeAllListeners();
          setSub(connectTo(market));
          return;
        }
        addToOrderBook(ctx, "asks");
        addToOrderBook(ctx, "bids");
        setAsks(orderbook.asks);
        setBids(orderbook.bids);
        if (orderbook.asks.length && orderbook.bids.length) {
          const high = parseFloat(orderbook.asks[0][0]);
          const low = parseFloat(orderbook.bids[orderbook.bids.length - 1][0]);
          setMarketRates((arr) => [(high + low) / 2, ...arr].slice(0, 250));
        }
      });
    }
  }, [sub]);

  useEffect(() => {
    // useEffect to handle logic for graph showing market price over last 100 transactions
    const canvas = canvasRef.current;
    // console.log(marketRates);

    const context = canvas.getContext("2d");

    if (asks.length && bids.length) {
      canvas.width = 500;
      canvas.height = 250;
      context.strokeStyle = "#ddf";
      context.fillStyle = "#ddf";

      const avg =
        marketRates.reduce((accum, curr) => {
          return accum + curr;
        }, 0) / marketRates.length;

      // determine upper and lower bounds of graph
      let sig = Math.log10(avg);
      let prec = Math.pow(10, sig - 3);
      let graphMax = avg + 3 * prec;
      let graphMin = avg - 3 * prec;

      // round y axis labels appropriately
      if (avg > 100) {
        context.fillText(Math.round(graphMax / 10) * 10, 3, 10);
        context.fillText(Math.round(graphMin / 10) * 10, 3, canvas.height - 3);
      } else if (avg > 1) {
        context.fillText(graphMax.toFixed(2), 3, 10);
        context.fillText(graphMin.toFixed(2), 3, canvas.height - 3);
      } else {
        context.fillText(graphMax.toFixed(-(sig - 4)), 3, 10);
        context.fillText(graphMin.toFixed(-(sig - 4)), 3, canvas.height - 3);
      }

      // calculate starting point of graph (marketRates is in time reversed order)
      const time = canvas.width / (marketRates.length - 1);
      const startValue = marketRates[marketRates.length - 1];
      const startPoint = 0;

      context.beginPath();

      context.moveTo(startPoint, startValue);

      // iterate through marketRates array to display rates during last 250 sequences
      marketRates.toReversed().forEach((rate, idx) => {
        const newTime = startPoint + time * idx;
        context.lineTo(
          newTime,
          canvas.height -
            ((rate - graphMin) / (graphMax - graphMin)) * canvas.height,
        );
      });

      context.stroke();

      context.closePath();
    }
  }, [marketRates]);

  const changeMarket = (e) => {
    // when a new market is selected, disconnect from the current market, and then set the new market with a useState
    e.stopPropagation();
    disconnectFrom(market);
    setMarket(e.target.value);
  };

  return (
    <>
      <header>
        <select value={market} onChange={changeMarket} placeholder="---">
          <option disabled value="">
            Choose A currency...
          </option>
          {marketIds.map((marketId) => (
            <option key={marketId}>{marketId}</option>
          ))}
        </select>
        <h1>{market ? market : "Orderbooks"}</h1>
      </header>
      <div className="card">
        <div className="asks">
          <table>
            <thead>
              <tr>
                <th>Price</th>
                <th>Amount</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {asks
                .map((ask, idx) => (
                  <tr key={ask[0]}>
                    <td>{ask[0]}</td>
                    <td>{ask[1]}</td>
                    <td>
                      {asks
                        .slice(0, idx + 1)
                        .reduce((accum, curr) => {
                          return accum + parseFloat(curr[1]);
                        }, 0)
                        .toFixed(4)}
                    </td>
                  </tr>
                ))
                .toReversed()}
            </tbody>
          </table>
        </div>
        {marketRates.length ? (
          <h4
            className={
              marketRates.reduce((accum, curr) => {
                return accum + curr;
              }, 0) /
                marketRates.length <
              marketRates[0]
                ? "bullish"
                : marketRates.reduce((accum, curr) => {
                      return accum + curr;
                    }, 0) /
                      marketRates.length ===
                    marketRates[0]
                  ? "neutral"
                  : "bearish"
            }
          >
            ${marketRates[marketRates.length - 1]}
          </h4>
        ) : null}
        <canvas ref={canvasRef} />
        <div className="bids">
          <table>
            <thead>
              <tr>
                <th>Price</th>
                <th>Amount</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {bids.toReversed().map((bid, idx) => (
                <tr key={bid[0]}>
                  <td>{bid[0]}</td>
                  <td>{bid[1]}</td>
                  <td>
                    {bids
                      .toReversed()
                      .slice(0, idx + 1)
                      .reduce((accum, curr) => {
                        return accum + parseFloat(curr[1]);
                      }, 0)
                      .toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default App;
