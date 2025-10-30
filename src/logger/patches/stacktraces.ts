import fs from "node:fs";
import path from "node:path";
import {
  classifyFile,
  getProjectRoot,
  mapCallSite,
  mapStructuredStack,
  type FrameKind,
} from "./mapping";

type CallSite = NodeJS.CallSite;

const g = globalThis as typeof globalThis & {
  __stacktraceMapperInstalled?: boolean;
};

if (!g.__stacktraceMapperInstalled) {
  g.__stacktraceMapperInstalled = true;

  // Capture for debugging if needed; intentionally not used since we self-format
  // const originalPrepare = Error.prepareStackTrace;
  const PROJECT_ROOT = getProjectRoot();

  // --- Color utilities (TTY-aware, opt-out via env) ---
  function supportsColor(): boolean {
    try {
      if (process.env.STACKTRACE_COLOR === "0") return false;
      if (process.env.STACKTRACE_COLOR === "1") return true;
      // Respect standard FORCE_COLOR=0 as opt-out if present
      if (process.env.FORCE_COLOR === "0") return false;
      // Default: on when stdout is a TTY
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stdoutAny: any =
        typeof process !== "undefined"
          ? (process as unknown as { stdout?: { isTTY?: boolean } }).stdout
          : undefined;
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
  const KW =
    /\b(await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|from|function|if|import|in|instanceof|interface|let|new|null|of|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/g;
  const TYPE_KW =
    /\b(abstract|as|asserts|declare|implements|keyof|namespace|never|private|protected|public|readonly|satisfies|static|type|unknown)\b/g;
  const NUM =
    /\b(?:0[xX][\da-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/g;
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

  function toAbs(p: string) {
    return path.isAbsolute(p) ? p : path.resolve(p);
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
            `    ${color.dim(
              `… ${extra} more project frame${extra > 1 ? "s" : ""} …`
            )}`
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
          out.push(
            `    ${color.dim(`… ${n} frame${n > 1 ? "s" : ""} hidden …`)}`
          );
        continue;
      }
      out.push(lines[i]);
      i++;
    }
    return out;
  }

  function safe<T>(fn: () => T, fallback: T): T {
    try {
      return fn();
    } catch {
      return fallback;
    }
  }

  // kept earlier for reference; classification now drives filtering

  function formatCallSiteShort(cs: CallSite): string {
    const fileAbs =
      safe(
        () => cs.getFileName?.() ?? cs.getScriptNameOrSourceURL?.(),
        "<anonymous>"
      ) ?? "<anonymous>";
    const line = safe(() => cs.getLineNumber?.() ?? null, null) ?? 0;
    const col = safe(() => cs.getColumnNumber?.() ?? null, null) ?? 0;
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
        : fileAbs ?? "<anonymous>";

    const where = `${color.cyan(String(fileShown))}${color.gray(
      `:${line}:${col}`
    )}`;
    const label = [
      isAsync ? color.dim("async ") : "",
      fn ? color.bold(String(fn)) + " " : "",
    ].join("");

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
          out.push(
            `${color.dim(caretBase)}${" ".repeat(caretSpaces)}${color.yellow(
              "^"
            )}`
          );
        }
      }

      return out.join("\n");
    } catch {
      return null;
    }
  }

  Error.prepareStackTrace = (err, structured) => {
    try {
      const frames = Array.isArray(structured)
        ? (structured as CallSite[])
        : [];
      const mapped = mapStructuredStack(frames);

      const rawLines: string[] = [];
      const kinds: FrameKind[] = [];
      let codeFrame: string | null = null;

      for (const cs of mapped) {
        const file = safe(
          () => cs.getFileName?.() ?? cs.getScriptNameOrSourceURL?.() ?? null,
          null
        );
        // Skip frames with null file - they're not useful for debugging
        if (!file) continue;
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
            codeFrame =
              buildCodeFrame(file, ln, cl, isNaN(ctx) ? 2 : ctx) ?? null;
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
}
