import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useWebSocket } from './hooks/useWebSocket';
import { CustomerView } from './components/CustomerView';
import { BusinessDashboard } from './components/BusinessDashboard';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';

export default function App() {
  const envHost    = import.meta.env.VITE_BACKEND_URL;
  const host       = envHost || `${window.location.hostname}:8000`;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl      = `${wsProtocol}//${host}/ws/queue`;

  const { data: state, isConnected } = useWebSocket(wsUrl);
  const location = useLocation();

  const [isAdminAuthed, setIsAdminAuthed] = useState(
    () => Boolean(sessionStorage.getItem('queueless_admin_token'))
  );

  // Customer view is full-screen on "being served" — skip the shell header
  const isOnAdmin = location.pathname === '/admin';

  return (
    <div className="min-h-screen bg-[#f9f9fc]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-[#e2e2e5] sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <span className="text-lg">🎫</span>
            <span
              className="font-bold text-[20px] text-[#006356]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              QueueLess
            </span>

            {/* Live badge */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
              isConnected
                ? 'bg-[#10B981]/10 text-[#10B981]'
                : 'bg-[#F59E0B]/10 text-[#F59E0B]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#10B981] animate-pulse' : 'bg-[#F59E0B]'}`} />
              {isConnected ? 'Live' : 'Connecting'}
            </span>
          </Link>

          {/* Now serving chip (desktop) */}
          {state?.currently_serving && (
            <div className="hidden md:flex items-center gap-2 bg-[#d7e6e3] px-3 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006356] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006356]" />
              </span>
              <span className="text-[11px] font-bold text-[#006356] uppercase tracking-wide">Now Serving</span>
              <span
                className="text-[13px] font-extrabold text-[#006356]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {state.currently_serving.token}
              </span>
            </div>
          )}

          {/* Nav toggle */}
          <div className="flex items-center bg-[#f3f3f6] p-1 rounded-xl text-[12px] font-bold">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                location.pathname === '/'
                  ? 'bg-white text-[#006356] shadow-sm'
                  : 'text-[#6e7a76] hover:text-[#1a1c1e]'
              }`}
            >
              👤 Customer
            </Link>
            {isAdminAuthed && (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  location.pathname === '/admin'
                    ? 'bg-white text-[#006356] shadow-sm'
                    : 'text-[#6e7a76] hover:text-[#1a1c1e]'
                }`}
              >
                🖥️ Dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── ROUTES ─────────────────────────────────────────────────────── */}
      <main className={isOnAdmin ? '' : 'max-w-[1280px] mx-auto px-4 md:px-6'}>
        <Routes>
          <Route path="/" element={<CustomerView state={state} />} />
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute onAuth={() => setIsAdminAuthed(true)}>
                <BusinessDashboard state={state} />
              </AdminProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
