import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import { OptionBDashboard } from "./pages/OptionBDashboard";
import { SecurityContextProvider } from "./context/useSecurityContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <SecurityContextProvider>
        <OptionBDashboard />
      </SecurityContextProvider>
    </Provider>
  </React.StrictMode>,
);
