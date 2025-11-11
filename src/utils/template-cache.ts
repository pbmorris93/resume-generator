import handlebars from 'handlebars';

interface CompiledTemplate {
  template: HandlebarsTemplateDelegate;
  compiledAt: number;
  lastUsed: number;
  useCount: number;
}

/**
 * Template compilation cache for improved performance
 */
class TemplateCache {
  private cache = new Map<string, CompiledTemplate>();
  private readonly MAX_CACHE_SIZE = 10;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  getTemplate(key: string, templateSource: string): HandlebarsTemplateDelegate {
    const now = Date.now();
    
    // Check if template exists in cache and is still valid
    const cached = this.cache.get(key);
    if (cached && (now - cached.compiledAt) < this.CACHE_TTL) {
      cached.lastUsed = now;
      cached.useCount++;
      return cached.template;
    }

    // Compile new template
    const template = handlebars.compile(templateSource);
    
    // Store in cache
    this.cache.set(key, {
      template,
      compiledAt: now,
      lastUsed: now,
      useCount: 1
    });

    // Clean up cache if it gets too large
    this.cleanupCache();

    return template;
  }

  private cleanupCache(): void {
    if (this.cache.size <= this.MAX_CACHE_SIZE) {
      return;
    }

    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Remove expired entries first
    const expiredKeys = entries
      .filter(([_, cached]) => (now - cached.compiledAt) >= this.CACHE_TTL)
      .map(([key]) => key);

    expiredKeys.forEach(key => this.cache.delete(key));

    // If still too large, remove least recently used
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const remainingEntries = Array.from(this.cache.entries());
      remainingEntries.sort(([, a], [, b]) => a.lastUsed - b.lastUsed);
      
      const toRemove = remainingEntries.slice(0, remainingEntries.length - this.MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): {
    size: number;
    maxSize: number;
    entries: Array<{
      key: string;
      compiledAt: number;
      lastUsed: number;
      useCount: number;
      age: number;
    }>;
  } {
    const now = Date.now();
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      entries: Array.from(this.cache.entries()).map(([key, cached]) => ({
        key,
        compiledAt: cached.compiledAt,
        lastUsed: cached.lastUsed,
        useCount: cached.useCount,
        age: now - cached.compiledAt
      }))
    };
  }
}

// Singleton template cache
export const templateCache = new TemplateCache();