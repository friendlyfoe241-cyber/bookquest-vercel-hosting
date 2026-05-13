import { createRoot } from "react-dom/client";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import App from "./App.tsx";
import "./index.css";

type RuntimeWindow = Window & {
  __BOOKQUEST_RUNTIME_LOGGER__?: boolean;
};

const runtimeWindow = window as RuntimeWindow;

if (!runtimeWindow.__BOOKQUEST_RUNTIME_LOGGER__) {
  runtimeWindow.__BOOKQUEST_RUNTIME_LOGGER__ = true;

  window.addEventListener("error", (event) => {
    console.error("Global runtime error:", event.error ?? event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
  });
}

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
