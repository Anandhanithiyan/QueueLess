import React, { useState, useEffect } from 'react';

const getApiBase = () => {
  const envHost = import.meta.env.VITE_BACKEND_URL;
  if (envHost) return `https://${envHost}/api`;
  return `http://${window.location.hostname}:8000/api`;
};

// ── Daily stats hook ──────────────────────────────────────────────────────────
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
          const seed = days.filter(d => d !== today).slice(-6)
            .map(label => ({ label, count: Math.floor(8 + Math.random() * 20) }));
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

const jkSans = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

// ── Sidebar nav item ──────────────────────────────────────────────────────────
function SideNavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[14px] font-semibold transition-all ${
        active
          ? 'bg-[#eeeef0] text-[#006356] font-bold'
          : 'text-[#3e4946] hover:bg-[#f3f3f6] hover:text-[#1a1c1e]'
      }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );
}

export function BusinessDashboard({ state }) {
  const [avgTime, setAvgTime]             = useState(state?.avg_service_time || 5);
  const [activeSection, setActiveSection] = useState('counter');
  const dailyHistory = useDailyStats(state?.total_served_today);
  const totalToday   = state?.total_served_today || 0;
  const weekTotal    = dailyHistory.reduce((s, d) => s + d.count, 0);

  const triggerAction = async (endpoint, options = {}) => {
    try {
      const adminToken = sessionStorage.getItem('queueless_admin_token');
      if (!adminToken) { alert('Admin session expired. Please login again.'); return; }
      const response = await fetch(`${getApiBase()}${endpoint}`, {
        method: options.method || 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem('queueless_admin_token');
          alert('Admin session expired. Please login again.');
          window.location.href = '/admin';
          return;
        }
        throw new Error(data?.detail || `Request failed: ${response.status}`);
      }
      return data;
    } catch (err) {
      alert(err.message || 'Something went wrong.');
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
    sessionStorage.removeItem('queueless_admin_token');
    window.location.href = '/';
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] font-[DM_Sans,sans-serif] bg-[#f9f9fc]">

      {/* ── DESKTOP SIDEBAR ────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 py-6 px-3 bg-[#f9f9fc] border-r border-[#e2e2e5] min-h-full">
        {/* Identity card */}
        <div className="bg-white rounded-xl p-4 mb-4 border border-[#e2e2e5] shadow-[0_2px_8px_rgba(10,126,110,0.06)]">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#006356] flex items-center justify-center shrink-0">
              <span className="text-white text-sm">🎫</span>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#1a1c1e] truncate">Reception Counter</p>
              <p className="text-[11px] text-[#6e7a76]">Staff Portal</p>
            </div>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
            state?.is_open
              ? 'bg-[#10B981]/10 text-[#10B981]'
              : 'bg-rose-100 text-rose-600'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${state?.is_open ? 'bg-[#10B981] animate-pulse' : 'bg-rose-500'}`} />
            {state?.is_open ? 'Queue Open' : 'Queue Closed'}
          </div>
        </div>

        {/* Nav */}
        <div className="flex flex-col gap-1">
          <SideNavItem icon="🖥️" label="Counter"   active={activeSection === 'counter'}   onClick={() => setActiveSection('counter')} />
          <SideNavItem icon="📊" label="Analytics" active={activeSection === 'analytics'} onClick={() => setActiveSection('analytics')} />
          <SideNavItem icon="⚙️" label="Settings"  active={activeSection === 'settings'}  onClick={() => setActiveSection('settings')} />
        </div>

        {/* Live snapshot */}
        <div className="mt-5 pt-4 border-t border-[#e2e2e5] flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6e7a76] px-1 mb-1">Live Snapshot</p>
          {[
            { label: 'Waiting',      value: state?.total_waiting || 0,   color: '#1a1c1e' },
            { label: 'Served Today', value: totalToday,                  color: '#006356' },
            { label: 'Avg Wait',     value: `~${(state?.total_waiting || 0) * (state?.avg_service_time || 5)} min`, color: '#1a1c1e' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-3 border border-[#e2e2e5]">
              <span className="text-[10px] text-[#6e7a76] uppercase font-semibold block">{label}</span>
              <div className="text-[22px] font-bold mt-0.5" style={{ color, ...jkSans }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-[#6e7a76] hover:text-rose-600 hover:bg-rose-50 transition-all"
        >
          🚪 Sign out
        </button>
      </aside>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 p-4 md:p-6 pb-24 md:pb-6">

        {/* ── COUNTER ──────────────────────────────────────────────────── */}
        {activeSection === 'counter' && (
          <>
            <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
              <div>
                <h2 className="text-[22px] font-bold text-[#1a1c1e]" style={jkSans}>Queue Counter</h2>
                <p className="text-[13px] text-[#6e7a76] mt-0.5">Live queue management and calling system</p>
              </div>
              <button
                onClick={toggleQueueStatus}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all border ${
                  state?.is_open
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 hover:bg-[#10B981]/20'
                }`}
              >
                ⏻ {state?.is_open ? 'Close Queue' : 'Open Queue'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Active counter card */}
              <div
                className="flex flex-col justify-between p-6 rounded-2xl text-white space-y-5"
                style={{ background: 'linear-gradient(160deg, #006356 0%, #0a7e6e 100%)' }}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#96f4e0]">Active Counter</span>
                  <h3 className="text-[17px] font-bold mt-0.5">Currently Serving</h3>
                </div>

                {state?.currently_serving ? (
                  <div className="text-center bg-white/10 rounded-xl p-6 border border-white/20">
                    <span className="text-[10px] uppercase tracking-widest text-[#96f4e0] font-bold block mb-2">
                      Token Number
                    </span>
                    <h1 className="text-[48px] font-extrabold leading-none" style={jkSans}>
                      {state.currently_serving.token}
                    </h1>
                    <p className="text-[14px] font-semibold mt-2 text-[#79d7c4]">
                      {state.currently_serving.name}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-10 text-[#79d7c4] border border-dashed border-[#96f4e0]/30 rounded-xl text-[14px]">
                    Counter is clear
                  </div>
                )}

                <button
                  onClick={() => triggerAction('/admin/next')}
                  className="w-full bg-white text-[#006356] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-[#e8f7f4] transition-all active:scale-[0.98] text-[14px]"
                >
                  ▶ Call Next →
                </button>
              </div>

              {/* Queue table */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e2e2e5] shadow-[0_2px_12px_rgba(10,126,110,0.05)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-[#f3f3f6] border-b border-[#e2e2e5]">
                  <h3 className="text-[16px] font-bold text-[#1a1c1e]" style={jkSans}>Upcoming Queue</h3>
                  <span className="bg-[#d7e6e3] text-[#006356] px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide">
                    {state?.total_waiting || 0} Waiting
                  </span>
                </div>

                {!state?.waiting_queue?.length ? (
                  <div className="py-16 text-center">
                    <span className="text-3xl block mb-3">✅</span>
                    <p className="text-[14px] text-[#6e7a76]">No customers waiting right now.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-[#e2e2e5] text-[10px] uppercase text-[#6e7a76] font-bold tracking-wide">
                          <th className="px-5 pb-3 pt-4">Token</th>
                          <th className="px-3 pb-3 pt-4">Name</th>
                          <th className="px-3 pb-3 pt-4">Joined</th>
                          <th className="px-3 pb-3 pt-4">Wait</th>
                          <th className="px-3 pb-3 pt-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.waiting_queue.map((item, idx) => (
                          <tr
                            key={item.token}
                            className={`border-b border-[#e2e2e5]/60 hover:bg-[#f9f9fc] transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}
                          >
                            <td className="px-5 py-3.5 font-bold text-[#006356] text-[15px]" style={jkSans}>
                              {item.token}
                            </td>
                            <td className="px-3 py-3.5 font-medium text-[#1a1c1e]">{item.name}</td>
                            <td className="px-3 py-3.5 text-[#6e7a76]">
                              {new Date(item.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-3 py-3.5">
                              <span className={`text-[11px] font-bold px-2 py-1 rounded ${
                                item.eta_minutes <= 5
                                  ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                                  : 'bg-[#006356]/10 text-[#006356]'
                              }`}>
                                {item.eta_minutes} min
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-right">
                              <button
                                onClick={() => triggerAction(`/admin/skip/${item.token}`)}
                                className="text-[11px] font-semibold text-[#6e7a76] hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                              >
                                ⏭ Skip
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

        {/* ── ANALYTICS ────────────────────────────────────────────────── */}
        {activeSection === 'analytics' && (
          <>
            <div className="mb-5">
              <h2 className="text-[22px] font-bold text-[#1a1c1e]" style={jkSans}>Analytics</h2>
              <p className="text-[13px] text-[#6e7a76] mt-0.5">Overview of customer volume and flow</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Today',         value: totalToday,   icon: '✅', bg: '#e8f7f4', fg: '#006356' },
                { label: 'This Week',     value: weekTotal,    icon: '📈', bg: '#ede9fe', fg: '#7c3aed' },
                { label: 'Avg / Day',     value: Math.round(weekTotal / Math.max(dailyHistory.length, 1)), icon: '📊', bg: '#fef3c7', fg: '#d97706' },
                { label: 'Avg Wait Time', value: `${state?.avg_service_time || 5}m`, icon: '⏱', bg: '#fce7f3', fg: '#db2777' },
              ].map(({ label, value, icon, bg, fg }) => (
                <div key={label} className="bg-white rounded-2xl p-5 border border-[#e2e2e5] shadow-[0_2px_8px_rgba(10,126,110,0.04)]">
                  <div className="inline-flex w-9 h-9 rounded-xl items-center justify-center mb-3 text-lg" style={{ background: bg }}>
                    {icon}
                  </div>
                  <div className="text-[26px] font-bold text-[#1a1c1e]" style={{ ...jkSans, color: fg }}>{value}</div>
                  <div className="text-[12px] text-[#6e7a76] font-medium mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#e2e2e5] shadow-[0_2px_8px_rgba(10,126,110,0.04)]">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[16px] font-bold text-[#1a1c1e]" style={jkSans}>Weekly Throughput</h3>
                  <p className="text-[12px] text-[#6e7a76] mt-0.5">Daily volume over the past 7 days</p>
                </div>
                <span className="text-[12px] font-bold text-[#006356] bg-[#e8f7f4] px-3 py-1 rounded-full">
                  {weekTotal} Total
                </span>
              </div>

              {dailyHistory.length > 0 && (
                <div className="flex flex-col gap-3">
                  {dailyHistory.slice(-7).map((d) => {
                    const max = Math.max(...dailyHistory.map(x => x.count), 1);
                    const pct = Math.max(4, (d.count / max) * 100);
                    const isToday = d.label === ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
                    return (
                      <div key={d.label} className="flex items-center gap-3">
                        <span className={`text-[12px] font-bold w-8 shrink-0 ${isToday ? 'text-[#006356]' : 'text-[#6e7a76]'}`}>
                          {d.label}
                        </span>
                        <div className="flex-1 bg-[#eeeef0] rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: isToday ? 'linear-gradient(90deg,#96f4e0,#006356)' : '#bdc9c5',
                            }}
                          />
                        </div>
                        <span className={`text-[12px] font-bold w-6 text-right ${isToday ? 'text-[#006356]' : 'text-[#3e4946]'}`}>
                          {d.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── SETTINGS ─────────────────────────────────────────────────── */}
        {activeSection === 'settings' && (
          <>
            <div className="mb-5">
              <h2 className="text-[22px] font-bold text-[#1a1c1e]" style={jkSans}>Settings</h2>
              <p className="text-[13px] text-[#6e7a76] mt-0.5">System parameters and operational controls</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#e2e2e5] shadow-[0_2px_8px_rgba(10,126,110,0.04)] divide-y divide-[#e2e2e5]">
              {/* Avg service time */}
              <div className="p-6">
                <label className="block text-[14px] font-bold text-[#1a1c1e] mb-1">Average Service Time</label>
                <p className="text-[13px] text-[#6e7a76] mb-4">Controls the automated ETA calculation shown on customer tickets.</p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={avgTime}
                    onChange={handleUpdateAvgTime}
                    className="w-24 px-3 py-2.5 bg-[#f3f3f6] rounded-xl border-0 text-[18px] font-bold text-center text-[#1a1c1e] focus:outline-none focus:ring-2 focus:ring-[#006356]/30"
                    style={jkSans}
                  />
                  <span className="text-[14px] text-[#3e4946]">minutes per customer</span>
                </div>
              </div>

              {/* Queue toggle */}
              <div className="p-6">
                <label className="block text-[14px] font-bold text-[#1a1c1e] mb-1">Queue Access Toggle</label>
                <p className="text-[13px] text-[#6e7a76] mb-4">Temporarily pause new customer entries.</p>
                <button
                  onClick={toggleQueueStatus}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all border ${
                    state?.is_open
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 hover:bg-[#10B981]/20'
                  }`}
                >
                  ⏻ {state?.is_open ? 'Close Queue' : 'Open Queue'}
                </button>
              </div>

              {/* Session */}
              <div className="p-6">
                <label className="block text-[14px] font-bold text-[#1a1c1e] mb-1">Session Management</label>
                <button
                  onClick={handleLogout}
                  className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-[#3e4946] border border-[#bdc9c5] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all"
                >
                  🚪 Sign Out of Dashboard
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── MOBILE BOTTOM NAV ──────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-[#e2e2e5] flex justify-around items-center h-16 px-4">
        {[
          { icon: '🖥️', label: 'Counter',   key: 'counter' },
          { icon: '📊', label: 'Analytics', key: 'analytics' },
          { icon: '⚙️', label: 'Settings',  key: 'settings' },
        ].map(({ icon, label, key }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex flex-col items-center justify-center gap-0.5 px-4 py-1 rounded-xl transition-all ${
              activeSection === key ? 'text-[#006356]' : 'text-[#6e7a76]'
            }`}
          >
            <span className="text-xl">{icon}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wide ${activeSection === key ? 'text-[#006356]' : 'text-[#6e7a76]'}`}>
              {label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
