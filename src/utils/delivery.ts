export const resolveDeliveryCharge = (
  source: any,
  fallbackFee: number
): number => {
  const candidates = [
    source?.deliveryCharges,
    source?.deliveryTimeCharges,
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return fallbackFee;
};

