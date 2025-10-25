export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./logger/patches/next");
    await import("./logger/patches/console");
  }
}
