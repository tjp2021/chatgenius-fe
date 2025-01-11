export class SocketLogger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  debug(message: string, ...args: unknown[]) {
    console.debug(`[${this.prefix}] ${message}`, ...args);
  }

  info(message: string, ...args: unknown[]) {
    console.info(`[${this.prefix}] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    console.warn(`[${this.prefix}] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]) {
    console.error(`[${this.prefix}] ${message}`, ...args);
  }
} 