import React, { useState, useEffect, useRef } from 'react';
import { SmartReturnBlock } from './SmartReturnBlock';
import { AudioAlert } from './AudioAlert';
import { 
  Users, Clock, LogOut, Sparkles, CheckCircle2, Timer, 
  ChevronRight, ShieldCheck, QrCode, Smartphone, Bell
} from 'lucide-react';

// Dynamic API Base URL resolution for Local, Wi-Fi, and Production deployments
const getApiBase = () => {
  const envHost = import.meta.env.VITE_BACKEND_URL;
  if (envHost) {
    return `https://${envHost}/api`;
  }
  return `http://${window.location.hostname}:8000/api`;
};

const API_BASE = getApiBase();

// Live countdown clock component
function LiveCountdown({ etaMinutes, lastUpdated }) {
  const [secondsLeft, setSecondsLeft] = useState(etaMinutes * 60);

  useEffect(() => {
    setSecondsLeft(etaMinutes * 60);
  }, [etaMinutes, lastUpdated]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  if (secondsLeft === 0) {
    return <span className="text-teal-600 font-black text-xl animate-pulse">Any moment now</span>;
  }

  return (
    <div className="tabular-nums">
      <span className="text-3xl font-black text-slate-900">{mins}</span>
      <span className="text-lg font-bold text-slate-400 mx-0.5">:</span>
      <span className="text-3xl font-black text-slate-900">{String(secs).padStart(2, '0')}</span>
      <span className="text-xs font-semibold text-slate-400 ml-1">left</span>
    </div>
  );
}

export function CustomerView({ state }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [myToken, setMyToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stateVersion, setStateVersion] = useState(0);
  const prevWaiting = useRef(null);

  useEffect(() => {
    if (!state) return;
    const currentWaiting = state.total_waiting;
    if (prevWaiting.current !== null && prevWaiting.current !== currentWaiting) {
      setStateVersion(v => v + 1);
    }
    prevWaiting.current = currentWaiting;
  }, [state]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone })
      });
      if (res.ok) {
        const data = await res.json();
        setMyToken(data.token);
      }
    } catch (err) {
      console.error("Failed to join queue", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!myToken) return;
    try {
      await fetch(`${API_BASE}/queue/leave/${myToken}`, { method: 'DELETE' });
      setMyToken(null);
    } catch (err) {
      console.error("Failed to leave queue", err);
    }
  };

  const isServing = state?.currently_serving?.token === myToken;
  const myData = state?.waiting_queue?.find(i => i.token === myToken);
  const isNext = myData?.people_ahead === 1;

  // ── 1. JOIN FORM ──────────────────────────────────────────────────────────
  if (!myToken) {
    return (
      <div className="py-4 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (Hero & Live Overview) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 text-white rounded-3xl p-8 md:p-10 shadow-2xl shadow-teal-900/20 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-teal-200 mb-6">
                <Sparkles className="w-4 h-4 text-teal-300" /> Smart Live Queueing System
              </div>

              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                Wait anywhere, <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-emerald-300">not in line.</span>
              </h1>
              
              <p className="text-teal-100/80 text-sm md:text-base mt-3 max-w-lg leading-relaxed">
                Get a real-time digital token on your phone. Enjoy your time nearby and receive smart return notifications before your turn arrives.
              </p>

              {/* Live Status Indicators */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 border-t border-white/10">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <span className="text-xs text-teal-200 uppercase font-bold tracking-wider block mb-1">Queue Status</span>
                  <span className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${state?.is_open ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                    {state?.is_open ? 'Open' : 'Closed'}
                  </span>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <span className="text-xs text-teal-200 uppercase font-bold tracking-wider block mb-1">Waiting Now</span>
                  <span className="text-xl md:text-2xl font-black text-white">{state?.total_waiting ?? 0} <span className="text-xs font-normal opacity-70">people</span></span>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <span className="text-xs text-teal-200 uppercase font-bold tracking-wider block mb-1">Est. Wait Time</span>
                  <span className="text-xl md:text-2xl font-black text-white">~{(state?.total_waiting ?? 0) * (state?.avg_service_time ?? 5)} <span className="text-xs font-normal opacity-70">mins</span></span>
                </div>
              </div>
            </div>

            {/* Value Proposition Cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { title: 'Scan & Leave', desc: 'No physical line', icon: QrCode },
                { title: 'Live Tracking', desc: 'Realtime updates', icon: Smartphone },
                { title: 'Smart Return', desc: 'Buffer alerts', icon: Bell },
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <item.icon className="w-5 h-5 text-teal-600 mb-2" />
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-slate-800">{item.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column (Join Form Card) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200/80 sticky top-24">
              <div className="mb-6">
                <h3 className="text-2xl font-black text-slate-900">Join the Queue</h3>
                <p className="text-xs text-slate-500 mt-1">Get your instant token and live return estimate.</p>
              </div>

              {!state?.is_open ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl text-center space-y-2">
                  <p className="font-bold text-base">Queue is Currently Closed</p>
                  <p className="text-xs text-rose-600">The counter is not accepting new tokens right now. Please check back later.</p>
                </div>
              ) : (
                <form onSubmit={handleJoin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Anandh Krishnan"
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Mobile Number <span className="normal-case font-normal text-slate-400">(Optional for SMS)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-teal-600/25 active:scale-[0.98] disabled:opacity-50 text-base flex items-center justify-center gap-2 group"
                  >
                    {loading ? 'Generating Token...' : (
                      <>
                        Get Digital Token <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1 mt-4">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> No app download required. Instant browser sync.
                  </p>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ── 2. BEING SERVED VIEW ──────────────────────────────────────────────────
  if (isServing) {
    return (
      <div className="max-w-2xl mx-auto py-8 md:py-12">
        <AudioAlert trigger={true} />
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 text-white rounded-3xl p-8 md:p-12 shadow-2xl shadow-teal-600/30 text-center space-y-6 relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest animate-bounce">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            It's Your Turn!
          </div>

          <div>
            <span className="text-xs font-bold uppercase opacity-75 tracking-widest block mb-2">Token Number</span>
            <h1 className="text-7xl md:text-9xl font-black tracking-tight">{myToken}</h1>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 max-w-md mx-auto">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-teal-200" />
            <p className="text-lg font-bold text-white">Please proceed to the service counter now.</p>
            <p className="text-xs text-teal-100 mt-1">Show this token on your screen to staff.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. TOKEN EXPIRED / CANCELLED ──────────────────────────────────────────
  if (!myData) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl text-center border border-slate-200/80">
        <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black">
          ✓
        </div>
        <h3 className="text-xl font-black text-slate-800">Token Completed</h3>
        <p className="text-sm text-slate-500 mt-1">Your token is no longer active in the queue.</p>
        <button 
          onClick={() => setMyToken(null)} 
          className="mt-6 w-full py-3.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20"
        >
          Join Queue Again
        </button>
      </div>
    );
  }

  // ── 4. WAITING TICKET ─────────────────────────────────────────────────────
  return (
    <div className="py-4 md:py-8 max-w-6xl mx-auto space-y-6">
      <AudioAlert trigger={isNext} />

      {/* Turn Proximity Banner */}
      {isNext && (
        <div className="bg-amber-500 text-white px-6 py-4 rounded-2xl font-bold text-sm text-center shadow-xl shadow-amber-500/20 animate-pulse flex items-center justify-center gap-2">
          ⚡ You are 2nd in line! Please head back toward the service counter.
        </div>
      )}

      {/* Main Grid Layout for Laptop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Card: Main Digital Ticket */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
          
          {/* Header Bar */}
          <div className="flex justify-between items-center px-6 md:px-8 py-5 border-b border-slate-100 bg-slate-50/50">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Queue Ticket</span>
              <h3 className="text-xl font-black text-slate-900">{myData.name}</h3>
            </div>
            <button
              onClick={handleLeave}
              className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-1.5"
              title="Leave queue"
            >
              <LogOut className="w-4 h-4" /> Cancel Token
            </button>
          </div>

          {/* Big Token Display */}
          <div className="px-6 py-8 text-center bg-gradient-to-b from-teal-50/40 via-white to-white">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-[0.2em] block mb-2">Your Token Number</span>
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight">{myData.token}</h1>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-px bg-slate-200/70 border-t border-b border-slate-200/70">
            <div className="bg-white p-4 md:p-6 text-center">
              <Users className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase block">People Ahead</span>
              <span className="text-2xl md:text-3xl font-black text-slate-900">{myData.people_ahead}</span>
            </div>
            <div className="bg-white p-4 md:p-6 text-center border-l border-r border-slate-200/70">
              <Timer className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Countdown</span>
              <LiveCountdown etaMinutes={myData.eta_minutes} lastUpdated={stateVersion} />
            </div>
            <div className="bg-white p-4 md:p-6 text-center">
              <Clock className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Estimated Turn</span>
              <span className="text-lg md:text-xl font-black text-slate-900">{myData.estimated_turn_time}</span>
            </div>
          </div>

          {/* Queue Progress Bar */}
          <div className="p-6 md:p-8 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Overall Progress</span>
              <span className="text-teal-600">Position #{myData.position}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max(8, 100 - ((myData.people_ahead / Math.max(myData.position, 1)) * 100))}%`
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>Joined</span>
              <span>Your Turn</span>
            </div>
          </div>
        </div>

        {/* Right Card: Smart Return Recommendation & Serving Overview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80">
            <SmartReturnBlock
              canLeave={myData.can_leave}
              estimatedTurn={myData.estimated_turn_time}
              returnBy={myData.return_by_time}
            />
          </div>

          {state?.currently_serving && (
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Now Serving at Counter</span>
                  <p className="text-sm font-bold text-slate-800">{state.currently_serving.name}</p>
                </div>
              </div>
              <span className="text-2xl font-black text-teal-600 bg-teal-50 px-4 py-1.5 rounded-2xl border border-teal-100">
                {state.currently_serving.token}
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}