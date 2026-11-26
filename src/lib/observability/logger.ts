type LogContext = Record<string, string | number | boolean | null | undefined>;

function write(level: "info" | "warn" | "error", event: string, context: LogContext = {}) {
  const safe = Object.fromEntries(Object.entries(context).filter(([key, value]) => value !== undefined && !/token|secret|password|authorization|data_url/i.test(key)));
  const payload = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...safe });
  if (level === "error") console.error(payload); else if (level === "warn") console.warn(payload); else console.info(payload);
}

export const logger = {
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) => write("error", event, context),
};
