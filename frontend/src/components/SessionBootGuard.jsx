/**
 * frontend/src/components/SessionBootGuard.jsx
 * Defense-in-depth for session integrity AND the back/forward "random pages" bug.
 *
 * RULES (revised after UAT of the first epoch patch):
 *  1. DEAD TOKEN / IDENTITY MISMATCH (profile 401/403, or user_id != JWT claim):
 *     clearSession() + bounce to /login. The session is genuinely invalid.
 *  2. ROLE MISMATCH (valid shopper token on a /seller route, or vice versa —
 *     the classic Back-into-a-previous-role-history-entry case): DO NOT destroy
 *     the live session. Replace-navigate to the home of the role the session
 *     actually belongs to. This kills the "Back reaches history limit and I get
 *     logged out" failure and guarantees a wrong-role page NEVER mounts, so it
 *     can never fire role-scoped requests (the /catalog/my_listings/ 403s).
 *  3. BACKEND UNREACHABLE: fall back to the LOCAL session role for the role
 *     decision (never render wrong-role children), but do NOT lock the user out.
 *  4. HISTORY EPOCH: entries created before the current login (Back/Forward
 *     boots only) are replace-navigated to the role home; in-session entries are
 *     stamped with history.state.ffEpoch so normal Back/Forward keeps working.
 */
import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  clearSession,
  decodeClaims,
  getSession,
  getHistoryEpoch,
} from '../services/session.js';

const API_BASE_URL = String(
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
).replace(/\/+$/, '');

const ROLE_HOME = {
  shopper: '/shopper/dashboard',
  seller: '/seller/dashboard',
};

function homeFor(role) {
  return ROLE_HOME[String(role || '').toLowerCase()] || '/shopper/dashboard';
}

function readStateEpoch() {
  try {
    return (window.history.state && window.history.state.ffEpoch) || null;
  } catch {
    return null;
  }
}

function stampCurrentEntry(epoch) {
  try {
    window.history.replaceState(
      { ...window.history.state, ffEpoch: epoch },
      '',
    );
  } catch {
    // history.state unavailable: entry simply stays unstamped
  }
}

/** Consume the traverse signal and decide if THIS entry predates the login. */
function epochIsStale() {
  const epoch = getHistoryEpoch();
  const stateEpoch = readStateEpoch();
  const traverse = window.__FF_TRAVERSE_BOOT__ === true;
  // Consume for this document: later mounts are in-app navigations.
  window.__FF_TRAVERSE_BOOT__ = false;
  if (!epoch || stateEpoch === epoch) return { stale: false, epoch };
  if (traverse) return { stale: true, epoch };
  stampCurrentEntry(epoch); // fresh in-app entry: stamp it
  return { stale: false, epoch };
}

export default function SessionBootGuard({ children, requireRole = null }) {
  const location = useLocation();
  const [state, setState] = useState('checking'); // checking | ok | reset | bounce
  const [bounceTo, setBounceTo] = useState(null);
  // Avoid re-deciding the same pathname twice (StrictMode double effects).
  const decidedPathRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const session = getSession();

    if (!session || !session.access) {
      window.__FF_TRAVERSE_BOOT__ = false;
      setState('reset');
      return () => { cancelled = true; };
    }

    const localRole =
      session.user && session.user.role ? String(session.user.role) : null;

    function bounce(target) {
      if (decidedPathRef.current === location.pathname) return;
      decidedPathRef.current = location.pathname;
      setBounceTo(target);
      setState('bounce');
    }

    function finishOk() {
      if (decidedPathRef.current === location.pathname) {
        setState('ok');
        return;
      }
      const { stale, epoch } = epochIsStale();
      const target = homeFor(localRole || requireRole);
      if (stale && location.pathname !== target) {
        // Entry predates this login: replace it with the role home.
        decidedPathRef.current = location.pathname;
        setBounceTo(target);
        setState('bounce');
        return;
      }
      if (stale) stampCurrentEntry(epoch); // stale but already at home: keep it
      decidedPathRef.current = location.pathname;
      setState('ok');
    }

    fetch(`${API_BASE_URL}/profile/`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.access}`,
      },
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          // Dead or blacklisted token: the session is genuinely gone.
          clearSession();
          setState('reset');
          return;
        }
        const payload = await res.json().catch(() => null);
        const user = (payload && payload.user) || null;
        const claims = decodeClaims(session.access);
        const identityConsistent =
          user && claims && String(user.id) === String(claims.user_id);
        if (!identityConsistent) {
          clearSession();
          setState('reset');
          return;
        }
        // RULE 2: valid session, wrong role family for this route -> bounce,
        // NEVER clearSession. The wrong-role page must not mount.
        if (requireRole && user && user.role !== requireRole) {
          window.__FF_TRAVERSE_BOOT__ = false;
          bounce(homeFor(user.role));
          return;
        }
        finishOk();
      })
      .catch(() => {
        if (cancelled) return;
        // RULE 3: backend unreachable. Use the LOCAL role so a wrong-role page
        // can never mount and fire 403s; do not lock the user out otherwise.
        if (requireRole && localRole && localRole !== requireRole) {
          window.__FF_TRAVERSE_BOOT__ = false;
          bounce(homeFor(localRole));
          return;
        }
        finishOk();
      });

    return () => { cancelled = true; };
  }, [location.pathname, requireRole]);

  if (state === 'checking') return null; // splash
  if (state === 'reset') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (state === 'bounce' && bounceTo) {
    return <Navigate to={bounceTo} replace />;
  }
  return children;
}