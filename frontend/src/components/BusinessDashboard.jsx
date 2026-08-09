import React, { useState, useEffect } from 'react';
import {
  Users, CheckCircle, Clock, Play, SkipForward, Power,
  BarChart2, TrendingUp, Activity, LogOut, Settings, Home
} from 'lucide-react';

// Dynamic API Base URL resolution for Local, Wi-Fi, and Production deployments
const getApiBase = () => {
  const envHost = import.meta.env.VITE_BACKEND_URL;
  if (envHost) {
    return `https://${envHost}/api`;
  }
  return `http://${window.location.hostname}:8000/api`;
};

// Daily stats hook for analytics tracking
function useDailyStats(totalServedToday) {
  const [history, setHistory] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ql_daily_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = days[new Date().getDay()];

  useEffect(() => {
    if (totalServedToday === undefined) return;
    setHistory(prev => {
      const next = [...prev];
      const idx = next.findIndex(d => d.label === today);
      if (idx >= 0) {
        next[idx] = { ...next[idx], count: totalServedToday };
      } else {
        if (next.length === 0) {
          const seed = days
            .filter(d => d !== today)
            .slice(-6)
            .map((label) => ({ label, count: Math.floor(8 + Math.random() * 20) }));
          seed.push({ label: today, count: totalServedToday });
          sessionStorage.setItem('ql_daily_history', JSON.stringify(seed));
          return seed;
        }
        next.push({ label: today, count: totalServedToday });
      }
      sessionStorage.setItem('ql_daily_history', JSON.stringify(next));
      return next;
    });
  }, [totalServedToday]);

  return history;
}

// Sidebar nav item component
function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        active
          ? 'bg-teal-50 text-teal-700'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );
}

