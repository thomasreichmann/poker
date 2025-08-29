// Legacy BotManager disabled in favor of serverless scheduling with waitUntil.
// Keeping exports as no-ops to avoid breaking imports.

export function startManager(_tableId: string) {
  // no-op
}

export function stopManager(_tableId: string) {
  // no-op
}
