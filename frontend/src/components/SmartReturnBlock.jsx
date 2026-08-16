import React from 'react';

export function SmartReturnBlock({ canLeave, estimatedTurn, returnBy }) {
  if (!canLeave) {
    return (
      <div
        className="rounded-xl p-4 flex items-start gap-3 border"
        style={{
          background: 'rgba(255,221,184,0.18)',
          borderColor: 'rgba(157,99,0,0.25)',
        }}
      >
        <span className="text-[#9d6300] mt-0.5 text-lg shrink-0">⚠️</span>
        <div>
          <h4 className="font-bold text-[14px] text-[#653e00] mb-0.5">Stay Close</h4>
          <p className="text-[13px] text-[#3e4946] leading-snug">
            Your turn is approaching. Please remain in the waiting area to avoid missing your call.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ background: '#e8f7f4', borderColor: 'rgba(150,244,224,0.5)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#006356]">
          Smart Return Active
        </span>
      </div>

      <h3 className="text-[14px] font-bold text-[#006356] mb-3 flex items-center gap-2">
        ✅ You can safely leave the waiting area
      </h3>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#006356]/15">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#3e4946] block mb-1">
            Est. Turn
          </span>
          <span className="text-[17px] font-bold text-[#0a7e6e]">{estimatedTurn}</span>
        </div>
        <div className="bg-[#d7e6e3] rounded-lg p-2 border border-[#96f4e0]/40">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#006356] block mb-1">
            🕐 Return By
          </span>
          <span className="text-[17px] font-extrabold text-[#006356]">{returnBy}</span>
        </div>
      </div>
      <p className="text-[11px] text-[#3e4946] mt-2 text-center">
        Includes 4-minute buffer to reach counter
      </p>
    </div>
  );
}