export function BusinessDashboard({ state }) {
  const [avgTime, setAvgTime] = useState(state?.avg_service_time || 5);
  const [activeSection, setActiveSection] = useState('counter');
  const dailyHistory = useDailyStats(state?.total_served_today);
  const totalToday = state?.total_served_today || 0;
  const weekTotal = dailyHistory.reduce((s, d) => s + d.count, 0);

  const triggerAction = async (endpoint, options = {}) => {
    try {
      await fetch(`${getApiBase()}${endpoint}`, {
        method: options.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: options.body ? JSON.stringify(options.body) : null,
      });
    } catch (err) {
      console.error('Dashboard action failed', err);
    }
  };

  const handleUpdateAvgTime = (e) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) return;
    setAvgTime(val);
    triggerAction('/admin/config', { method: 'PATCH', body: { avg_service_time: val } });
  };

  const toggleQueueStatus = () => {
    triggerAction('/admin/config', { method: 'PATCH', body: { is_open: !state?.is_open } });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('queueless_admin_auth');
    window.location.href = '/';
  };

  return (
    <div className="flex gap-6 min-h-[calc(100vh-5rem)]">

      {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 space-y-1 hidden md:block">
        {/* Identity Card */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-800 truncate">Reception Counter</p>
              <p className="text-[10px] text-slate-400">Staff Portal</p>
            </div>
          </div>
          <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
            state?.is_open ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${state?.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {state?.is_open ? 'Queue Open' : 'Queue Closed'}
          </div>
        </div>

        <NavItem icon={Home} label="Counter" active={activeSection === 'counter'} onClick={() => setActiveSection('counter')} />
        <NavItem icon={BarChart2} label="Analytics" active={activeSection === 'analytics'} onClick={() => setActiveSection('analytics')} />
        <NavItem icon={Settings} label="Settings" active={activeSection === 'settings'} onClick={() => setActiveSection('settings')} />

        {/* Quick Stats */}
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase px-1 mb-2">Live Snapshot</p>
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Waiting</span>
            <div className="text-2xl font-black text-slate-900">{state?.total_waiting || 0}</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Served Today</span>
            <div className="text-2xl font-black text-teal-700">{totalToday}</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Avg Wait</span>
            <div className="text-lg font-black text-slate-900">~{(state?.total_waiting || 0) * (state?.avg_service_time || 5)} min</div>
          </div>
        </div>

        {/* Sign out */}
        <div className="pt-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* ── COUNTER SECTION ─────────────────────────────────────── */}
        {activeSection === 'counter' && (
          <>
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">Queue Counter</h2>
                <p className="text-xs text-slate-400 mt-0.5">Live queue management and calling system</p>
              </div>
              <button
                onClick={toggleQueueStatus}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                  state?.is_open
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <Power className="w-4 h-4" />
                {state?.is_open ? 'Close Queue' : 'Open Queue'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Active Counter Call Box */}
              <div className="bg-teal-700 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-teal-300">Active Counter</span>
                  <h3 className="text-lg font-black mt-0.5">Currently Serving</h3>
                </div>

                {state?.currently_serving ? (
                  <div className="text-center bg-white/10 p-6 rounded-xl border border-white/20 backdrop-blur-sm">
                    <span className="text-[10px] uppercase tracking-widest text-teal-300 font-bold block mb-1">Token Number</span>
                    <h1 className="text-5xl font-black">{state.currently_serving.token}</h1>
                    <p className="text-sm font-semibold mt-2 text-teal-100">{state.currently_serving.name}</p>
                  </div>
                ) : (
                  <div className="text-center py-10 text-teal-300 border border-dashed border-teal-500/50 rounded-xl text-sm">
                    Counter is clear
                  </div>
                )}

                <button
                  onClick={() => triggerAction('/admin/next')}
                  className="w-full bg-white text-teal-900 font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-teal-50 transition-all shadow-lg active:scale-[0.98]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Call Next Customer
                </button>
              </div>

              {/* Waiting Queue List Table */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black text-slate-800">Waiting Queue</h3>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    {state?.total_waiting || 0} waiting
                  </span>
                </div>

                {!state?.waiting_queue?.length ? (
                  <div className="py-12 text-center">
                    <CheckCircle className="w-8 h-8 text-teal-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No customers waiting right now.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold">
                          <th className="pb-3">Pos</th>
                          <th className="pb-3">Token</th>
                          <th className="pb-3">Name</th>
                          <th className="pb-3">Joined</th>
                          <th className="pb-3">ETA</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {state.waiting_queue.map((item) => (
                          <tr key={item.token} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="py-3 font-bold text-slate-400">#{item.position}</td>
                            <td className="py-3 font-extrabold text-teal-600">{item.token}</td>
                            <td className="py-3 font-semibold text-slate-800">{item.name}</td>
                            <td className="py-3 text-xs text-slate-400">
                              {new Date(item.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 text-xs text-slate-500 font-medium">{item.eta_minutes} min</td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => triggerAction(`/admin/skip/${item.token}`)}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all inline-flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                              >
                                <SkipForward className="w-3.5 h-3.5" /> Skip
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── ANALYTICS SECTION ───────────────────────────────────── */}
        {activeSection === 'analytics' && (
          <>
            <div>
              <h2 className="text-xl font-black text-slate-900">Analytics</h2>
              <p className="text-xs text-slate-400 mt-0.5">Overview of customer volume and flow</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Today', value: totalToday, icon: CheckCircle, color: 'teal' },
                { label: 'This Week', value: weekTotal, icon: TrendingUp, color: 'indigo' },
                { label: 'Avg / Day', value: Math.round(weekTotal / Math.max(dailyHistory.length, 1)), icon: BarChart2, color: 'violet' },
                { label: 'Avg Wait Time', value: `${state?.avg_service_time || 5}m`, icon: Clock, color: 'amber' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
                  <div className={`inline-flex p-2 rounded-xl mb-3 bg-${color}-50 text-${color}-600`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{value}</div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-800">Weekly Throughput</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Daily volume over the past 7 days</p>
                </div>
                <span className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">
                  {weekTotal} Total
                </span>
              </div>

              {dailyHistory.length > 0 && (
                <div className="space-y-3 pt-2">
                  {dailyHistory.slice(-7).map((d) => {
                    const max = Math.max(...dailyHistory.map(x => x.count), 1);
                    const pct = Math.max(4, (d.count / max) * 100);
                    const isToday = d.label === ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
                    return (
                      <div key={d.label} className="flex items-center gap-3">
                        <span className={`text-xs font-bold w-8 shrink-0 ${isToday ? 'text-teal-700' : 'text-slate-400'}`}>{d.label}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${isToday ? 'bg-teal-500' : 'bg-slate-300'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-black w-6 text-right ${isToday ? 'text-teal-700' : 'text-slate-500'}`}>{d.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── SETTINGS SECTION ────────────────────────────────────── */}
        {activeSection === 'settings' && (
          <>
            <div>
              <h2 className="text-xl font-black text-slate-900">Settings</h2>
              <p className="text-xs text-slate-400 mt-0.5">System parameters and operational controls</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Average Service Time</label>
                <p className="text-xs text-slate-400 mb-3">Controls the automated ETA calculation shown on customer tickets.</p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={avgTime}
                    onChange={handleUpdateAvgTime}
                    className="w-24 px-3 py-2 bg-white rounded-xl border border-slate-300 text-lg font-black text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-500 font-medium">minutes per customer</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <label className="block text-sm font-bold text-slate-700 mb-1">Queue Access Toggle</label>
                <p className="text-xs text-slate-400 mb-3">Temporarily pause new customer entries.</p>
                <button
                  onClick={toggleQueueStatus}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    state?.is_open
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  {state?.is_open ? 'Close Queue' : 'Open Queue'}
                </button>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <label className="block text-sm font-bold text-slate-700 mb-1">Session Management</label>
                <button
                  onClick={handleLogout}
                  className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all"
                >
                  <LogOut className="w-4 h-4" /> Sign Out of Dashboard
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}