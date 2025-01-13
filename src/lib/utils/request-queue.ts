export class RequestQueue {
  private queue: Map<string, Promise<any>> = new Map();

  async enqueue<T>(key: string, request: () => Promise<T>): Promise<T> {
    // Wait for existing request with same key
    const existing = this.queue.get(key);
    if (existing) {
      await existing;
    }

    // Create new request
    const promise = request().finally(() => {
      if (this.queue.get(key) === promise) {
        this.queue.delete(key);
      }
    });

    this.queue.set(key, promise);
    return promise;
  }
}

// Create a singleton instance
export const requestQueue = new RequestQueue(); 