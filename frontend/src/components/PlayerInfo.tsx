import { useAuthStore } from "@/stores/authStore";
import { useWallet } from "@/hooks/useWallet";
import keycloak from "@/lib/keycloak";

export function PlayerInfo() {
  const user = useAuthStore((s) => s.user);
  const { data: wallet, isLoading } = useWallet();

  return (
    <div className="flex items-center gap-4">
      {/* Balance */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{ background: "#0f0f1a", border: "1px solid #2a2a4a" }}
      >
        <span className="text-xs text-gray-500">Saldo</span>
        {isLoading ? (
          <div className="w-16 h-4 rounded animate-pulse" style={{ background: "#2a2a4a" }} />
        ) : wallet != null ? (
          <span className="font-mono font-bold text-sm" style={{ color: "#00ff88" }}>
            R${wallet.balance.toFixed(2)}
          </span>
        ) : (
          <span className="text-xs text-gray-500">—</span>
        )}
      </div>

      {/* Username */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{ background: "#0f0f1a", border: "1px solid #2a2a4a" }}
      >
        <span className="text-xs text-gray-500">👤</span>
        <span className="text-sm text-gray-200">{user?.username ?? "—"}</span>
      </div>

      {/* Logout */}
      <button
        onClick={() => keycloak.logout()}
        className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded"
        style={{ background: "#16162a" }}
      >
        Sair
      </button>
    </div>
  );
}
