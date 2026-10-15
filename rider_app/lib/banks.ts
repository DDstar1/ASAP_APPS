import { apiGet } from "./api-client";

// Payout banks come from Rust (GET /payments/banks, Korapay's list), so the
// saved bank_code is always one payouts accept
export type Bank = { name: string; code: string };

let cached: Bank[] | null = null;

export async function getBanks(): Promise<Bank[]> {
  if (cached) return cached;
  const reply = await apiGet<Bank[] | { data: Bank[] }>("/payments/banks");
  const banks = Array.isArray(reply) ? reply : reply?.data ?? [];
  if (banks.length === 0) throw new Error("No banks returned");
  cached = [...banks].sort((a, b) => a.name.localeCompare(b.name));
  return cached;
}
