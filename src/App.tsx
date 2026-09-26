import "./App.css";
import { Dummy } from "ufodb-design-system";
import init, { Counter } from "../wasm/pkg/wasm.js";
import { useEffect, useRef, useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  const [wasmReady, setWasmReady] = useState(false);
  const counterRef = useRef<Counter | null>(null);

  useEffect(() => {
    init().then(() => {
      counterRef.current = new Counter();
      setWasmReady(true);
    });
  }, []);

  const handleClick = () => {
    const counter = counterRef.current;

    if (!counter) {
      return;
    }

    counter.increment();
    setCount(counter.value());
  };

  return (
    <section id="center">
      {!wasmReady && (
        <p>Now Loading...</p>
      )}

      <Dummy label="UFO DB Playground"/>

      {wasmReady && (
        <>

          <p>Count : {count}</p>

          <button onClick={handleClick}>+1</button>
        </>
      )}
    </section>
  );
}

export default App;
