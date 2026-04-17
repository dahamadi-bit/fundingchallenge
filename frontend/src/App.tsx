import React from "react";
import { EngineProvider } from "./context/EngineContext";
import { Dashboard } from "./pages/Dashboard";

function App() {
  return (
    <EngineProvider>
      <Dashboard />
    </EngineProvider>
  );
}

export default App;
