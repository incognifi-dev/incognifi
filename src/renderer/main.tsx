import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Add error boundary and debugging for Windows issues
const rootElement = document.getElementById("root");

console.log("=== RENDERER DEBUG START ===");
console.log("Root element:", rootElement);
console.log("Document ready state:", document.readyState);
console.log("Window location:", window.location.href);
console.log("Navigator platform:", navigator.platform);

if (!rootElement) {
  console.error("❌ Root element not found!");
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif; background: red; color: white;">
      <h1>❌ Root Element Missing</h1>
      <p>Could not find #root element. This is a critical error.</p>
      <p>Platform: ${navigator.platform}</p>
      <p>User Agent: ${navigator.userAgent}</p>
    </div>
  `;
} else {
  console.log("✅ Root element found, initializing React app...");
  console.log("Platform:", navigator.platform);

  // Add global error handler
  window.addEventListener("error", (event) => {
    console.error("🚨 Global error:", event.error);
    console.error("Error details:", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("🚨 Unhandled promise rejection:", event.reason);
  });

  try {
    console.log("🔄 Creating React root...");
    const root = ReactDOM.createRoot(rootElement);
    console.log("🔄 Rendering App...");

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("✅ React app rendered successfully");
  } catch (error) {
    console.error("❌ Failed to render React app:", error);
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; background: orange; color: black;">
        <h1>❌ React Rendering Error</h1>
        <p>Failed to initialize the React application.</p>
        <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
        <p><strong>Platform:</strong> ${navigator.platform}</p>
        <p><strong>Stack:</strong></p>
        <pre style="background: white; padding: 10px; overflow: auto;">${
          error instanceof Error ? error.stack : "No stack trace"
        }</pre>
      </div>
    `;
  }
}

console.log("=== RENDERER DEBUG END ===");
