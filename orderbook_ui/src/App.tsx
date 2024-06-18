import { useRef, useEffect } from "react";
import "./App.css";

function App() {
  const canvasRef = useRef();

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "rgba(25, 255, 85, .25)";
    ctx.fillRect(10, 10, 150, 100);
  }, [canvasRef]);

  return (
    <>
      <canvas ref={canvasRef} />
    </>
  );
}

export default App;
