import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
setBaseUrl(`${BASE}/api`);

setAuthTokenGetter(() => {
  const path = window.location.pathname;
  const isStaff = path.startsWith("/admin") || path.startsWith("/teacher");
  if (isStaff) return localStorage.getItem("braintam_staff_token");
  return localStorage.getItem("braintam_student_token");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
