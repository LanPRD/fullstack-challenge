import { type DataPoint, type GamePhase } from "@/stores/gameStore";
import { useMemo } from "react";

interface Props {
  phase: GamePhase;
  multiplier: number;
  dataPoints: DataPoint[];
  serverSeedHash: string | null;
  crashPoint: number | null;
}

const W = 800;
const H = 360;
const PAD = { top: 30, right: 20, bottom: 40, left: 56 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

function ptX(elapsed: number, maxElapsed: number) {
  return PAD.left + (elapsed / maxElapsed) * INNER_W;
}

function ptY(mult: number, maxMult: number) {
  return PAD.top + INNER_H - ((mult - 1) / (maxMult - 1)) * INNER_H;
}

function tickLabel(tick: number) {
  return tick >= 2 ? `${tick.toFixed(0)}×` : `${tick.toFixed(1)}×`;
}

interface OverlayProps {
  phase: GamePhase;
  multiplier: number;
  crashPoint: number | null;
}

function MultiplierOverlay({ phase, multiplier, crashPoint }: OverlayProps) {
  if (phase === "BETTING") {
    return (
      <div className="text-center">
        <div className="text-yellow-400 text-sm font-semibold animate-pulse mb-1">FASE DE APOSTAS</div>
        <div className="text-5xl font-mono font-bold text-white">1.00×</div>
      </div>
    );
  }
  if (phase === "STARTED") {
    return (
      <div className="text-6xl font-mono font-bold glow-green" style={{ color: "#00ff88" }}>
        {multiplier.toFixed(2)}×
      </div>
    );
  }
  if (phase === "CRASHED") {
    return (
      <div className="text-center">
        <div className="text-red-500 text-lg font-bold animate-crash mb-1">CRASHED</div>
        <div className="text-6xl font-mono font-bold glow-red" style={{ color: "#ef4444" }}>
          {crashPoint !== null ? crashPoint.toFixed(2) : multiplier.toFixed(2)}×
        </div>
      </div>
    );
  }
  return <div className="text-gray-500 text-xl">Aguardando rodada…</div>;
}

export function CrashGraph({ phase, multiplier, dataPoints, serverSeedHash, crashPoint }: Props) {
  const color = phase === "CRASHED" ? "#ef4444" : "#00ff88";

  const graph = useMemo(() => {
    if (dataPoints.length < 2) {
      return { pathD: "", fillD: "", lastPt: null, yTicks: [1, 2, 5], maxMult: 2 };
    }

    const maxE = Math.max(...dataPoints.map(p => p.elapsed));
    const maxM = Math.max(...dataPoints.map(p => p.multiplier), multiplier, 1.5) * 1.1;

    const pts = dataPoints.map(p => ({
      x: ptX(p.elapsed, maxE),
      y: ptY(p.multiplier, maxM)
    }));

    const path =
      `M ${pts[0].x} ${pts[0].y} ` +
      pts
        .slice(1)
        .map((p, i) => {
          const cpx = (pts[i].x + p.x) / 2;
          return `C ${cpx} ${pts[i].y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
        })
        .join(" ");

    const baseline = PAD.top + INNER_H;
    const fill = `${path} L ${pts[pts.length - 1].x} ${baseline} L ${pts[0].x} ${baseline} Z`;
    const ticks = [1, 1.5, 2, 3, 5, 10, 20].filter(t => t <= maxM);

    return { pathD: path, fillD: fill, lastPt: pts[pts.length - 1], yTicks: ticks, maxMult: maxM };
  }, [dataPoints, multiplier]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ background: "#07070f", minHeight: 200 }}>
      {serverSeedHash && phase === "BETTING" && (
        <div className="absolute top-3 left-3 right-3 flex items-center gap-2 z-10">
          <span className="text-xs text-gray-500">Seed hash:</span>
          <span className="text-xs text-gray-400 font-mono truncate">{serverSeedHash.slice(0, 48)}…</span>
        </div>
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        <MultiplierOverlay phase={phase} multiplier={multiplier} crashPoint={crashPoint} />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 240 }}>
        <defs>
          <filter id="glow-path">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {graph.yTicks.map(tick => {
          const y = ptY(tick, graph.maxMult);
          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="#1f2937"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fill="#4b5563" fontSize="10">
                {tickLabel(tick)}
              </text>
            </g>
          );
        })}

        <line
          x1={PAD.left}
          y1={PAD.top + INNER_H}
          x2={W - PAD.right}
          y2={PAD.top + INNER_H}
          stroke="#1f2937"
          strokeWidth="1"
        />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + INNER_H} stroke="#374151" strokeWidth="1" />

        {graph.fillD && <path d={graph.fillD} fill="url(#fillGrad)" />}
        {graph.pathD && (
          <path
            d={graph.pathD}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow-path)"
          />
        )}
        {graph.lastPt && phase !== "BETTING" && (
          <circle cx={graph.lastPt.x} cy={graph.lastPt.y} r="5" fill={color} filter="url(#glow-path)" />
        )}
      </svg>
    </div>
  );
}
