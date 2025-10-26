import path from "node:path";
import type { FrameKind } from "./patches/stacktraces";
import {
  PROJECT_ROOT,
  classifyFile as classifyFileFromPatch,
  mapStructuredStack,
  toAbs as toAbsFromPatch,
} from "./patches/stacktraces";

export type LogOrigin = {
  absPath: string;
  relPath: string;
  line: number;
  col: number;
  functionName?: string | null;
  isAsync?: boolean;
  kind?: FrameKind;
};

export interface CaptureOriginOptions {
  extraSkip?: number;
  allowFallbackToVendor?: boolean;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function toAbs(p: string): string {
  return toAbsFromPatch(p);
}

function relToProject(abs: string): string {
  return abs.startsWith(PROJECT_ROOT + path.sep)
    ? abs.slice(PROJECT_ROOT.length + 1)
    : abs;
}

function classifyFile(file: string | null): FrameKind {
  return classifyFileFromPatch(file);
}

function getStructuredFrames(err: Error): NodeJS.CallSite[] {
  const prev = Error.prepareStackTrace as unknown;
  try {
    // return structured frames for this one capture
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Error as any).prepareStackTrace = (_e: unknown, frames: unknown) => frames;
    // materialize stack
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).stack;
    const frames = (err.stack as unknown) as NodeJS.CallSite[];
    return Array.isArray(frames) ? frames : [];
  } catch {
    return [];
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Error as any).prepareStackTrace = prev;
  }
}

// Simple LRU cache keyed by generated location (file:line:col) -> resolved origin
const ORIGIN_CACHE_MAX = 300;
const originCache = new Map<string, LogOrigin>();

function cacheGet(key: string): LogOrigin | undefined {
  return originCache.get(key);
}

function cacheSet(key: string, value: LogOrigin) {
  if (originCache.has(key)) originCache.delete(key);
  originCache.set(key, value);
  if (originCache.size > ORIGIN_CACHE_MAX) {
    const firstKey = originCache.keys().next().value as string | undefined;
    if (firstKey) originCache.delete(firstKey);
  }
}

function isSkippedPath(absPath: string): boolean {
  // Skip our logger internals and pino/pino-pretty
  const nm = `${path.sep}node_modules${path.sep}`;
  if (absPath.includes(`${nm}pino${path.sep}`)) return true;
  if (absPath.includes(`${nm}pino-pretty${path.sep}`)) return true;
  const loggerRoot = path.join(PROJECT_ROOT, "src", "logger") + path.sep;
  if (absPath.startsWith(loggerRoot)) return true;
  return false;
}

export function captureLogOrigin(
  opts?: CaptureOriginOptions
): LogOrigin | null {
  // Early dev-only guard is handled by callers; still safe if used regardless
  const e = new Error("log-origin");
  Error.captureStackTrace(e, captureLogOrigin);
  const rawFrames = getStructuredFrames(e);
  if (!rawFrames.length) return null;

  const mappedFrames = mapStructuredStack(rawFrames);

  const start = Math.max(0, opts?.extraSkip ?? 0);
  let vendorFallbackIndex: number | null = null;

  for (let i = start; i < mappedFrames.length; i++) {
    const cs = mappedFrames[i];
    const file = safe(
      () => cs.getFileName?.() ?? cs.getScriptNameOrSourceURL?.(),
      null
    );
    if (!file) continue;

    const abs = toAbs(String(file));
    if (isSkippedPath(abs)) continue;

    const kind = classifyFile(abs);
    if (kind === "project") {
      const line = safe(() => cs.getLineNumber?.(), 0) || 0;
      const col = safe(() => cs.getColumnNumber?.(), 0) || 0;
      const fn =
        safe(() => cs.getFunctionName?.(), null) ||
        safe(() => cs.getMethodName?.(), null);
      const isAsync = safe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => (cs as any).isAsync?.() ?? false,
        false
      );

      // cache by raw frame at same index (generated position)
      const raw = rawFrames[i];
      const rawFile = safe(
        () => raw.getFileName?.() ?? raw.getScriptNameOrSourceURL?.(),
        null
      );
      const rawLine = safe(() => raw.getLineNumber?.(), 0) || 0;
      const rawCol = safe(() => raw.getColumnNumber?.(), 0) || 0;
      const cacheKey = `${rawFile}:${rawLine}:${rawCol}`;

      const existing = cacheGet(cacheKey);
      if (existing) return existing;

      const origin: LogOrigin = {
        absPath: abs,
        relPath: relToProject(abs),
        line,
        col,
        functionName: fn,
        isAsync,
        kind,
      };
      cacheSet(cacheKey, origin);
      return origin;
    }

    if (vendorFallbackIndex == null && kind === "vendor") {
      vendorFallbackIndex = i;
    }
  }

  if (opts?.allowFallbackToVendor && vendorFallbackIndex != null) {
    const i = vendorFallbackIndex;
    const cs = mappedFrames[i];
    const file = safe(
      () => cs.getFileName?.() ?? cs.getScriptNameOrSourceURL?.(),
      null
    );
    if (!file) return null;
    const abs = toAbs(String(file));
    const line = safe(() => cs.getLineNumber?.(), 0) || 0;
    const col = safe(() => cs.getColumnNumber?.(), 0) || 0;
    const fn =
      safe(() => cs.getFunctionName?.(), null) ||
      safe(() => cs.getMethodName?.(), null);

    const raw = rawFrames[i];
    const rawFile = safe(
      () => raw.getFileName?.() ?? raw.getScriptNameOrSourceURL?.(),
      null
    );
    const rawLine = safe(() => raw.getLineNumber?.(), 0) || 0;
    const rawCol = safe(() => raw.getColumnNumber?.(), 0) || 0;
    const cacheKey = `${rawFile}:${rawLine}:${rawCol}`;

    const existing = cacheGet(cacheKey);
    if (existing) return existing;

    const origin: LogOrigin = {
      absPath: abs,
      relPath: relToProject(abs),
      line,
      col,
      functionName: fn,
      kind: "vendor",
    };
    cacheSet(cacheKey, origin);
    return origin;
  }

  return null;
}
