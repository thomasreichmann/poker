import fs from "node:fs";
import type { SourceMapPayload, SourceMapping } from "node:module";
import {
  findSourceMap as findSourceMapCjs,
  SourceMap as NodeSourceMap,
} from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

type CallSite = NodeJS.CallSite;

const g = globalThis as typeof globalThis & {
  __stacktraceMapperInstalled?: boolean;
};

if (!g.__stacktraceMapperInstalled) {
  g.__stacktraceMapperInstalled = true;

  // Capture for debugging if needed; intentionally not used since we self-format
  // const originalPrepare = Error.prepareStackTrace;
  const PROJECT_ROOT = process.cwd();

  const smCache = new Map<string, NodeSourceMap | null>();
  const posCache = new Map<
    string,
    { file: string; line: number; col: number } | null
  >();

  function relToProject(abs: string) {
    return abs.startsWith(PROJECT_ROOT + path.sep)
      ? abs.slice(PROJECT_ROOT.length + 1)
      : abs;
  }

  type FrameKind =
    | "project"
    | "vendor"
    | "next"
    | "node"
    | "internal"
    | "unknown";

  function classifyFile(file: string | null): FrameKind {
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

  function collapseFrames(
    lines: string[],
    kinds: FrameKind[],
    showVendor: boolean,
    maxProjectFrames: number
  ): string[] {
    if (showVendor) return lines;
    const out: string[] = [];
    let i = 0;
    while (i < lines.length) {
      if (kinds[i] === "project") {
        let kept = 0;
        while (
          i < lines.length &&
          kinds[i] === "project" &&
          kept < maxProjectFrames
        ) {
          out.push(lines[i]);
          i++;
          kept++;
        }
        let extra = 0;
        while (i < lines.length && kinds[i] === "project") {
          i++;
          extra++;
        }
        if (extra > 0)
          out.push(
            `    … ${extra} more project frame${extra > 1 ? "s" : ""} …`
          );
        continue;
      }
      if (kinds[i] === "vendor" || kinds[i] === "next") {
        let n = 0;
        while (
          i < lines.length &&
          (kinds[i] === "vendor" || kinds[i] === "next")
        ) {
          i++;
          n++;
        }
        if (n > 0)
          out.push(`    … ${n} frame${n > 1 ? "s" : ""} from dependencies …`);
        continue;
      }
      out.push(lines[i]);
      i++;
    }
    return out;
  }

  // no-op: previously used for env-safe reads; kept minimal and unused now

  function toAbs(p: string) {
    return path.isAbsolute(p) ? p : path.resolve(p);
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

  function mapCallSite(cs: CallSite): CallSite {
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
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  // kept earlier for reference; classification now drives filtering

  function formatCallSite(cs: CallSite): string {
    let filePath = "<anonymous>";
    let ln = 0;
    let cl = 0;
    try {
      filePath =
        cs.getFileName?.() ?? cs.getScriptNameOrSourceURL?.() ?? filePath;
    } catch {}
    try {
      ln = cs.getLineNumber?.() ?? ln;
    } catch {}
    try {
      cl = cs.getColumnNumber?.() ?? cl;
    } catch {}
    const shown =
      filePath === "<anonymous>" ? filePath : relToProject(filePath);
    return `${shown}:${ln}:${cl}`;
  }

  Error.prepareStackTrace = (err, structured) => {
    try {
      const frames = Array.isArray(structured)
        ? (structured as CallSite[])
        : [];
      const mapped = frames.map(mapCallSite);

      const rawLines: string[] = [];
      const kinds: FrameKind[] = [];
      for (const cs of mapped) {
        const file =
          cs.getFileName?.() ?? cs.getScriptNameOrSourceURL?.() ?? null;
        const kind = classifyFile(file);
        if (kind === "node" || kind === "internal" || kind === "next") continue;
        rawLines.push(`    at ${formatCallSite(cs)}`);
        kinds.push(kind);
      }

      const SHOW_VENDOR = process.env.STACKTRACE_SHOW_VENDOR === "1";
      const MAX_PROJECT = Number(process.env.STACKTRACE_MAX_PROJECT ?? "10");
      const pretty = collapseFrames(
        rawLines,
        kinds,
        SHOW_VENDOR,
        isNaN(MAX_PROJECT) ? 10 : MAX_PROJECT
      );
      return [`${err.name}: ${err.message}`, ...pretty].join("\n");
    } catch {
      return `${err.name}: ${err.message}`;
    }
  };
}
