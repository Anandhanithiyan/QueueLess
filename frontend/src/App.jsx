import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useWebSocket } from './hooks/useWebSocket';
import { CustomerView } from './components/CustomerView';
import { BusinessDashboard } from './components/BusinessDashboard';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { LayoutGrid, User } from 'lucide-react';

export default function App() {
  // Dynamically resolve backend host for Local / Wi-Fi / Production deployments
  const envHost = import.meta.env.VITE_BACKEND_URL;
  const host = envHost || `${window.location.hostname}:8000`;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${host}/ws/queue`;

  const { data: state, isConnected } = useWebSocket(wsUrl);
  const location = useLocation();

  const [isAdminAuthed, setIsAdminAuthed] = useState(
  () => Boolean(sessionStorage.getItem('queueless_admin_token'))
);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-black text-2xl tracking-tight text-teal-600">
              Queue<span className="text-slate-900">Less</span>
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {isConnected ? 'Live' : 'Connecting'}
            </span>
          </Link>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                location.pathname === '/' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Customer
            </Link>
            {isAdminAuthed && (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  location.pathname === '/admin' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Route Views */}
      <main className="max-w-7xl mx-auto px-4 pt-6">
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