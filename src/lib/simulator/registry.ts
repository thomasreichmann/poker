import { BotManager } from "./manager";

const managers = new Map<string, BotManager>();

export function getManager(_tableId: string) {
	return null;
}

export function startManager(_tableId: string) {
	// No-op: replaced by serverless job queue
}

export function stopManager(_tableId: string) {
	// No-op
}
