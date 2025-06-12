import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/common.css";
import "./styles/chatroom.css";

// React 18 root API
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
