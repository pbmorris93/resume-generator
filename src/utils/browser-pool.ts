import { chromium, Browser, BrowserContext, Page } from 'playwright';

/**
 * Browser pool for reusing Playwright instances to improve performance
 */
class BrowserPool {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private isShuttingDown = false;
  private lastUsed = Date.now();
  private readonly IDLE_TIMEOUT = 10000; // 10 seconds (reduced for better memory management)
  private idleTimer: NodeJS.Timeout | null = null;

  async getBrowserPage(): Promise<Page> {
    if (this.isShuttingDown) {
      throw new Error('Browser pool is shutting down');
    }

    await this.ensureBrowser();
    this.lastUsed = Date.now();
    this.resetIdleTimer();

    if (!this.context) {
      throw new Error('Browser context not available');
    }

    const page = await this.context.newPage();
    
    // Configure page for optimal performance
    await page.setViewportSize({ width: 794, height: 1123 }); // A4 size
    
    // Block unnecessary resources to improve performance
    await page.route('**/*', (route) => {
      const url = route.request().url();
      const resourceType = route.request().resourceType();
      
      // Allow only document, stylesheet, and font resources
      if (['document', 'stylesheet', 'font'].includes(resourceType)) {
        if (url.startsWith('file://') || url.startsWith('data:') || url.startsWith('blob:')) {
          route.continue();
        } else {
          route.abort('internetdisconnected');
        }
      } else {
        // Block images, scripts, XHR, etc. for faster loading
        route.abort('blockedbyclient');
      }
    });

    return page;
  }

  async releasePage(page: Page): Promise<void> {
    try {
      // Clear page content and cookies before closing
      await page.evaluate(() => {
        // Clear DOM and force garbage collection
        document.body.innerHTML = '';
        if (window.gc) {
          window.gc();
        }
      });
      
      await page.close();
      
      // Force garbage collection in Node.js if available
      if (global.gc) {
        global.gc();
      }
    } catch (error) {
      console.warn('Error closing page:', error);
    }
  }

  private async ensureBrowser(): Promise<void> {
    if (!this.browser || !this.browser.isConnected()) {
      await this.createBrowser();
    }

    if (!this.context) {
      await this.createContext();
    }
  }

  private async createBrowser(): Promise<void> {
    this.browser = await chromium.launch({ 
      headless: true,
      // Performance optimizations
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-background-timer-throttling',
        '--disable-background-media-suspend',
        '--no-first-run',
        '--no-default-browser-check',
        '--memory-pressure-off',
        '--max-old-space-size=128', // Limit V8 heap to 128MB
      ]
    });
  }

  private async createContext(): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not available');
    }

    this.context = await this.browser.newContext({
      // Disable images and other resources for faster loading
      ignoreHTTPSErrors: true,
      offline: true,
      // Reduce memory usage
      viewport: { width: 794, height: 1123 },
      deviceScaleFactor: 1,
    });
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    
    this.idleTimer = setTimeout(() => {
      this.shutdown();
    }, this.IDLE_TIMEOUT);
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
    } catch (error) {
      console.warn('Error closing browser context:', error);
    }

    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.warn('Error closing browser:', error);
    }

    this.isShuttingDown = false;
  }

  getStats(): { 
    hasBrowser: boolean; 
    hasContext: boolean; 
    lastUsed: number; 
    idleDuration: number;
  } {
    return {
      hasBrowser: !!this.browser,
      hasContext: !!this.context,
      lastUsed: this.lastUsed,
      idleDuration: Date.now() - this.lastUsed
    };
  }
}

// Singleton browser pool instance
const browserPool = new BrowserPool();

// Ensure cleanup on process exit
process.on('exit', () => {
  browserPool.shutdown();
});

process.on('SIGINT', async () => {
  await browserPool.shutdown();
  if (process.env.NODE_ENV !== 'test') {
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  await browserPool.shutdown();
  if (process.env.NODE_ENV !== 'test') {
    process.exit(0);
  }
});

export { browserPool };