import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import { marketIds, centrifuge } from "./helper";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  const [market, setMarket] = useState();

  useEffect(() => {
    let marketSub;
    if (market) {
      if (marketSub) {
        marketSub.unsubscribe();
      }
      marketSub = centrifuge.newSubscription(`orderbook:${market}`);
    }
    return () => {
      if (marketSub) {
        marketSub.unsubscribe();
      }
    };
  }, [market]);

  const changeMarket = (e) => {
    e.stopPropagation();
    setMarket(e.target.value);
  };

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <select value={market} onChange={changeMarket}>
          {marketIds.map((marketId) => (
            <option key={marketId}>{marketId}</option>
          ))}
        </select>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
