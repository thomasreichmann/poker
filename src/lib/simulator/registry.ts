import { BotManager } from "./manager";

const managers = new Map<string, BotManager>();

export function getManager(tableId: string): BotManager {
  let mgr = managers.get(tableId);
  if (!mgr) {
    mgr = new BotManager({ tableId });
    managers.set(tableId, mgr);
  }
  return mgr;
}

export function startManager(tableId: string) {
  const mgr = getManager(tableId);
  void mgr.start();
}

export function stopManager(tableId: string) {
  const mgr = managers.get(tableId);
  if (mgr) mgr.stop();
}