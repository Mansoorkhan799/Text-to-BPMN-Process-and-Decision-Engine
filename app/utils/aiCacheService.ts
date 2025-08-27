interface CachedResponse {
  response: string;
  timestamp: number;
  taskType: string;
  inputHash: string;
  metadata: any;
}

interface CacheEntry {
  [key: string]: CachedResponse;
}

class AICacheService {
  private cache: CacheEntry = {};
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of cached items

  // Generate a hash for the input to use as cache key
  private generateHash(input: string, taskType: string): string {
    const combined = `${taskType}:${input}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Check if a response is cached and still valid
  public getCachedResponse(input: string, taskType: string): CachedResponse | null {
    const hash = this.generateHash(input, taskType);
    const cached = this.cache[hash];

    if (!cached) return null;

    // Check if cache is still valid
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      // Remove expired cache entry
      delete this.cache[hash];
      return null;
    }

    return cached;
  }

  // Cache a new response
  public cacheResponse(input: string, taskType: string, response: string, metadata: any = {}): void {
    const hash = this.generateHash(input, taskType);
    
    // Check cache size and remove oldest entries if necessary
    this.cleanupCache();

    this.cache[hash] = {
      response,
      timestamp: Date.now(),
      taskType,
      inputHash: hash,
      metadata
    };
  }

  // Clean up expired entries and limit cache size
  private cleanupCache(): void {
    const now = Date.now();
    const entries = Object.entries(this.cache);
    
    // Remove expired entries
    entries.forEach(([hash, entry]) => {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        delete this.cache[hash];
      }
    });

    // If still too many entries, remove oldest ones
    if (Object.keys(this.cache).length >= this.MAX_CACHE_SIZE) {
      const sortedEntries = entries
        .filter(([_, entry]) => now - entry.timestamp <= this.CACHE_DURATION)
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest entries
      const toRemove = sortedEntries.slice(0, sortedEntries.length - this.MAX_CACHE_SIZE + 1);
      toRemove.forEach(([hash]) => {
        delete this.cache[hash];
      });
    }
  }

  // Get cache statistics
  public getCacheStats(): {
    totalEntries: number;
    cacheSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const entries = Object.values(this.cache);
    const now = Date.now();
    
    // Filter out expired entries
    const validEntries = entries.filter(entry => 
      now - entry.timestamp <= this.CACHE_DURATION
    );

    if (validEntries.length === 0) {
      return {
        totalEntries: 0,
        cacheSize: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }

    const timestamps = validEntries.map(entry => entry.timestamp);
    return {
      totalEntries: validEntries.length,
      cacheSize: this.MAX_CACHE_SIZE,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps)
    };
  }

  // Clear all cache
  public clearCache(): void {
    this.cache = {};
  }

  // Remove specific cache entry
  public removeCacheEntry(input: string, taskType: string): boolean {
    const hash = this.generateHash(input, taskType);
    if (this.cache[hash]) {
      delete this.cache[hash];
      return true;
    }
    return false;
  }
}

// Export singleton instance
const aiCacheService = new AICacheService();
export default aiCacheService;


