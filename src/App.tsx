import "./App.css";
import { Dummy } from "ufodb-design-system";
import init, { add } from "../wasm/pkg/wasm.js";
import { useEffect, useState } from "react";

function App() {
  const [wasmReady, setWasmReady] = useState(false);

  useEffect(() => {
    init().then(() => setWasmReady(true));
  }, []);

  return (
    <section id="center">
      <Dummy label="UFODB Playground" />

      {wasmReady ? (
        <p>
          a + b = {add(1, 2)}
        </p>
      ) : (
        <p>WASMを読み込み中...</p>
      )}
    </section>
  );
}

export default App;
