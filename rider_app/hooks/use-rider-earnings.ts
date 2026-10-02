import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_TIER,
  DriverTier,
  EARNINGS_RATE,
  earningFor,
  getDeliveryFees,
  getDriverTier,
} from "@/lib/earnings";
import { AcceptedDelivery } from "@/store/useAcceptedDeliveriesStore";

// When the delivery finished; falls back to when it was accepted
const completedAt = (d: AcceptedDelivery) =>
  new Date(d.dropoff_time ?? d.delivery_accepted_time ?? 0).getTime();

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Week starts on Monday
const startOfWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
};

/** The rider's share of each delivered order, plus today/week/all totals. */
export function useRiderEarnings(deliveredDeliveries: AcceptedDelivery[]) {
  const [tier, setTier] = useState<DriverTier | null>(null);
  const [fees, setFees] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const references = useMemo(
    () =>
      deliveredDeliveries
        .map((d) => d.payment_reference)
        .filter((ref): ref is string => !!ref),
    [deliveredDeliveries],
  );

  const reload = useCallback(async () => {
    const [tierResult, feeResult] = await Promise.all([
      getDriverTier(),
      getDeliveryFees(references),
    ]);
    setTier(tierResult);
    setFees(feeResult);
    setLoading(false);
  }, [references.join(",")]);

  useEffect(() => {
    reload();
  }, [reload]);

  const effectiveTier = tier ?? DEFAULT_TIER;
  const ratePercent = Math.round(EARNINGS_RATE[effectiveTier] * 100);

  const rows = useMemo(
    () =>
      deliveredDeliveries
        .map((d) => {
          const fee = d.payment_reference ? fees[d.payment_reference] : undefined;
          return {
            delivery: d,
            fee,
            earning: fee != null ? earningFor(fee, effectiveTier) : null,
            at: completedAt(d),
          };
        })
        .sort((a, b) => b.at - a.at),
    [deliveredDeliveries, fees, effectiveTier],
  );

  const totals = useMemo(() => {
    const today = startOfToday();
    const week = startOfWeek();
    let all = 0;
    let thisWeek = 0;
    let todayTotal = 0;
    for (const r of rows) {
      if (r.earning == null) continue;
      all += r.earning;
      if (r.at >= week) thisWeek += r.earning;
      if (r.at >= today) todayTotal += r.earning;
    }
    return { all, thisWeek, today: todayTotal };
  }, [rows]);

  return { tier, ratePercent, loading, rows, totals, reload };
}
