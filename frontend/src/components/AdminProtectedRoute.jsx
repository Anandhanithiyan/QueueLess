import React, { useState } from 'react';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';

const getApiBase = () => {
  const envHost = import.meta.env.VITE_BACKEND_URL;
  if (envHost) {
    return `https://${envHost}/api`;
  }
  return `http://${window.location.hostname}:8000/api`;
};

const API_BASE = getApiBase();

export function AdminProtectedRoute({ children, onAuth }) {

  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(sessionStorage.getItem('queueless_admin_token'))
  );

  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {

    e.preventDefault();

    if (!passcode) {
      setError('Please enter the staff password.');
      return;
    }

    setLoading(true);
    setError('');

    try {

      const response = await fetch(
        `${API_BASE}/admin/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            password: passcode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || 'Invalid password.'
        );
      }

      sessionStorage.setItem(
        'queueless_admin_token',
        data.token
      );

      setIsAuthenticated(true);

      if (onAuth) {
        onAuth();
      }

    } catch (err) {

      setError(
        err.message || 'Unable to login.'
      );

    } finally {

      setLoading(false);

    }
  };

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">

      <div className="w-full max-w-md">

        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl p-8">

          <div className="flex justify-center mb-5">

            <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center">

              <Lock className="w-7 h-7 text-teal-700" />

            </div>

          </div>

          <div className="text-center mb-7">

            <h2 className="text-2xl font-extrabold text-slate-900">
              Staff Access
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              Enter your staff password to open the dashboard
            </p>

          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >

            <div>

              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-center text-lg"
                autoFocus
                disabled={loading}
              />

              {error && (
                <p className="text-xs text-rose-500 mt-2 font-medium text-center">
                  {error}
                </p>
              )}

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
            >

              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Access Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}

            </button>

          </form>

          <p className="text-[11px] text-slate-400 mt-4 text-center">
            Authorised staff only
          </p>

        </div>

      </div>

    </div>
  );
}
