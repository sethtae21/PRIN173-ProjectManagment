import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// ============================================================================
// FIX (back/next "random pages" + stale bfcache):
// 1) If the browser restores a page from the Back-Forward Cache, we flag it
//    and force a fresh reload so React remounts and refetches real data.
// 2) We record whether THIS document boot was caused by a Back/Forward
//    traversal (bfcache flag or performance type "back_forward"). The
//    SessionBootGuard uses that signal + the login "history epoch" to bounce
//    history entries that were created BEFORE the current login.
// 3) Any programmatic history.pushState (in-app link navigation) clears the
//    traverse signal, so normal SPA navigation is never mistaken for Back.
// ============================================================================
const TRAVERSE_FLAG_KEY = "fitfusion.nav.traverse";

(function markTraverseBoot() {
  let traverse = false;
  try {
    if (window.sessionStorage.getItem(TRAVERSE_FLAG_KEY)) {
      window.sessionStorage.removeItem(TRAVERSE_FLAG_KEY);
      traverse = true;
    } else {
      const entry = performance.getEntriesByType("navigation")[0];
      if (entry && entry.type === "back_forward") traverse = true;
    }
  } catch {
    // storage/performance unavailable: treat as normal boot
  }
  window.__FF_TRAVERSE_BOOT__ = traverse;

  const originalPush = window.history.pushState.bind(window.history);
  window.history.pushState = function (...args) {
    window.__FF_TRAVERSE_BOOT__ = false;
    return originalPush(...args);
  };
})();

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    try {
      window.sessionStorage.setItem(TRAVERSE_FLAG_KEY, "1");
    } catch {
      // ignore
    }
    window.location.reload();
  }
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);