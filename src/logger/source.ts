import path from "node:path";
import { classifyFile, getProjectRoot, mapStructuredStack } from "./patches/mapping";

export type LogOrigin = {
  absPath: string; // absolute file path (for clickable terminals)
  relPath: string; // project-relative path (pretty display)
  line: number;
  col: number;
  functionName?: string | null;
  isAsync?: boolean;
  kind?: "project" | "vendor" | "next" | "node" | "internal" | "unknown";
};

export interface CaptureOriginOptions {
  // frames to skip from the top; add to the default skip list programmatically
  extraSkip?: number;
  // when true, return vendor frames if no project frame found
  allowFallbackToVendor?: boolean;
}

const PROJECT_ROOT = getProjectRoot();

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function toAbs(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(p);
}

function isSkipped(file: string): boolean {
  const abs = toAbs(file);
  
  // Skip logger internals, but NOT __dev__ test files
  const isLoggerInternals = 
    /[\\/]src[\\/]logger[\\/]/.test(abs) && 
    !/[\\/]__dev__[\\/]/.test(abs);
    
  const isPino = /[\\/]node_modules[\\/]pino/.test(abs);
  const isPinoPretty = /[\\/]node_modules[\\/]pino-pretty/.test(abs);
  
  return isLoggerInternals || isPino || isPinoPretty;
}

function getStructuredFrames(error: Error): NodeJS.CallSite[] {
  const originalPrepare = Error.prepareStackTrace;
  let frames: NodeJS.CallSite[] = [];
  Error.prepareStackTrace = (_, structured) => {
    frames = Array.isArray(structured)
      ? (structured as NodeJS.CallSite[])
      : [];
    // Return empty string - we'll map frames ourselves
    return "";
  };
  void error.stack; // Trigger stack capture
  Error.prepareStackTrace = originalPrepare;
  return frames;
}

export function captureLogOrigin(
  opts?: CaptureOriginOptions
): LogOrigin | null {
  if (typeof process === "undefined" || process.env.NODE_ENV === "production") {
    return null;
  }

  try {
    const e = new Error();
    Error.captureStackTrace(e, captureLogOrigin); // omit this function
    const frames = getStructuredFrames(e);

    // Skip captureLogOrigin itself + any extra requested skips
    const skipCount = 1 + (opts?.extraSkip ?? 0);
    const relevantFrames = frames.slice(skipCount);

    // Map frames through source maps (this will map Turbopack chunks to original TS)
    const mapped = mapStructuredStack(relevantFrames);

    for (const cs of mapped) {
      const file = safe(
        () => cs.getFileName?.() ?? cs.getScriptNameOrSourceURL?.(),
        null
      );
      if (!file) continue;
      if (isSkipped(file)) continue;

      const kind = classifyFile(file);
      if (
        kind !== "project" &&
        !(opts?.allowFallbackToVendor && kind === "vendor")
      ) {
        continue;
      }

      const abs = toAbs(file);
      const rel = abs.startsWith(PROJECT_ROOT + path.sep)
        ? abs.slice(PROJECT_ROOT.length + 1)
        : abs;
      const line = safe(() => cs.getLineNumber?.(), 0) || 0;
      const col = safe(() => cs.getColumnNumber?.(), 0) || 0;
      const fn =
        safe(() => cs.getFunctionName?.() ?? cs.getMethodName?.(), null) ||
        null;
      const isAsync = safe(
        () => (cs as unknown as { isAsync?: () => boolean }).isAsync?.() ?? false,
        false
      );

      return {
        absPath: abs,
        relPath: rel,
        line,
        col,
        functionName: fn,
        isAsync,
        kind,
      };
    }
    return null;
  } catch {
    return null;
  }
}

