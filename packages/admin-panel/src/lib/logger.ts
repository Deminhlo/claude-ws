export function createLogger(prefix: string) {
  return {
    info: (message: string, ...args: any[]) => {
      console.log(`[INFO] [${prefix}]`, message, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(`[ERROR] [${prefix}]`, message, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`[WARN] [${prefix}]`, message, ...args);
    },
    debug: (message: string, ...args: any[]) => {
      if (process.env.DEBUG) {
        console.debug(`[DEBUG] [${prefix}]`, message, ...args);
      }
    },
  };
}
