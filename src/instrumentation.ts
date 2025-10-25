export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NODE_ENV !== "production") {
      await import("./logger/patches/stacktraces");
      // Ensure our stacktrace formatter wins last assignment even if Next applies later
      queueMicrotask(async () => {
        await import("./logger/patches/stacktraces");
      });
    }

    // await import("./logger/patches/next");
    // await import("./logger/patches/console");
  }
}
