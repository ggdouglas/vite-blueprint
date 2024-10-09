import "./App.scss";
import { Sandpack } from "@codesandbox/sandpack-react";

const app = `import { Button } from '@blueprintjs/core'

export default function App() {
  return (
    <Button intent="primary">
      Hello World
    </Button>
  );
}`;

const index = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FocusStyleManager } from "@blueprintjs/core";
import "./styles.css";

import App from "./App";
import React from "react";

import "@blueprintjs/core/lib/css/blueprint.css";

FocusStyleManager.onlyShowFocusOnTabs();

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

function App() {
  return (
    <Sandpack
      template="react-ts"
      theme="auto"
      options={{ visibleFiles: ["/App.tsx"] }}
      customSetup={{
        dependencies: {
          "@blueprintjs/core": "^5.13.1",
        },
      }}
      files={{
        "/App.tsx": app,
        "/index.tsx": index,
      }}
    />
  );
}

export default App;
