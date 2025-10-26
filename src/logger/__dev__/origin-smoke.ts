import { logger } from "../index";

function inner() {
  logger.info({ greeting: "hello" }, "origin smoke");
}

export function runSmoke() {
  inner();
}

if (require.main === module) {
  runSmoke();
}
