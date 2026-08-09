import React from 'react';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

export function SmartReturnBlock({ canLeave, estimatedTurn, returnBy }) {
  if (!canLeave) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <h4 className="font-semibold text-sm">Stay near the waiting area</h4>
          <p className="text-xs text-amber-700 mt-0.5">Your turn is approaching fast. Please stay nearby to avoid missing your call.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-950 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Smart Return Active</span>
      </div>

      <h3 className="text-base font-bold text-emerald-900 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        You can safely leave the waiting area
      </h3>

      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-emerald-200/60">
        <div>
          <span className="text-xs text-emerald-700 block">Estimated Turn</span>
          <span className="text-lg font-bold text-emerald-900">{estimatedTurn}</span>
        </div>
        <div className="bg-emerald-100/70 p-2 rounded-lg border border-emerald-200">
          <span className="text-xs text-emerald-800 font-medium block flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-700" /> Return By
          </span>
          <span className="text-lg font-extrabold text-emerald-950">{returnBy}</span>
        </div>
      </div>
      <p className="text-[11px] text-emerald-700 mt-2 text-center">Includes 4-minute buffer time to reach counter</p>
    </div>
  );
}