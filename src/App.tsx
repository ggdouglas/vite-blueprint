import { useState } from "react";
import blueprintLogo from "./assets/blueprint.svg";
import viteLogo from "/vite.svg";
import "./App.scss";
import { Button, Intent } from "@blueprintjs/core";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://blueprintjs.com" target="_blank">
          <img
            src={blueprintLogo}
            className="logo blueprint"
            alt="Blueprint logo"
          />
        </a>
      </div>
      <h1>Vite + Blueprint</h1>
      <div className="card">
        <Button
          intent={Intent.PRIMARY}
          onClick={() => setCount((count) => count + 1)}
        >
          count is {count}
        </Button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and Blueprint logos to learn more
      </p>
    </>
  );
}

export default App;
