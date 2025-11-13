import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeWhopThemeSync } from "./lib/theme-sync";

// Initialize Whop theme synchronization before React mounts
initializeWhopThemeSync().catch((error) => {
  console.error("Failed to initialize theme sync:", error);
});

createRoot(document.getElementById("root")!).render(<App />);
