import React, { useState, useEffect, useRef } from 'react';
import { SmartReturnBlock } from './SmartReturnBlock';
import { AudioAlert } from './AudioAlert';

// Dynamic API Base URL
const getApiBase = () => {
  const envHost = import.meta.env.VITE_BACKEND_URL;
  if (envHost) return `https://${envHost}/api`;
  return `http://${window.location.hostname}:8000/api`;
};
const API_BASE = getApiBase();

// ── Live Countdown ────────────────────────────────────────────────────────────
function LiveCountdown({ etaMinutes, lastUpdated }) {
  const [secondsLeft, setSecondsLeft] = useState(etaMinutes * 60);

  useEffect(() => { setSecondsLeft(etaMinutes * 60); }, [etaMinutes, lastUpdated]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  if (secondsLeft === 0) {
    return (
      <span className="text-[#006356] font-extrabold text-2xl animate-pulse tracking-tight">
        Any moment…
      </span>
    );
  }

  return (
    <div className="tabular-nums flex items-baseline gap-1">
      <span className="text-4xl font-extrabold text-[#1a1c1e] tracking-tight leading-none">
        {String(mins).padStart(2, '0')}
      </span>
      <span className="text-2xl font-bold text-[#6e7a76]">:</span>
      <span className="text-4xl font-extrabold text-[#1a1c1e] tracking-tight leading-none">
        {String(secs).padStart(2, '0')}
      </span>
    </div>
  );
}

// ── Ripple animation (Now Serving) ───────────────────────────────────────────
const rippleStyle = `
  @keyframes ql-ripple {
    0% { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(2.6); opacity: 0; }
  }
  .ql-ripple { animation: ql-ripple 3s cubic-bezier(0.65,0,0.34,1) infinite; }
  .ql-ripple-2 { animation: ql-ripple 3s cubic-bezier(0.65,0,0.34,1) 1s infinite; }
  .ql-ripple-3 { animation: ql-ripple 3s cubic-bezier(0.65,0,0.34,1) 2s infinite; }
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=DM+Sans:wght@400;700&display=swap');
`;

export function CustomerView({ state }) {
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [myToken, setMyToken]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [stateVersion, setStateVersion] = useState(0);
  const prevWaiting = useRef(null);

  useEffect(() => {
    if (!state) return;
    const cur = state.total_waiting;
    if (prevWaiting.current !== null && prevWaiting.current !== cur) {
      setStateVersion(v => v + 1);
    }
    prevWaiting.current = cur;
  }, [state]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      if (res.ok) {
        const data = await res.json();
        setMyToken(data.token);
      }
    } catch (err) {
      console.error('Failed to join queue', err);
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
      console.error('Failed to leave queue', err);
    }
  };

  const isServing = state?.currently_serving?.token === myToken;
  const myData    = state?.waiting_queue?.find(i => i.token === myToken);
  const isNext    = myData?.people_ahead === 1;

  // ── 1. JOIN FORM ────────────────────────────────────────────────────────────
  if (!myToken) {
    return (
      <>
        <style>{rippleStyle}</style>

        {/* ── MOBILE: single-column ── */}
        <div className="lg:hidden min-h-screen bg-[#f9f9fc] pb-8 font-[DM_Sans,sans-serif]">
          <div className="px-5 pt-8 pb-4 flex flex-col items-center text-center">
            <h1
              className="text-[32px] font-extrabold leading-tight tracking-[-0.01em] text-[#1a1c1e] mb-3"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Skip the wait.<br />Not your turn.
            </h1>
            <p className="text-[16px] text-[#3e4946] leading-relaxed max-w-xs">
              Get a live digital token and return when you're close.
            </p>

            {/* Live stat pills */}
            <div className="flex flex-wrap gap-2 justify-center mt-5">
              <div className="flex items-center gap-2 bg-[#006356]/10 border border-[#96f4e0] rounded-full px-4 py-1.5">
                <span className={`w-2 h-2 rounded-full ${state?.is_open ? 'bg-[#10B981] animate-pulse' : 'bg-rose-400'}`} />
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#006356]">
                  Queue: {state?.is_open ? 'Open' : 'Closed'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-[#bdc9c5]/40 rounded-full px-4 py-1.5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#3e4946]">
                  Waiting: {state?.total_waiting ?? 0}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-[#bdc9c5]/40 rounded-full px-4 py-1.5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#3e4946]">
                  ~{(state?.total_waiting ?? 0) * (state?.avg_service_time ?? 5)} min wait
                </span>
              </div>
            </div>
          </div>

          {/* Join card */}
          <div className="mx-5 mt-4 bg-white rounded-[20px] shadow-[0_8px_30px_rgba(10,126,110,0.08)] border border-[#e2e2e5] overflow-hidden">
            <div className="h-1.5 w-full bg-[#006356]" />
            <div className="p-6">
              <h2
                className="text-[22px] font-bold text-[#1a1c1e] mb-5"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Join the Queue
              </h2>

              {!state?.is_open ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-5 rounded-xl text-center">
                  <p className="font-bold text-base mb-1">Queue is Currently Closed</p>
                  <p className="text-xs text-rose-600">The counter is not accepting new tokens right now.</p>
                </div>
              ) : (
                <form onSubmit={handleJoin} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3e4946] mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-[#f3f3f6] border-0 rounded-xl px-4 py-3.5 text-[14px] text-[#1a1c1e] placeholder:text-[#6e7a76]/60 focus:outline-none focus:ring-2 focus:ring-[#006356]/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3e4946] mb-1.5">
                      Phone <span className="normal-case font-normal text-[#6e7a76]">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-[#f3f3f6] border-0 rounded-xl px-4 py-3.5 text-[14px] text-[#1a1c1e] placeholder:text-[#6e7a76]/60 focus:outline-none focus:ring-2 focus:ring-[#006356]/30 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full bg-[#006356] hover:bg-[#005045] disabled:bg-[#006356]/50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-[14px] uppercase tracking-wider"
                  >
                    {loading ? 'Generating…' : 'Get My Token →'}
                  </button>
                  <p className="text-center text-[11px] text-[#6e7a76] mt-1">
                    By joining, you agree to receive SMS updates.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Value props */}
          <div className="mx-5 mt-8 flex flex-col gap-6">
            {[
              { icon: '🔔', title: 'Live Updates', desc: 'Track your exact position in real-time from anywhere.' },
              { icon: '🚶', title: 'Roam Freely', desc: 'Grab a coffee or browse nearby while you wait.' },
              { icon: '🎫', title: 'Seamless Entry', desc: 'Show your digital boarding pass when called.' },
            ].map((p, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-[#d7e6e3] flex items-center justify-center shrink-0 text-xl">
                  {p.icon}
                </div>
                <div className="pt-0.5">
                  <h3 className="text-[16px] font-bold text-[#1a1c1e] mb-0.5">{p.title}</h3>
                  <p className="text-[13px] text-[#3e4946] leading-snug">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── DESKTOP: two-column ── */}
        <div className="hidden lg:flex min-h-[calc(100vh-5rem)] items-center justify-center bg-[#f9f9fc] font-[DM_Sans,sans-serif]">
          <div className="w-full max-w-[1100px] mx-auto bg-white rounded-[24px] shadow-[0_12px_40px_rgba(10,126,110,0.08)] overflow-hidden flex">

            {/* Left: hero */}
            <div className="w-[55%] p-12 flex flex-col justify-between bg-white">
              <div className="space-y-8">
                <div className="space-y-5">
                  <h1
                    className="text-[52px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#1a1c1e]"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Skip the wait.<br />Not your turn.
                  </h1>
                  <p className="text-[18px] text-[#3e4946] leading-relaxed max-w-md">
                    Get a live digital token and return when you're close. Experience total control over your time.
                  </p>
                </div>

                {/* Pills */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <div className="flex items-center gap-2 bg-[#006356]/10 border border-[#96f4e0] rounded-full px-4 py-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${state?.is_open ? 'bg-[#10B981] animate-pulse' : 'bg-rose-400'}`} />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#006356]">
                      Queue: {state?.is_open ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#eeeef0] rounded-full px-4 py-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#3e4946]">
                      Waiting: {state?.total_waiting ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#eeeef0] rounded-full px-4 py-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#3e4946]">
                      ~{(state?.total_waiting ?? 0) * (state?.avg_service_time ?? 5)} min wait
                    </span>
                  </div>
                </div>
              </div>

              {/* Value props */}
              <div className="mt-12 flex flex-col gap-5">
                {[
                  { icon: '🔔', title: 'Live Updates', desc: 'Track your position in real-time on your device.' },
                  { icon: '🚶', title: 'Roam Freely', desc: 'Grab a coffee or browse nearby while you wait.' },
                  { icon: '🎫', title: 'Seamless Entry', desc: 'Show your digital boarding pass when called.' },
                ].map((p, i) => (
                  <React.Fragment key={i}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#f3f3f6] flex items-center justify-center text-lg shrink-0">
                        {p.icon}
                      </div>
                      <div>
                        <h3 className="text-[17px] font-semibold text-[#1a1c1e] mb-0.5">{p.title}</h3>
                        <p className="text-[14px] text-[#3e4946]">{p.desc}</p>
                      </div>
                    </div>
                    {i < 2 && <div className="h-px w-full bg-[#bdc9c5]/30" />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Right: form */}
            <div className="w-[45%] bg-[#f9f9fc] p-8 flex items-center">
              <div className="w-full bg-white rounded-2xl shadow-[0_4px_20px_rgba(10,126,110,0.08)] border border-[#bdc9c5]/20 overflow-hidden">
                <div className="h-1.5 w-full bg-[#006356]" />
                <div className="p-8">
                  <h2
                    className="text-[26px] font-bold text-[#1a1c1e] mb-7"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Join the Queue
                  </h2>

                  {!state?.is_open ? (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl text-center">
                      <p className="font-bold text-base mb-1">Queue is Currently Closed</p>
                      <p className="text-xs text-rose-600">The counter is not accepting new tokens right now.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleJoin} className="flex flex-col gap-5">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3e4946] mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full bg-[#f3f3f6] border-0 rounded-xl px-4 py-3.5 text-[14px] text-[#1a1c1e] placeholder:text-[#6e7a76]/60 focus:outline-none focus:ring-2 focus:ring-[#006356]/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#3e4946] mb-2">
                          Phone Number <span className="normal-case font-normal text-[#6e7a76]">(For SMS Updates)</span>
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full bg-[#f3f3f6] border-0 rounded-xl px-4 py-3.5 text-[14px] text-[#1a1c1e] placeholder:text-[#6e7a76]/60 focus:outline-none focus:ring-2 focus:ring-[#006356]/30 transition-all"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="mt-3 w-full bg-[#006356] hover:bg-[#005045] disabled:bg-[#006356]/50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-[13px] uppercase tracking-widest shadow-sm"
                      >
                        {loading ? 'Generating…' : 'GET MY TOKEN →'}
                      </button>
                      <p className="text-center text-[12px] text-[#6e7a76]">
                        By joining, you agree to our{' '}
                        <span className="underline cursor-pointer hover:text-[#006356]">Terms of Service</span>.
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </>
    );
  }

  // ── 2. BEING SERVED ─────────────────────────────────────────────────────────
  if (isServing) {
    return (
      <>
        <style>{rippleStyle}</style>
        <AudioAlert trigger={true} />
        <div
          className="fixed inset-0 flex flex-col items-center justify-center text-white font-[DM_Sans,sans-serif]"
          style={{ background: 'linear-gradient(160deg, #006356 0%, #0a7e6e 100%)' }}
        >
          {/* Ambient blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] opacity-20"
               style={{ background: '#96f4e0' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-20"
               style={{ background: '#00201b' }} />

          <div className="z-10 flex flex-col items-center text-center gap-10 px-6">
            {/* Badge */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20">
              <span className="w-2 h-2 rounded-full bg-[#96f4e0] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#96f4e0]">Now Serving</span>
            </div>

            {/* Ripple token */}
            <div className="relative flex items-center justify-center w-64 h-64 md:w-[360px] md:h-[360px]">
              <div className="ql-ripple   absolute inset-0 rounded-full bg-[#96f4e0]/20" />
              <div className="ql-ripple-2 absolute inset-0 rounded-full bg-[#96f4e0]/20" />
              <div className="ql-ripple-3 absolute inset-0 rounded-full bg-[#96f4e0]/20" />
              <div className="relative z-10 w-full h-full bg-white rounded-full flex flex-col items-center justify-center border-4 border-[#96f4e0] shadow-2xl">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#6e7a76] mb-1">Queue ID</span>
                <span
                  className="text-[56px] md:text-[80px] font-extrabold tracking-tight leading-none text-[#006356]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {myToken}
                </span>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-3">
              <h1
                className="text-[28px] md:text-[36px] font-bold text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                It's Your Turn
              </h1>
              <p className="text-[16px] text-[#79d7c4] max-w-sm">
                Please proceed to the counter immediately.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── 3. TOKEN EXPIRED / CANCELLED ────────────────────────────────────────────
  if (!myData) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-[20px] shadow-[0_8px_30px_rgba(10,126,110,0.08)] text-center border border-[#e2e2e5]">
        <div className="w-12 h-12 bg-[#d7e6e3] text-[#006356] rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl font-bold">
          ✓
        </div>
        <h3
          className="text-[20px] font-bold text-[#1a1c1e]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Token Completed
        </h3>
        <p className="text-[14px] text-[#3e4946] mt-1">Your token is no longer active in the queue.</p>
        <button
          onClick={() => setMyToken(null)}
          className="mt-6 w-full py-3.5 bg-[#006356] hover:bg-[#005045] text-white rounded-xl text-[13px] font-bold uppercase tracking-wider transition-all"
        >
          Join Queue Again
        </button>
      </div>
    );
  }

  // ── 4. WAITING TICKET ───────────────────────────────────────────────────────
  return (
    <>
      <style>{rippleStyle}</style>
      <AudioAlert trigger={isNext} />

      {/* "You're next" banner */}
      {isNext && (
        <div className="mb-5 bg-[#F59E0B] text-white px-6 py-4 rounded-2xl font-bold text-sm text-center shadow-xl animate-pulse flex items-center justify-center gap-2">
          ⚡ You are 2nd in line! Please head back toward the service counter.
        </div>
      )}

      {/* ── MOBILE ── */}
      <div className="lg:hidden font-[DM_Sans,sans-serif] pb-24">

        {/* Boarding pass card (vertical, mobile) */}
        <div className="mx-auto max-w-sm rounded-[20px] bg-white shadow-[0_4px_20px_rgba(10,126,110,0.08)] overflow-hidden">
          {/* Mint top */}
          <div className="bg-[#e8f7f4] p-6 flex flex-col items-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#006356] mb-2">
              YOUR TOKEN
            </span>
            <div
              className="text-[52px] font-extrabold text-[#0a7e6e] tracking-tight leading-none mb-1"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {myData.token}
            </div>
            <span className="text-[14px] text-[#3e4946] mt-1">{myData.name}</span>
          </div>

          {/* Perforation */}
          <div className="relative h-6 bg-white w-full flex items-center">
            <div className="absolute -left-3 w-6 h-6 bg-[#f9f9fc] rounded-full" />
            <div className="absolute -right-3 w-6 h-6 bg-[#f9f9fc] rounded-full" />
            <div className="w-full h-px border-t border-dashed border-[#bdc9c5]/60 mx-3" />
          </div>

          {/* Stats grid */}
          <div className="p-6 bg-white">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col border-r border-[#bdc9c5]/30 pr-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#6e7a76] mb-1">Ahead</span>
                <span
                  className="text-[26px] font-bold text-[#006356]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {myData.people_ahead}
                </span>
              </div>
              <div className="flex flex-col border-r border-[#bdc9c5]/30 px-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#6e7a76] mb-1">Est. Turn</span>
                <span
                  className="text-[18px] font-bold text-[#006356]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {myData.estimated_turn_time}
                </span>
              </div>
              <div className="flex flex-col pl-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#6e7a76] mb-1">Return By</span>
                <span
                  className="text-[18px] font-bold text-[#006356]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {myData.return_by_time}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live status section */}
        <div className="mt-6 mx-auto max-w-sm flex flex-col gap-5">
          {/* Countdown + progress */}
          <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(10,126,110,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#6e7a76]">Estimated Wait</span>
              <LiveCountdown etaMinutes={myData.eta_minutes} lastUpdated={stateVersion} />
            </div>
            <div className="h-2 w-full bg-[#e2e2e5] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max(6, 100 - ((myData.people_ahead / Math.max(myData.position, 1)) * 100))}%`,
                  background: 'linear-gradient(90deg, #96f4e0, #0a7e6e)',
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#6e7a76] mt-1.5 font-medium">
              <span>Position #{myData.position}</span>
              <span>Your Turn</span>
            </div>
          </div>

          {/* Smart Return */}
          <SmartReturnBlock
            canLeave={myData.can_leave}
            estimatedTurn={myData.estimated_turn_time}
            returnBy={myData.return_by_time}
          />

          {/* Now serving chip */}
          {state?.currently_serving && (
            <div className="bg-white rounded-[16px] p-4 shadow-[0_2px_12px_rgba(10,126,110,0.06)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a7e6e] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#006356]" />
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#6e7a76] block">Now Serving</span>
                  <span className="text-[14px] font-bold text-[#1a1c1e]">{state.currently_serving.name}</span>
                </div>
              </div>
              <span
                className="text-[20px] font-extrabold text-[#006356] bg-[#e8f7f4] px-3 py-1 rounded-xl border border-[#96f4e0]/40"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {state.currently_serving.token}
              </span>
            </div>
          )}

          {/* Cancel */}
          <button
            onClick={handleLeave}
            className="w-full py-3.5 rounded-xl border border-[#bdc9c5] text-[#3e4946] text-[13px] font-bold uppercase tracking-wider hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all flex items-center justify-center gap-2"
          >
            Cancel Token
          </button>
        </div>
      </div>

      {/* ── DESKTOP: boarding pass horizontal ── */}
      <div className="hidden lg:block font-[DM_Sans,sans-serif] py-8">
        <div className="max-w-[760px] mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h2
              className="text-[30px] font-bold text-[#1a1c1e]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              You're in the queue
            </h2>
            <p className="text-[15px] text-[#3e4946] mt-1">
              Relax nearby. We'll notify you when it's your turn.
            </p>
          </div>

          {/* Boarding pass card */}
          <div className="flex bg-white rounded-[20px] shadow-[0_4px_20px_rgba(10,126,110,0.08)] overflow-visible relative">
            {/* Left: mint */}
            <div className="w-[42%] bg-[#e8f7f4] p-8 rounded-l-[20px] flex flex-col justify-between min-h-[260px]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#006356] block mb-5">
                  YOUR TOKEN
                </span>
                <div
                  className="text-[80px] font-extrabold text-[#0a7e6e] leading-none tracking-[-0.02em]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {myData.token}
                </div>
              </div>
              <div className="pt-5 border-t border-[#006356]/15 mt-5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#3e4946] block mb-1">
                  Passenger
                </span>
                <span className="text-[16px] font-semibold text-[#1a1c1e]">{myData.name}</span>
              </div>
            </div>

            {/* Perforated divider */}
            <div className="relative flex flex-col items-center w-6 bg-white z-10">
              <div className="absolute -top-3 w-6 h-6 bg-[#f9f9fc] rounded-full border border-[#e2e2e5]" />
              <div className="w-px h-full border-l-2 border-dashed border-[#bdc9c5]/60 mx-auto" />
              <div className="absolute -bottom-3 w-6 h-6 bg-[#f9f9fc] rounded-full border border-[#e2e2e5]" />
            </div>

            {/* Right: stats */}
            <div className="flex-1 p-8 rounded-r-[20px] flex flex-col justify-center">
              <div className="grid grid-cols-3 gap-5 mb-6">
                <div className="flex flex-col border-r border-[#e2e2e5] pr-4">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#6e7a76] mb-2">People Ahead</span>
                  <span
                    className="text-[32px] font-bold text-[#0a7e6e]"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {myData.people_ahead}
                  </span>
                </div>
                <div className="flex flex-col border-r border-[#e2e2e5] px-4">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#6e7a76] mb-2">Est. Turn</span>
                  <span
                    className="text-[22px] font-bold text-[#0a7e6e]"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {myData.estimated_turn_time}
                  </span>
                </div>
                <div className="flex flex-col pl-4">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#6e7a76] mb-2">Return By</span>
                  <span
                    className="text-[22px] font-bold text-[#0a7e6e]"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {myData.return_by_time}
                  </span>
                </div>
              </div>

              {/* Cancel */}
              <button
                onClick={handleLeave}
                className="self-end text-[11px] font-bold uppercase tracking-wider text-[#6e7a76] hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all"
              >
                Cancel Token
              </button>
            </div>
          </div>

          {/* Below-card stats */}
          <div className="mt-6 flex flex-col gap-4">
            {/* Countdown row */}
            <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(10,126,110,0.06)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#6e7a76]">Live Countdown</span>
                <LiveCountdown etaMinutes={myData.eta_minutes} lastUpdated={stateVersion} />
              </div>
              <div className="h-2 w-full bg-[#e2e2e5] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(6, 100 - ((myData.people_ahead / Math.max(myData.position, 1)) * 100))}%`,
                    background: 'linear-gradient(90deg, #96f4e0, #0a7e6e)',
                  }}
                />
              </div>
            </div>

            {/* Smart return + now serving side by side */}
            <div className="grid grid-cols-2 gap-4">
              <SmartReturnBlock
                canLeave={myData.can_leave}
                estimatedTurn={myData.estimated_turn_time}
                returnBy={myData.return_by_time}
              />
              {state?.currently_serving ? (
                <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(10,126,110,0.06)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a7e6e] opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#006356]" />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#6e7a76] block">Now Serving</span>
                      <span className="text-[15px] font-bold text-[#1a1c1e]">{state.currently_serving.name}</span>
                    </div>
                  </div>
                  <span
                    className="text-[22px] font-extrabold text-[#006356] bg-[#e8f7f4] px-3 py-1 rounded-xl"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {state.currently_serving.token}
                  </span>
                </div>
              ) : (
                <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(10,126,110,0.06)] flex items-center justify-center">
                  <span className="text-[13px] text-[#6e7a76]">Counter is clear</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
