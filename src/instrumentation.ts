export async function register() {
  // Ensure patches only run in Node.js runtime
  try {
    if (typeof process !== "undefined" && process.versions?.node) {
      await import("./logger/patches/console");
      await import("./logger/patches/next");
      await import("./logger/patches/dev-requests");
    }
  } catch {
    // Best-effort: ignore if patches fail to load in non-Node runtimes
  }
}
