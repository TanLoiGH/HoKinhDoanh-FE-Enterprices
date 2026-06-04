type ApiErrorPayload = {
  error?: unknown;
  message?: unknown;
  errors?: unknown;
};

function toMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(toMessage).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    const payload = value as ApiErrorPayload;
    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.message === "string") return payload.message;
    if (Array.isArray(payload.errors)) return payload.errors.map(toMessage).filter(Boolean).join(", ");
    if (payload.errors && typeof payload.errors === "object") {
      return Object.values(payload.errors)
        .flatMap((item) => (Array.isArray(item) ? item : [item]))
        .map(toMessage)
        .filter(Boolean)
        .join(", ");
    }
  }
  return "";
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;
  return toMessage(responseData) || fallback;
}
