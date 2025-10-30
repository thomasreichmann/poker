/**
 * Smoke test for log origin capture
 * Run with: pnpm tsx src/logger/__dev__/origin-smoke.ts
 */

import { initLogger, logger } from "../index";

function nestedFunction() {
  logger.info({ test: "hello" }, "Test message from nested function");
}

async function main() {
  // Initialize logger before using it
  await initLogger();

  logger.info({ test: "world" }, "Test message from main");
  nestedFunction();

  // Test error logging
  try {
    throw new Error("Test error");
  } catch (err) {
    logger.error({ err }, "Caught test error");
  }
}

main();
