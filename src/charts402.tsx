import { useId, useState, type MouseEvent } from 'react';

// deterministic pseudo-random from a string seed
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
}

/** Payzen-style bar sparkline: N thin bars, first `filled` of them in `color`, rest light grey. */
export function BarSpark({ seed, color, count = 30, filled = 13 }: { seed: string; color: string; count?: number; filled?: number }) {
  const rnd = seeded(seed);
  const bars = Array.from({ length: count }, (_, i) => {
    const base = 0.32 + rnd() * 0.62;
    // gently rising trend across the filled region
    const trend = i < filled ? 0.15 * (i / filled) : 0;
    return Math.min(1, base + trend);
  });
  return (
    <div className="bars">
      {bars.map((h, i) => (
        <span key={i} style={{ height: `${Math.round(h * 100)}%`, background: i < filled ? color : 'var(--line-2)' }} />
      ))}
    </div>
  );
}

/** tiny line sparkline for table cells */
export function LineSpark({ seed, up, w = 80, h = 26 }: { seed: string; up: boolean; w?: number; h?: number }) {
  const rnd = seeded(seed);
  const n = 16;
  const pts = Array.from({ length: n }, (_, i) => {
    const drift = (up ? 1 : -1) * (i / n) * 0.5;
    return 0.5 + (rnd() - 0.5) * 0.7 + drift;
  });
  const max = Math.max(...pts), min = Math.min(...pts), span = max - min || 1;
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (n - 1)) * w},${h - ((v - min) / span) * (h - 3) - 1.5}`).join(' ');
  return (
    <svg width={w} height={h} className="sparkline">
      <path d={d} fill="none" stroke={up ? 'var(--green)' : 'var(--red)'} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Payoneer-style split bars: grey track + red fill from bottom, dashed average line + red pill. */
export function WeekBars({ data, avgLabel, unit = '', max }: { data: { label: string; value: number }[]; avgLabel?: string; unit?: string; max?: number }) {
  const top = max ?? Math.max(...data.map(d => d.value)) * 1.15;
  const avg = data.reduce((s, d) => s + d.value, 0) / data.length;
  const peakIdx = data.reduce((bi, d, i, a) => (d.value > a[bi].value ? i : bi), 0);
  const avgPct = (avg / top) * 100;
  return (
    <div className="weekbars">
      <div className="wb-row">
        {data.map((d, i) => (
          <div key={i} className={'wb' + (i === peakIdx ? ' peak' : '')}>
            <div className="track"><div className="fill" style={{ height: `${Math.min(100, (d.value / top) * 100)}%` }} /></div>
          </div>
        ))}
        <div className="avg" style={{ bottom: `${avgPct}%` }}>{avgLabel && <span className="tag">{avgLabel}</span>}</div>
        <div className="yax">
          <span style={{ top: 0 }}>{Math.round(top).toLocaleString()}{unit}</span>
          <span style={{ top: '50%' }}>{Math.round(top / 2).toLocaleString()}</span>
          <span style={{ top: '100%' }}>0</span>
        </div>
      </div>
      <div className="wb-labels">{data.map((d, i) => <span key={i}>{d.label}</span>)}</div>
    </div>
  );
}

export interface ChartPoint { label: string; value: number }

/** big area+line chart with a highlighted point + hover tooltip. */
export function AreaChart({
  data, unit = 'USD', highlightIndex, color = '#f5333f',
}: { data: ChartPoint[]; unit?: string; highlightIndex: number; color?: string }) {
  const id = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? highlightIndex;

  const W = 1000, H = 230, padY = 14;
  const max = Math.max(...data.map(d => d.value)) * 1.12;
  const min = 0;
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => H - padY - ((v - min) / (max - min)) * (H - padY * 2);

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map(t => padY + t * (H - padY * 2));
  const ax = x(active);

  function onMove(e: MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1)))));
  }
  const d = data[active];
  const prev = data[active - 1]?.value ?? d.value;
  const chg = prev ? ((d.value - prev) / prev) * 100 : 0;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="none"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`areaGrad${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <g>
          {gridYs.map((gy, i) => <line key={i} x1="0" x2={W} y1={gy} y2={gy} stroke="var(--line)" />)}
        </g>
        {/* highlight band */}
        <rect x={ax - 18} y={padY} width={36} height={H - padY * 2} fill={color} fillOpacity={0.08} />
        <line x1={ax} x2={ax} y1={padY} y2={H - padY} stroke={color} strokeWidth={1.4} strokeDasharray="3 3" />
        <path d={areaPath} fill={`url(#areaGrad${id})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2.6} strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 6px 9px ${color}44)` }} />
        <circle cx={ax} cy={y(d.value)} r={5.5} fill="#fff" stroke={color} strokeWidth={3.2} />
      </svg>
      <div className="chart-tip" style={{ left: `${(ax / W) * 100}%`, top: `${(y(d.value) / H) * 100 - 4}%` }}>
        <div className="m">{d.label}</div>
        <div className="v">{d.value.toLocaleString()} <span className="u">{unit}</span></div>
        <div className="rows">
          <span><i className="d" style={{ background: color }} />{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</span>
          <span><i className="d" style={{ background: '#ffd9c4' }} />{Math.abs(chg).toFixed(2)}%</span>
        </div>
      </div>
      <div className="chart-xlabels">{data.map((p, i) => <span key={i} style={i === active ? { color: 'var(--acc-link)', fontWeight: 600 } : undefined}>{p.label.split(' ')[0]}</span>)}</div>
    </div>
  );
}
