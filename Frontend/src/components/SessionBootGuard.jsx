/**
 * frontend/src/components/SessionBootGuard.jsx
 * Defense-in-depth for the "refresh shows the previous user" bug.
 *
 * Lives in components/ (not services/) on purpose: it RENDERS (splash,
 * <Navigate>, children) and uses React hooks - services/ stays React-free.
 *
 * On every mount of a protected route it verifies that the persisted token
 * actually belongs to a real, consistent account (GET /profile/ with the
 * stored token; the token's user_id claim must equal the returned profile
 * id) and, when requireRole is given, that the role matches the route family
 * (FR-1.7 mirror in the UI). Any mismatch clears the session and bounces to
 * /login instead of rendering someone else's identity - the exact failure
 * mode seen at /seller/dashboard after a refresh with a shopper token.
 *
 * Self-contained on purpose: it talks to /profile/ with fetch() directly so
 * it never depends on the api client's import path or interceptors.
 *
 * Usage in the router (App.jsx):
 *   <SessionBootGuard requireRole="seller"><SellerDashboardPage /></SessionBootGuard>
 *   <SessionBootGuard><AccountPage /></SessionBootGuard>
 */
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { clearSession, decodeClaims, getSession } from '../services/session.js';

const API_BASE_URL = String(
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
).replace(/\/+$/, '');

export default function SessionBootGuard({ children, requireRole = null }) {
  const location = useLocation();
  const [state, setState] = useState('checking'); // checking | ok | reset

  useEffect(() => {
    let cancelled = false;
    const session = getSession();
    if (!session || !session.access) {
      setState('reset');
      return () => { cancelled = true; };
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
          // 401/403: stored token is dead or lacks the role -> start clean
          clearSession();
          setState('reset');
          return;
        }
        const payload = await res.json().catch(() => null);
        const user = (payload && payload.user) || null;
        const claims = decodeClaims(session.access);
        const identityConsistent =
          user && claims && String(user.id) === String(claims.user_id);
        const roleOk = !requireRole || (user && user.role === requireRole);
        if (!identityConsistent || !roleOk) {
          clearSession();
          setState('reset');
        } else {
          setState('ok');
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Backend unreachable: do NOT lock the user out; feature pages show
        // their own "cannot reach the backend" banner.
        setState('ok');
      });

    return () => { cancelled = true; };
  }, [location.pathname, requireRole]);

  if (state === 'checking') return null; // or your splash spinner
  if (state === 'reset') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}