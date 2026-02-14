"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

function MoonLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" className="flex-shrink-0">
      <defs>
        <radialGradient id="moon-glow" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fffbe6"/>
          <stop offset="40%" stopColor="#facc15"/>
          <stop offset="100%" stopColor="#b45309"/>
        </radialGradient>
        <filter id="moon-outer-glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.98  0 0 0 0 0.8  0 0 0 0 0.08  0 0 0 0.6 0" result="glow"/>
          <feMerge>
            <feMergeNode in="glow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#moon-outer-glow)">
        <circle cx="14" cy="15" r="10" fill="url(#moon-glow)"/>
        <circle cx="19" cy="13" r="8" fill="#0a0a0e"/>
      </g>
      <circle cx="10" cy="13" r="1.2" fill="#d4a017" opacity="0.4"/>
      <circle cx="12" cy="18" r="0.8" fill="#d4a017" opacity="0.3"/>
      <circle cx="25" cy="7" r="0.7" fill="#facc15" opacity="0.9"/>
      <circle cx="27" cy="12" r="0.4" fill="#fef08a" opacity="0.7"/>
    </svg>
  );
}

interface NavbarProps {
  connected?: boolean;
  roundId?: number;
  bnbPrice?: number | null;
}

export function Navbar({ connected, roundId, bnbPrice }: NavbarProps) {
  return (
    <header
      className="flex items-center justify-between px-4 py-2"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(9,9,11,0.85)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <MoonLogo />
          <span className="text-sm font-black tracking-tight text-white">
            Moon or Doom
          </span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-zinc-300">
          <span className="relative flex h-1.5 w-1.5">
            {connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${connected ? "bg-emerald-400" : "bg-red-500"}`}
            />
          </span>
          <span className="font-mono">
            {connected ? "Live" : "..."}
            {roundId && roundId > 0 ? ` #${roundId}` : ""}
          </span>
          {bnbPrice && (
            <span className="font-mono text-amber-300 ml-1">
              BNB ${bnbPrice.toFixed(0)}
            </span>
          )}
        </div>
      </div>
      <ConnectButton />
    </header>
  );
}
