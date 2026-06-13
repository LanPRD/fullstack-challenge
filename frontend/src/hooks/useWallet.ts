import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface Wallet {
  id: string;
  userId: string;
  balance: number;
  createdAt: string;
}

async function fetchWallet(): Promise<Wallet> {
  const res = await api.get<Wallet>("/wallets/me");
  return res.data;
}

export function useWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: fetchWallet,
    refetchInterval: 5000,
    staleTime: 2000
  });
}
