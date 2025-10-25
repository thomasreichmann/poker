import fs from "node:fs";
import type { SourceMapPayload, SourceMapping } from "node:module";
import {
  findSourceMap as findSourceMapCjs,
  SourceMap as NodeSourceMap,
} from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Re-exported type and helpers for reuse by logger/source.ts
export type FrameKind =
  | "project"
  | "vendor"
  | "next"
  | "node"
  | "internal"
  | "unknown";

type CallSite = NodeJS.CallSite;

const g = globalThis as typeof globalThis & {
  __stacktraceMapperInstalled?: boolean;
  // Internal bridge so other modules can reuse mapping/classification
  __stacktraceUtils?: {
    mapCallSite: (cs: NodeJS.CallSite) => NodeJS.CallSite;
    classifyFile: (file: string | null) => FrameKind;
    toAbs: (p: string) => string;
    projectRoot: string;
  };
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

  // --- Color utilities (TTY-aware, opt-out via env) ---
  function supportsColor(): boolean {
    try {
      if (process.env.STACKTRACE_COLOR === '0') return false;
      if (process.env.STACKTRACE_COLOR === '1') return true;
      // Respect standard FORCE_COLOR=0 as opt-out if present
      if (process.env.FORCE_COLOR === '0') return false;
      // Default: on when stdout is a TTY
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stdoutAny: any = typeof process !== 'undefined' ? (process as unknown as { stdout?: { isTTY?: boolean } }).stdout : undefined;
      return !!stdoutAny?.isTTY;
    } catch {
      return false;
    }
  }

  const COLOR_ON = supportsColor();
  const color = {
    dim: (s: string) => (COLOR_ON ? `\x1b[2m${s}\x1b[0m` : s),
    gray: (s: string) => (COLOR_ON ? `\x1b[90m${s}\x1b[0m` : s),
    red: (s: string) => (COLOR_ON ? `\x1b[31m${s}\x1b[0m` : s),
    yellow: (s: string) => (COLOR_ON ? `\x1b[33m${s}\x1b[0m` : s),
    cyan: (s: string) => (COLOR_ON ? `\x1b[36m${s}\x1b[0m` : s),
    bold: (s: string) => (COLOR_ON ? `\x1b[1m${s}\x1b[0m` : s),
  } as const;

  // --- Lightweight JS/TS syntax colorizer for code-frames ---
  const KW = /\b(await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|from|function|if|import|in|instanceof|interface|let|new|null|of|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/g;
  const TYPE_KW = /\b(abstract|as|asserts|declare|implements|keyof|namespace|never|private|protected|public|readonly|satisfies|static|type|unknown)\b/g;
  const NUM = /\b(?:0[xX][\da-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/g;
  const STR = /(['"`])(?:\\.|(?!\1).)*\1/g; // naive string match
  const COMMENT = /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
  const PROP = /(?<=\.)[a-zA-Z_]\w*/g; // .prop
  const IDENT_FN = /\b([A-Za-z_]\w*)\s*(?=\()/g; // foo(

  function colorizeTs(line: string): string {
    try {
      let s = line;
      const wrap = (re: RegExp, tint: (x: string) => string) => {
        s = s.replace(re, (m) => `\u0000${tint(m)}\u0001`);
      };

      wrap(COMMENT, color.gray);
      wrap(STR, color.cyan);
      wrap(NUM, color.yellow);
      wrap(KW, color.bold);
      wrap(TYPE_KW, color.dim);
      wrap(PROP, color.dim);
      wrap(IDENT_FN, (m) => color.bold(m));

      return s.replace(/\u0000|\u0001/g, "");
    } catch {
      return line;
    }
  }

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
            `    ${color.dim(`… ${extra} more project frame${extra > 1 ? "s" : ""} …`)}`
          );
        continue;
      }
      if (kinds[i] === "vendor" || kinds[i] === "next") {
        if (showVendor) {
          // emit vendor/next frames individually
          while (
            i < lines.length &&
            (kinds[i] === "vendor" || kinds[i] === "next")
          ) {
            out.push(lines[i]);
            i++;
          }
          continue;
        }
        let n = 0;
        while (
          i < lines.length &&
          (kinds[i] === "vendor" || kinds[i] === "next")
        ) {
          i++;
          n++;
        }
        if (n > 0)
          out.push(`    ${color.dim(`… ${n} frame${n > 1 ? "s" : ""} from dependencies …`)}`);
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
        const v = Reflect.get(target, prop, receiver);
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
  }

  // kept earlier for reference; classification now drives filtering

  function formatCallSiteShort(cs: CallSite): string {
    const fileAbs = safe(
      () => cs.getFileName?.() ?? cs.getScriptNameOrSourceURL?.(),
      "<anonymous>"
    );
    const line = safe(() => cs.getLineNumber?.(), 0);
    const col = safe(() => cs.getColumnNumber?.(), 0);
    const fn =
      safe(() => cs.getFunctionName?.(), null) ||
      safe(() => cs.getMethodName?.(), null);
    const isAsync = safe(
      () => (cs as unknown as { isAsync?: () => boolean }).isAsync?.() ?? false,
      false
    );

    const fileShown =
      typeof fileAbs === "string" && fileAbs.startsWith(PROJECT_ROOT + path.sep)
        ? fileAbs.slice(PROJECT_ROOT.length + 1)
        : fileAbs;

    const where = `${color.cyan(String(fileShown))}${color.gray(`:${line}:${col}`)}`;
    const label = [isAsync ? color.dim("async ") : "", fn ? color.bold(String(fn)) + " " : ""].join("");

    return `${label}(${where})`;
  }

  function shouldHide(kind: FrameKind): boolean {
    if (kind === "node" || kind === "internal") return true;
    if (kind === "next") return process.env.STACKTRACE_SHOW_VENDOR !== "1";
    return false;
  }

  function buildCodeFrame(
    file: string,
    line: number,
    col: number,
    ctx = 2
  ): string | null {
    try {
      const abs = toAbs(file);
      let contents: string;
      try {
        contents = fs.readFileSync(abs, "utf8");
      } catch {
        return null;
      }
      const allLines = contents.split(/\r?\n/);
      if (line <= 0 || line > allLines.length) return null;

      const start = Math.max(1, line - ctx);
      const end = Math.min(allLines.length, line + ctx);
      const width = String(end).length;

      const out: string[] = [];
      for (let i = start; i <= end; i++) {
        const isTarget = i === line;
        const marker = isTarget ? color.yellow(">") : " ";
        const numStr = String(i).padStart(width, " ");
        const pipe = color.dim(" | ");
        const textRaw = allLines[i - 1] ?? "";
        const text = colorizeTs(textRaw);
        out.push(`${marker} ${color.dim(numStr)}${pipe}${text}`);
        if (isTarget) {
          const caretBase = `  ${" ".repeat(width)} | `; // matches spaces of non-marker line
          const pre = textRaw.slice(0, Math.max(0, col - 1));
          const caretSpaces = pre.replace(/\t/g, "  ").length; // tabs → 2 spaces
          out.push(`${color.dim(caretBase)}${" ".repeat(caretSpaces)}${color.yellow("^")}`);
        }
      }

      return out.join("\n");
    } catch {
      return null;
    }
  }

  Error.prepareStackTrace = (err, structured) => {
    try {
      const frames = Array.isArray(structured) ? (structured as CallSite[]) : [];
      const mapped = frames.map(mapCallSite);

      const rawLines: string[] = [];
      const kinds: FrameKind[] = [];
      let codeFrame: string | null = null;

      for (const cs of mapped) {
        const file = safe(
          () => cs.getFileName?.() ?? cs.getScriptNameOrSourceURL?.() ?? null,
          null
        );
        const kind = classifyFile(file);
        if (shouldHide(kind)) continue;

        rawLines.push(`    at ${formatCallSiteShort(cs)}`);
        kinds.push(kind);

        if (
          !codeFrame &&
          kind === "project" &&
          file &&
          typeof file === "string"
        ) {
          const ln = safe(() => cs.getLineNumber?.() ?? null, null);
          const cl = safe(() => cs.getColumnNumber?.() ?? null, null);
          if (typeof ln === "number" && typeof cl === "number") {
            const ctx = Number(process.env.STACKTRACE_CODEFRAME_CONTEXT ?? "2");
            codeFrame = buildCodeFrame(file, ln, cl, isNaN(ctx) ? 2 : ctx) ?? null;
          }
        }
      }

      const SHOW_VENDOR = process.env.STACKTRACE_SHOW_VENDOR === "1";
      const MAX_PROJECT = Number(process.env.STACKTRACE_MAX_PROJECT ?? "10");
      const pretty = collapseFrames(
        rawLines,
        kinds,
        SHOW_VENDOR,
        isNaN(MAX_PROJECT) ? 10 : MAX_PROJECT
      );

      const head = `${color.red(err.name)}: ${color.bold(err.message)}`;
      const lines = [head, ...pretty];
      if (codeFrame) {
        lines.push("");
        lines.push(color.bold(codeFrame));
      }
      return lines.join("\n");
    } catch {
      return `${err.name}: ${err.message}`;
    }
  };

  // Provide utilities for other modules to reuse mapping/classification in dev
  try {
    g.__stacktraceUtils = {
      mapCallSite,
      classifyFile,
      toAbs,
      projectRoot: PROJECT_ROOT,
    };
  } catch {}
}

// Expose minimal API for reuse (dev-only; no-op fallbacks in prod)
export function mapStructuredStack(frames: NodeJS.CallSite[]): NodeJS.CallSite[] {
  try {
    const utils = g.__stacktraceUtils;
    if (utils?.mapCallSite) return frames.map(utils.mapCallSite);
  } catch {}
  return frames;
}

export function classifyFile(file: string | null): FrameKind {
  try {
    const utils = g.__stacktraceUtils;
    if (utils?.classifyFile) return utils.classifyFile(file);
  } catch {}
  if (!file) return "unknown";
  if (file.startsWith("node:")) return "node";
  const abs = path.isAbsolute(file) ? file : path.resolve(file);
  const cwd = process.cwd();
  if (abs.includes(`${path.sep}node_modules${path.sep}`)) return "vendor";
  if (abs.startsWith(cwd)) return "project";
  if (
    abs.includes(`${path.sep}node${path.sep}internal${path.sep}`) ||
    abs.includes(`${path.sep}internal${path.sep}`)
  )
    return "internal";
  if (abs.includes(`${path.sep}.next${path.sep}`)) return "vendor";
  return "unknown";
}

export function toAbs(p: string): string {
  try {
    const utils = g.__stacktraceUtils;
    if (utils?.toAbs) return utils.toAbs(p);
  } catch {}
  return path.isAbsolute(p) ? p : path.resolve(p);
}

export const PROJECT_ROOT: string = process.cwd();
