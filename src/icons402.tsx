// Inline icon set — stroke-based, currentColor.
import type { FC, SVGProps } from 'react';

const S = (p: SVGProps<SVGSVGElement>) => ({
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  ...p,
});

export const Logo = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 32 32" width={18} height={18} {...p}>
    <path d="M16 6l9 6.2-9 6.2-9-6.2z" fill="#fff" />
    <path d="M7 16.4l9 6.2 9-6.2v5.2L16 27.8 7 21.6z" fill="#fff" opacity=".62" />
  </svg>
);
export const ArrowRight = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const ArrowLeft = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>);
export const ArrowUpRight = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M7 17L17 7M8 7h9v9" /></svg>);
export const Check = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M4 12.5l5 5 11-11" /></svg>);
export const X = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>);
export const Copy = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>);
export const Bolt = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>);
export const Receipt = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M5 3h14v18l-2.5-1.5L14 21l-2.5-1.5L9 21l-2.5-1.5L5 21z" /><path d="M9 8h6M9 12h6" /></svg>);
export const Bag = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M6 8h12l1 12H5z" /><path d="M9 8a3 3 0 016 0" /></svg>);
export const Robot = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4M8.5 14h.01M15.5 14h.01M9 18h6" /></svg>);
export const Grid = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><rect x="3" y="3" width="7" height="7" rx="1.6" /><rect x="14" y="3" width="7" height="7" rx="1.6" /><rect x="3" y="14" width="7" height="7" rx="1.6" /><rect x="14" y="14" width="7" height="7" rx="1.6" /></svg>);
export const Code = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M8 6l-6 6 6 6M16 6l6 6-6 6" /></svg>);
export const Gear = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><circle cx="12" cy="12" r="3.1" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>);
export const Globe = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></svg>);
export const Lock = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><rect x="4" y="10" width="16" height="11" rx="2.4" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>);
export const Spinner = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M12 3a9 9 0 109 9" /></svg>);
export const Dots = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" /></svg>);
export const Plus = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M12 5v14M5 12h14" /></svg>);
export const Shield = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>);
export const Link = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" /></svg>);
export const Chat = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M21 12a8 8 0 01-11.5 7.2L3 21l1.8-6.5A8 8 0 1121 12z" /></svg>);
export const Search = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>);
export const Bell = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 004 0" /></svg>);
export const Mail = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><rect x="3" y="5" width="18" height="14" rx="2.4" /><path d="M3.5 7l8.5 6 8.5-6" /></svg>);
export const Share = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" /><path d="M12 3v13M7 8l5-5 5 5" /></svg>);
export const Sliders = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M4 6h11M19 6h1M4 12h5M13 12h7M4 18h9M17 18h3" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="14" cy="18" r="2" /></svg>);
export const ChevDown = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M6 9l6 6 6-6" /></svg>);
export const ChevUpDown = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>);
export const TriUp = (p: SVGProps<SVGSVGElement>) => (<svg {...S({ strokeWidth: 0, ...p })}><path d="M12 8l5 8H7z" fill="currentColor" /></svg>);
export const TriDown = (p: SVGProps<SVGSVGElement>) => (<svg {...S({ strokeWidth: 0, ...p })}><path d="M12 16l-5-8h10z" fill="currentColor" /></svg>);
export const Star = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M12 3l2.6 5.6L21 9.4l-4.5 4.3L17.6 21 12 17.8 6.4 21l1.1-7.3L3 9.4l6.4-.8z" /></svg>);
export const Layers = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5M3 18l9 5 9-5" /></svg>);
export const Wallet = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><rect x="3" y="6" width="18" height="13" rx="2.4" /><path d="M3 10h18M16 14h2" /></svg>);
export const Database = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></svg>);
export const Info = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><circle cx="12" cy="12" r="9" /><path d="M12 16v-5M12 8h.01" /></svg>);
export const Bulb = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0012 3z" /></svg>);
export const Send = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>);
export const Users = (p: SVGProps<SVGSVGElement>) => (<svg {...S(p)}><circle cx="9" cy="8" r="3.4" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M16 11a3 3 0 100-6M21 20c0-2.6-1.5-4.2-4-4.7" /></svg>);

export const TAB_ICON: Record<string, FC<SVGProps<SVGSVGElement>>> = {
  Overview: Grid, Marketplace: Bag, Agents: Robot, Gateway: Code, Receipts: Receipt, Settings: Gear,
};

// category → color + icon for "coin"-style squircles
export const CAT_ICON: Record<string, FC<SVGProps<SVGSVGElement>>> = {
  data: Database, inference: Bolt, storage: Layers, analytics: Sliders,
  payment: Wallet, trading: ArrowUpRight, tax: Receipt, 'game-intel': Globe,
};
export const catColor = (c: string) => `var(--cat-${c.replace(/[^a-z-]/g, '') || 'data'})`;
