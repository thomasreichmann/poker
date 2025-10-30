import fs from "node:fs";
import type { SourceMapPayload, SourceMapping } from "node:module";
import {
  findSourceMap as findSourceMapCjs,
  SourceMap as NodeSourceMap,
} from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

type CallSite = NodeJS.CallSite;

export type FrameKind =
  | "project"
  | "vendor"
  | "next"
  | "node"
  | "internal"
  | "unknown";

const PROJECT_ROOT = process.cwd();

const smCache = new Map<string, NodeSourceMap | null>();
const posCache = new Map<
  string,
  { file: string; line: number; col: number } | null
>();

function toAbs(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(p);
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function normalizeSource(source: string): string {
  if (source.startsWith("file://")) {
    try {
      return fileURLToPath(source);
    } catch {}
  }
  const schemeIdx = source.indexOf("://");
  if (schemeIdx > 0) {
    source = source.slice(schemeIdx + 3);
    while (source.startsWith("/")) source = source.slice(1);
    source = "/" + source;
  }
  if (source.startsWith("[project]/")) {
    source = path.join(PROJECT_ROOT, source.slice("[project]/".length));
  }
  if (!path.isAbsolute(source)) {
    source = path.join(PROJECT_ROOT, source);
  }
  return path.normalize(source);
}

function shouldAttemptMap(file: string | null): boolean {
  if (!file) return false;
  const abs = toAbs(file);
  // Map any Next/Turbopack chunk under .next/**/server/chunks
  if (
    abs.includes(`${path.sep}.next${path.sep}`) &&
    abs.includes(`${path.sep}server${path.sep}`) &&
    abs.includes(`${path.sep}chunks${path.sep}`)
  ) {
    return true;
  }

  // Don't remap already-original project files (non-.next)
  if (
    abs.startsWith(PROJECT_ROOT) &&
    !abs.includes(`${path.sep}.next${path.sep}`)
  ) {
    return false;
  }

  // Default: do not attempt mapping for other in-repo files; avoid unnecessary work
  return false;
}

function tryLoadInlineOrExternalMap(absFile: string): NodeSourceMap | null {
  let code: string;
  try {
    code = fs.readFileSync(absFile, "utf8");
  } catch {
    return null;
  }

  const re = /\/\/[#@]\s*sourceMappingURL=([^\s]+)/g;
  let match: RegExpExecArray | null;
  let url: string | null = null;
  while ((match = re.exec(code)) !== null) {
    url = match[1];
  }
  if (!url) return null;

  try {
    if (url.startsWith("data:")) {
      const comma = url.indexOf(",");
      if (comma === -1) return null;
      const meta = url.slice(5, comma);
      const data = url.slice(comma + 1);
      const isBase64 = /;base64/i.test(meta);
      const jsonStr = isBase64
        ? Buffer.from(data, "base64").toString("utf8")
        : decodeURIComponent(data);
      const json = JSON.parse(jsonStr) as SourceMapPayload;
      return new NodeSourceMap(json);
    }

    const encodedPath = url.startsWith("file://")
      ? fileURLToPath(url)
      : path.isAbsolute(url)
      ? url
      : path.resolve(path.dirname(absFile), url);

    const decodedName = (() => {
      try {
        return decodeURIComponent(url);
      } catch {
        return url;
      }
    })();

    const decodedPath = decodedName.startsWith("file://")
      ? fileURLToPath(decodedName)
      : path.isAbsolute(decodedName)
      ? decodedName
      : path.resolve(path.dirname(absFile), decodedName);

    const candidates = [decodedPath, encodedPath];
    for (const cand of candidates) {
      try {
        const json = JSON.parse(
          fs.readFileSync(cand, "utf8")
        ) as SourceMapPayload;
        return new NodeSourceMap(json);
      } catch {}
    }
    return null;
  } catch {
    return null;
  }
}

function findMap(file: string | null): NodeSourceMap | null {
  if (!file) return null;
  const abs = toAbs(file);
  if (smCache.has(abs)) return smCache.get(abs)!;
  const sm0 = findSourceMapCjs(abs);
  let sm: NodeSourceMap | null = (sm0 as unknown as NodeSourceMap) ?? null;
  if (!sm) {
    sm = tryLoadInlineOrExternalMap(abs);
  }
  smCache.set(abs, sm);
  return sm;
}

function mapPosition(file: string, line: number, column: number) {
  const key = `${file}:${line}:${column}`;
  if (posCache.has(key)) return posCache.get(key)!;

  const sm = findMap(file);
  if (!sm) {
    posCache.set(key, null);
    return null;
  }

  const c0 = Math.max(0, column - 1);
  let entry = sm.findEntry(line, c0) as SourceMapping | null;
  if (!entry || !entry.originalSource || !entry.originalLine) {
    entry = sm.findEntry(line, column) as SourceMapping | null;
  }
  if (!entry || !entry.originalSource || !entry.originalLine) {
    posCache.set(key, null);
    return null;
  }

  const out = {
    file: normalizeSource(entry.originalSource),
    line: entry.originalLine,
    col: (entry.originalColumn ?? 0) + 1,
  };
  posCache.set(key, out);
  return out;
}

export function mapCallSite(cs: CallSite): CallSite {
  const file = cs.getFileName?.() ?? cs.getScriptNameOrSourceURL?.() ?? null;
  const line = cs.getLineNumber?.() ?? null;
  const column = cs.getColumnNumber?.() ?? null;
  if (!file || line == null || column == null) return cs;
  const attempt = shouldAttemptMap(file);
  if (!attempt) return cs;

  const mapped = mapPosition(file, line, column);
  if (!mapped) return cs;

  return new Proxy(cs, {
    get(target, prop, receiver) {
      if (prop === "getFileName" || prop === "getScriptNameOrSourceURL") {
        return () => mapped.file;
      }
      if (prop === "getLineNumber") return () => mapped.line;
      if (prop === "getColumnNumber") return () => mapped.col;
      const v = Reflect.get(target, prop, receiver);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
}

export function mapStructuredStack(
  frames: CallSite[]
): CallSite[] {
  return frames.map(mapCallSite);
}

export function classifyFile(file: string | null): FrameKind {
  if (!file) return "unknown";
  if (file.startsWith("node:")) return "node";
  const abs = toAbs(file);
  if (abs.includes(`${path.sep}.next${path.sep}`)) {
    return abs.includes(`${path.sep}server${path.sep}`) ? "next" : "vendor";
  }
  if (abs.includes(`${path.sep}node_modules${path.sep}`)) return "vendor";
  if (abs.startsWith(PROJECT_ROOT)) return "project";
  if (
    abs.includes(`${path.sep}node${path.sep}internal${path.sep}`) ||
    abs.includes(`${path.sep}internal${path.sep}`)
  )
    return "internal";
  return "unknown";
}

export function getProjectRoot(): string {
  return PROJECT_ROOT;
}

