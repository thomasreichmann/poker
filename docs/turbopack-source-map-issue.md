# Turbopack server stack traces and source maps in production: what we hit and how we addressed it

## Context

- **Stack traces in production** were showing bundled `.next/server/.../chunks/*.js` paths instead of our TypeScript files. This made triage slower and links in logs non-actionable.
- Turning on browser/source maps for production (`productionBrowserSourceMaps`) is unrelated to Node/server stack traces and also risks exposing source in client bundles.
- Next.js (15+) with Turbopack overrides `Error.prepareStackTrace`, which prevents Node’s built-in source-map integration from mapping server error stacks.

## Symptoms we observed (production)

- Error stacks referenced `.next/server/**/chunks/*.js` and minified columns.
- Some logs from Next/console were not unified with our Pino pipeline, making correlation harder.
- Attempting to rely on “just enable source maps in prod” was not viable: it doesn’t affect Node error stacks and can increase exposure/perf risk on the client.

## Root cause

- Next.js’s patch to `Error.prepareStackTrace` disables default source-map resolution for server errors, so Node cannot translate `.next/server/chunks` frames back to original sources—even when source maps exist on disk.
- Turbopack produces chunked server output, so unmapped stacks point at those chunks by default.

## Our approach

We implemented a targeted server-side remapping and formatting pipeline and unified logging, while keeping production risk low.

- **Targeted frame remapping (server-only):**
  - Map only server chunk frames under `.next/**/server/chunks/**` back to original sources using Node’s `module.findSourceMap` and, when needed, inline/external `sourceMappingURL` files.
  - Leave already-original project files untouched and avoid remapping arbitrary vendor paths.
- **Readable, actionable stacks:**
  - Classify frames (project/vendor/next/node/internal), hide noise by default, and optionally include an ANSI code frame with a caret on the exact column.
  - Provide env toggles to control verbosity without code changes: `STACKTRACE_SHOW_VENDOR`, `STACKTRACE_MAX_PROJECT`, `STACKTRACE_CODEFRAME_CONTEXT`, `STACKTRACE_COLOR`.
- **Log unification:**
  - Provide patches to route `console.*` and Next’s internal logger through our Pino logger for a single, consistent pipeline.
- **Operational stance:**
  - Keep pretty/verbose mapping enabled in development where it’s most useful.
  - Keep production logs JSON and conservative; enable the remapper/formatting only if/when needed via imports and env flags.

## Implementation highlights

- Frame remapping and classification:

  ```typescript
  // src/logger/patches/mapping.ts
  export function mapCallSite(cs: CallSite): CallSite {
    /* maps .next/server/chunks to original TS */
  }
  export function mapStructuredStack(frames: CallSite[]): CallSite[] {
    /* batch map */
  }
  export function classifyFile(file: string | null): FrameKind {
    /* project/vendor/next/node/internal */
  }
  ```

- Custom stack formatter (installs our `Error.prepareStackTrace`):

  ```typescript
  // src/logger/patches/stacktraces.ts
  Error.prepareStackTrace = (err, structured) => {
    const mapped = mapStructuredStack(structured as CallSite[]);
    // build filtered, colorized lines and optional code-frame
    return lines.join("\n");
  };
  ```

- Next/console log routing (optional):

  ```typescript
  // src/logger/patches/next.ts
  // Rebind Next’s internal logger methods to our pino child logger

  // src/logger/patches/console.ts
  // Redirect console methods to pino so everything lands in one pipeline
  ```

- Logger setup (dev origin capture; production JSON):

  ```typescript
  // src/logger/index.ts
  // In dev we add clickable origin metadata via captureLogOrigin; in prod we keep JSON output
  ```

- Wiring in the app:
  ```typescript
  // src/instrumentation.ts
  export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      // Enable the formatter/mapping where we want it.
      // Dev by default; can be enabled in prod if needed.
      // await import("./logger/patches/stacktraces");
      // await import("./logger/patches/next");
      // await import("./logger/patches/console");
    }
  }
  ```

## Why we chose this

- Avoids shipping or exposing browser source maps in production.
- Gives us high-signal stacks during development and an opt-in path for production issues.
- Keeps production logging lightweight and structured, while enabling deeper context when explicitly turned on.

## How to enable/adjust in production if needed

- Import the patches under `src/instrumentation.ts` for the Node runtime:
  - `./logger/patches/stacktraces` (stack remapper/formatter)
  - `./logger/patches/next` (Next logger → Pino)
  - `./logger/patches/console` (console → Pino)
- Tune verbosity via env:
  - `STACKTRACE_SHOW_VENDOR=1` to include vendor/Next frames
  - `STACKTRACE_MAX_PROJECT=20` to keep more project frames
  - `STACKTRACE_CODEFRAME_CONTEXT=2` for code-frame radius
  - `STACKTRACE_COLOR=0` to disable ANSI color

## Before/after (illustrative)

```text
Before (prod):
Error: X
    at createTRPCContext (.next/server/chunks/[root-of-the-server]__abc123.js:939:15)
    at handler (...)

After (mapped):
Error: X
    at createTRPCContext (src/server/trpc/context.ts:42:15)
    at handler (src/pages/api/example.ts:10:5)
```

## Files of interest

- `src/logger/patches/mapping.ts`: Source map discovery (Node’s `module.findSourceMap`, inline/external URLs), frame mapping, frame classification.
- `src/logger/patches/stacktraces.ts`: Installs `Error.prepareStackTrace`, maps frames, hides noise, optional code frame (Shiki-based when available), env toggles.
- `src/logger/patches/next.ts`: Routes Next’s logger through Pino.
- `src/logger/patches/console.ts`: Routes console through Pino.
- `src/logger/index.ts`: Pino setup (pretty in dev, JSON in prod) and dev origin capture.
- `src/instrumentation.ts`: Single place to enable patches for Node runtime.

## Sources

- Next.js issue: SourceMap `prepareStackTrace` patch minifies server stack trace (Turbopack server stacks unmapped)
  - https://github.com/vercel/next.js/issues/74646
- Node.js docs: Command-line API (source maps, `--enable-source-maps`, and effects of overriding `Error.prepareStackTrace`)
  - https://nodejs.org/api/cli.html
- Node.js docs: Modules API (`module.findSourceMap`, source map entries/origin)
  - https://nodejs.org/api/module.html
- GitHub Discussion: Turbopack – Failed to get source map / `productionBrowserSourceMaps` context (dev vs prod implications)
  - https://github.com/vercel/next.js/discussions/71957
- StackOverflow: Next.js – Use source maps for errors during build/pre-render (server stack traces and mapping)
  - https://stackoverflow.com/questions/74295514/next-js-use-source-maps-for-errors-during-build-pre-render
