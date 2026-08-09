import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

export function AdminProtectedRoute({ children, onAuth }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('queueless_admin_auth') === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const ADMIN_PASSCODE = '1234';

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === ADMIN_PASSCODE) {
      sessionStorage.setItem('queueless_admin_auth', 'true');
      setIsAuthenticated(true);
      setError('');
      onAuth && onAuth(); // notify App to show Dashboard tab
    } else {
      setError('Invalid passcode. Access denied.');
    }
  };

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="max-w-sm mx-auto mt-16 p-8 bg-white rounded-2xl shadow-xl border border-slate-100 text-center">
      <div className="inline-flex p-4 bg-teal-50 rounded-2xl text-teal-600 mb-4">
        <Lock className="w-9 h-9" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800">Staff Access</h2>
      <p className="text-sm text-slate-500 mt-1 mb-6">Enter your staff passcode to open the dashboard</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="••••"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-center text-2xl font-mono tracking-[0.5em]"
            autoFocus
          />
          {error && <p className="text-xs text-rose-500 mt-2 font-medium">{error}</p>}
        </div>

        <button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
        >
          Access Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </form>
      <p className="text-[11px] text-slate-400 mt-4">Only authorised staff (doctors, receptionists) may access this area.</p>
    </div>
  );
}
