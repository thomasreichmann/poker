import type { GameDataTransportKind } from "./types";

const DEFAULT_BLOCK_MESSAGE =
  "Esta ação não está disponível no modo de demonstração.";

export function isMockTransport(
  kind: GameDataTransportKind | undefined | null
): boolean {
  return kind === "mock";
}

export function ensureLiveTransportAction(params: {
  isMock: boolean;
  notify: (message: string) => void;
  message?: string;
}): boolean {
  const { isMock, notify, message = DEFAULT_BLOCK_MESSAGE } = params;
  if (isMock) {
    notify(message);
    return false;
  }
  return true;
}
