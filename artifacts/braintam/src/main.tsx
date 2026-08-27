import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { API_BASE } from "@/lib/api-base";

setBaseUrl(API_BASE);

setAuthTokenGetter(() => {
  const path = window.location.pathname;
  const isStaff = path.startsWith("/admin") || path.startsWith("/teacher") || path.startsWith("/mentor") || path.startsWith("/workplace");
  if (isStaff) return localStorage.getItem("braintam_staff_token");
  return localStorage.getItem("braintam_student_token");
});

if ("serviceWorker" in navigator) {
  const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
  navigator.serviceWorker
    .register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` })
    .then((registration) => {
      // Detect when a new SW finishes installing
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            window.dispatchEvent(new CustomEvent("swUpdate", { detail: "updateAvailable" }));
          }
        });
      });

      // Periodically check for a new SW version
      setInterval(() => registration.update(), 2 * 60 * 1000);
    })
    .catch(() => {});

  // Reload once the new SW takes control
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
