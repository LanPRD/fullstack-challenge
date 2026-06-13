import keycloak from "@/lib/keycloak";

export function LoginPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "#07070f" }}
    >
      {/* Logo / Title */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🚀</div>
        <h1
          className="text-5xl font-black tracking-tight mb-2"
          style={{ color: "#00ff88", textShadow: "0 0 30px #00ff8866" }}
        >
          CRASH GAME
        </h1>
        <p className="text-gray-400 text-lg">Multiplayer · Provably Fair · Real Time</p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8 flex flex-col gap-6"
        style={{ background: "#0f0f1a", border: "1px solid #2a2a4a" }}
      >
        <div className="text-center">
          <p className="text-gray-300 text-sm leading-relaxed">
            Faça login com sua conta para apostar e acompanhar o multiplicador em tempo real.
          </p>
        </div>

        <button
          onClick={() => keycloak.login()}
          className="w-full py-3.5 rounded-xl font-bold text-base uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #00ff88, #00cc6e)",
            color: "#000"
          }}
        >
          Entrar com Keycloak
        </button>

        <p className="text-center text-xs text-gray-600">
          Credenciais de teste:{" "}
          <span className="font-mono text-gray-500">player / player123</span>
        </p>
      </div>

      {/* Features */}
      <div className="mt-10 grid grid-cols-3 gap-6 max-w-sm text-center">
        {[
          { icon: "⚡", label: "Tempo real" },
          { icon: "🔐", label: "Provably Fair" },
          { icon: "💰", label: "Apostas seguras" }
        ].map(({ icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <span className="text-2xl">{icon}</span>
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
