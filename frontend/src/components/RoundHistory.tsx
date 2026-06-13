import { useGameStore } from "@/stores/gameStore";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface RoundDto {
  id: string;
  status: string;
  crashPoint: number | null;
}

function crashColor(point: number): string {
  if (point < 1.5) return "#ef4444";
  if (point < 2) return "#f97316";
  if (point < 5) return "#facc15";
  if (point < 10) return "#86efac";
  return "#00ff88";
}

function CrashChip({ point }: { point: number }) {
  const color = crashColor(point);
  return (
    <div
      className="flex items-center justify-center rounded px-2 py-1 font-mono text-sm font-bold"
      style={{ background: `${color}1a`, color, border: `1px solid ${color}44` }}
    >
      {point.toFixed(2)}×
    </div>
  );
}

export function RoundHistory() {
  const liveHistory = useGameStore((s) => s.roundHistory);

  const { data } = useQuery({
    queryKey: ["rounds-history"],
    queryFn: async () => {
      const res = await api.get<{ data: RoundDto[] }>("/games/rounds/history?limit=20");
      return res.data.data;
    },
    staleTime: 10_000
  });

  // Merge: live (recent) + REST (older), deduplicate
  const merged = (() => {
    const liveIds = new Set(liveHistory.map((r) => r.roundId));
    const restItems = (data ?? [])
      .filter((r) => !liveIds.has(r.id) && r.crashPoint != null)
      .map((r) => ({ roundId: r.id, crashPoint: r.crashPoint! }));
    return [...liveHistory, ...restItems].slice(0, 20);
  })();

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "#0f0f1a", border: "1px solid #2a2a4a" }}
    >
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Histórico
      </h2>
      {merged.length === 0 ? (
        <div className="text-center text-gray-600 text-sm py-2">Sem histórico</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {merged.map((r) => (
            <CrashChip key={r.roundId} point={r.crashPoint} />
          ))}
        </div>
      )}
    </div>
  );
}
