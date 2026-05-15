import type React from "react";

type LogoProps = { size?: number; className?: string; style?: React.CSSProperties };

// ─── 0G Labs ────────────────────────────────────────────────────────────────
export function ZeroGLogo({ size = 20, className, style }: LogoProps) {
  return (
    <img
      src="/logo0g.png"
      alt="0G"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain", borderRadius: 4, ...style }}
    />
  );
}

// ─── Mantle ──────────────────────────────────────────────────────────────────
export function MantleLogo({ size = 20, className, style }: LogoProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 28 28" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} style={style}
    >
      <path d="M3 22 L3 6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M3 6 Q9 1 14 8" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M14 8 Q19 1 25 6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M25 6 L25 22" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

// ─── Arbitrum ────────────────────────────────────────────────────────────────
export function ArbitrumLogo({ size = 20, className, style }: LogoProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 28 28" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} style={style}
    >
      <path
        d="M14 3 L25.5 24 L2.5 24 Z"
        stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"
      />
      <path d="M8 17 L20 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="21" cy="7" r="2" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

// ─── Sui ─────────────────────────────────────────────────────────────────────
export function SuiLogo({ size = 20, className, style }: LogoProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 28 28" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} style={style}
    >
      <path
        d="M14 3 C14 3 4 12 4 18 C4 23.5 8.5 26 14 26 C19.5 26 24 23.5 24 18 C24 12 14 3 14 3 Z"
        stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"
      />
      <path
        d="M14 11 C14 11 9.5 16 9.5 19.5 C9.5 22 11.5 23 14 23 C16.5 23 18.5 22 18.5 19.5 C18.5 16 14 11 14 11 Z"
        fill="currentColor" opacity="0.55"
      />
    </svg>
  );
}

// ─── QIE ─────────────────────────────────────────────────────────────────────
export function QieLogo({ size = 20, className, style }: LogoProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 28 28" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} style={style}
    >
      <circle cx="13" cy="13" r="9" stroke="currentColor" strokeWidth="2.5" />
      <path d="M18.5 18.5 L25 25" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="13" cy="13" r="3" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

// ─── Circle / Arc ─────────────────────────────────────────────────────────────
export function CircleLogo({ size = 20, className, style }: LogoProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 28 28" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} style={style}
    >
      <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M20 10.5 C18.3 8.6 16.3 7.5 14 7.5 C9.6 7.5 6 10.4 6 14 C6 17.6 9.6 20.5 14 20.5 C16.3 20.5 18.3 19.4 20 17.5"
        stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Polygon ──────────────────────────────────────────────────────────────────
export function PolygonLogo({ size = 20, className, style }: LogoProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 28 28" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} style={style}
    >
      <path d="M18 5 L26 9.5 L26 18.5 L18 23 L10 18.5 L10 9.5 Z" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M10 9.5 L14 12 L14 16.5 L10 18.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      <circle cx="5" cy="14" r="2.2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
