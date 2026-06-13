import keycloak from "@/lib/keycloak";
import { setAuthToken } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { GamePage } from "./pages/GamePage";
import { LoginPage } from "./pages/LoginPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

function AuthGate() {
  const [status, setStatus] = useState<"loading" | "authenticated" | "anonymous">("loading");
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    keycloak
      .init({
        onLoad: "check-sso",
        pkceMethod: "S256",
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`
      })
      .then((authenticated) => {
        if (authenticated && keycloak.token && keycloak.tokenParsed) {
          setAuthToken(keycloak.token);
          setAuth(
            {
              id: keycloak.tokenParsed.sub ?? "",
              username:
                (keycloak.tokenParsed as Record<string, string>)["preferred_username"] ?? "",
              email: (keycloak.tokenParsed as Record<string, string>)["email"] ?? ""
            },
            keycloak.token
          );
          setStatus("authenticated");
        } else {
          setStatus("anonymous");
        }
      })
      .catch(() => setStatus("anonymous"));

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => keycloak.logout());
    };

    keycloak.onAuthRefreshSuccess = () => {
      if (keycloak.token) {
        setAuthToken(keycloak.token);
      }
    };
  }, [setAuth]);

  if (status === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#07070f" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: "#00ff88", borderTopColor: "transparent" }}
          />
          <p className="text-gray-500 text-sm">Conectando…</p>
        </div>
      </div>
    );
  }

  if (status === "anonymous") return <LoginPage />;
  return <GamePage />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#16162a",
            color: "#e2e8f0",
            border: "1px solid #2a2a4a"
          },
          success: {
            iconTheme: { primary: "#00ff88", secondary: "#000" }
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#fff" }
          }
        }}
      />
    </QueryClientProvider>
  );
}
