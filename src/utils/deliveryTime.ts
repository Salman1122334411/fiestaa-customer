export const formatDeliveryTimeLabel = (
  rawDeliveryTime: unknown,
  fallbackMinutes = 30,
  minutesLabel = "mins"
): string => {
  if (typeof rawDeliveryTime === "number" && Number.isFinite(rawDeliveryTime)) {
    return `${rawDeliveryTime} ${minutesLabel}`;
  }

  if (typeof rawDeliveryTime === "string") {
    const trimmed = rawDeliveryTime.trim();
    if (!trimmed) return `${fallbackMinutes} ${minutesLabel}`;

    const hasUnit = /min|mins|minutes/i.test(trimmed);
    if (hasUnit) return trimmed;

    const numericOrRange = /^\d+(\s*-\s*\d+)?$/.test(trimmed);
    if (numericOrRange) return `${trimmed} ${minutesLabel}`;

    return trimmed;
  }

  return `${fallbackMinutes} ${minutesLabel}`;
};

