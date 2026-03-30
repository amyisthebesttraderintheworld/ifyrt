export function logInfo(service: string, message: string, details?: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      level: "info",
      service,
      message,
      details,
      timestamp: new Date().toISOString()
    })
  );
}

export function logError(service: string, message: string, details?: Record<string, unknown>): void {
  console.error(
    JSON.stringify({
      level: "error",
      service,
      message,
      details,
      timestamp: new Date().toISOString()
    })
  );
}
