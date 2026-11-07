/**
 * frontend/src/components/AuthenticatedBounce.jsx
 *
 * PURPOSE (post-login Back-arrow policy):
 * After a successful login the shopper/seller must NEVER be able to Back/Forward
 * into the pre-login public flow (landing "/", "/login", "/signup",
 * "/signup/shopper", "/signup/seller", "/forgot-password"). Browsers forbid
 * deleting history entries or disabling the Back button, so the standard
 * equivalent is used: any of those routes, while a session exists, is
 * replace-bounced to the role dashboard with window.location.replace().
 * Because replace() SWAPS the history entry, each press of Back converts one
 * old public entry into a dashboard entry — the public pages become
 * unreachable while authenticated, yet in-app Back/Forward between protected
 * pages (epoch-stamped entries) keeps working exactly as before.
 *
 * When NO session exists (logged out / guest browsing before login) this
 * component renders its children untouched, so the public flow is unchanged.
 *
 * Service rule: renders null while bouncing (no flash of the public page).
 */
import { useEffect, useState } from "react";
import { getSession } from "../services/session";

const ROLE_HOME = {
  shopper: "/shopper/dashboard",
  seller: "/seller/dashboard",
};

export default function AuthenticatedBounce({ children = null }) {
  // Synchronous check so the very first paint never flashes the public page.
  const [blocked] = useState(() => {
    const session = getSession();
    return Boolean(session && session.access);
  });

  useEffect(() => {
    if (!blocked) return;
    const session = getSession();
    const role =
      session && session.user && session.user.role === "seller"
        ? "seller"
        : "shopper";
    // replace(): swaps this history entry so the public page cannot be
    // restored again via Back/Forward or bfcache.
    window.location.replace(ROLE_HOME[role]);
  }, [blocked]);

  if (blocked) return null;
  return children;
}