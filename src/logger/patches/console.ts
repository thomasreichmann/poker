import { logger } from "../index";

const getLogMethod = (consoleMethod: string) => {
  const childLogger = logger.child({ name: "console" });

  switch (consoleMethod) {
    case "error":
      return childLogger.error.bind(childLogger);
    case "warn":
      return childLogger.warn.bind(childLogger);
    case "debug":
      return childLogger.debug.bind(childLogger);
    case "log":
    case "info":
    default:
      return childLogger.info.bind(childLogger);
  }
};

const consoleMethods = ["log", "debug", "info", "warn", "error"];
consoleMethods.forEach((method) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (console as any)[method] = getLogMethod(method);
});
