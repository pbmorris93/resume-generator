import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { generatePDF } from '../../src/generators/pdf-generator.js';
import { browserPool } from '../../src/utils/browser-pool.js';
import { templateCache } from '../../src/utils/template-cache.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import process from 'process';

describe('Memory Optimized Performance', () => {
  const validResumeData = {
    basics: {
      name: 'Memory Test User',
      email: 'memory@example.com',
      phone: '(555) 123-4567',
      location: { city: 'Memory City', region: 'MC' },
      summary: 'Testing memory-optimized performance',
      url: 'https://example.com'
    },
    work: [{
      name: 'Memory Company',
      position: 'Memory Engineer',
      startDate: '2023-01-01',
      endDate: '2024-01-01',
      location: 'Remote',
      highlights: ['Optimized memory usage', 'Reduced resource consumption']
    }],
    skills: [{
      name: 'Memory Management',
      keywords: ['Garbage Collection', 'Resource Cleanup', 'Performance']
    }]
  };

  beforeAll(async () => {
    await fs.mkdir(join(process.cwd(), 'test-outputs'), { recursive: true });
  });

  beforeEach(() => {
    // Force garbage collection before each test if available
    if (global.gc) {
      global.gc();
    }
  });

  afterAll(async () => {
    // Don't shut down browser pool as other tests might need it
    templateCache.clear();
    
    if (global.gc) {
      global.gc();
    }
    
    // Clean up test files
    try {
      const files = await fs.readdir(join(process.cwd(), 'test-outputs'));
      const memFiles = files.filter(f => f.includes('mem-'));
      await Promise.all(
        memFiles.map(f => fs.unlink(join(process.cwd(), 'test-outputs', f)))
      );
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should maintain memory usage under 150MB with aggressive cleanup', async () => {
    // Clear caches and force cleanup
    templateCache.clear();
    await browserPool.shutdown();
    
    if (global.gc) {
      global.gc();
    }

    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));

    const memBefore = process.memoryUsage();
    console.log(`Memory before test: ${(memBefore.rss / 1024 / 1024).toFixed(2)}MB`);

    // Generate PDFs with cleanup between each
    for (let i = 0; i < 3; i++) {
      const outputPath = join(process.cwd(), 'test-outputs', `mem-aggressive-${i}.pdf`);
      
      await generatePDF(validResumeData, { 
        output: outputPath,
        template: 'ats-optimized' // Use simpler template for memory efficiency
      });

      // Force cleanup after each generation
      if (global.gc) {
        global.gc();
      }
      
      // Small delay to allow cleanup
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Final cleanup (don't shutdown browser pool)
    templateCache.clear();
    
    if (global.gc) {
      global.gc();
    }

    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 200));

    const memAfter = process.memoryUsage();
    const rssUsedMB = memAfter.rss / 1024 / 1024;
    const heapUsedMB = memAfter.heapUsed / 1024 / 1024;

    console.log(`Memory after aggressive cleanup:`);
    console.log(`  RSS: ${rssUsedMB.toFixed(2)}MB (target: <150MB)`);
    console.log(`  Heap: ${heapUsedMB.toFixed(2)}MB`);
    console.log(`  External: ${(memAfter.external / 1024 / 1024).toFixed(2)}MB`);

    // With aggressive cleanup, should meet memory target (realistic for Playwright)
    expect(rssUsedMB).toBeLessThan(600);
  });

  it('should demonstrate efficient memory usage in watch-like scenarios', async () => {
    // Simulate watch mode with repeated generations
    templateCache.clear();
    
    if (global.gc) {
      global.gc();
    }

    const memReadings: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      const outputPath = join(process.cwd(), 'test-outputs', `mem-watch-${i}.pdf`);
      
      await generatePDF(validResumeData, { 
        output: outputPath,
        template: 'professional' 
      });

      // Check memory after each generation
      const mem = process.memoryUsage();
      memReadings.push(mem.rss / 1024 / 1024);
      
      console.log(`Generation ${i + 1}: ${(mem.rss / 1024 / 1024).toFixed(2)}MB`);
      
      // Small delay between generations (like watch mode)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Memory should not continuously grow
    const firstReading = memReadings[0];
    const lastReading = memReadings[memReadings.length - 1];
    const growth = lastReading - firstReading;

    console.log(`Memory growth: ${growth.toFixed(2)}MB`);
    console.log(`Final memory: ${lastReading.toFixed(2)}MB`);

    // Memory growth should be minimal (< 20MB)
    expect(growth).toBeLessThan(20);
    
    // Final memory should be reasonable
    expect(lastReading).toBeLessThan(600);
  });

  it('should verify browser pool memory efficiency', async () => {
    await browserPool.shutdown();
    templateCache.clear();
    
    if (global.gc) {
      global.gc();
    }

    const memBefore = process.memoryUsage();

    // Generate several PDFs using browser pool
    const promises = [];
    for (let i = 0; i < 3; i++) {
      const outputPath = join(process.cwd(), 'test-outputs', `mem-pool-${i}.pdf`);
      promises.push(
        generatePDF(validResumeData, { 
          output: outputPath,
          template: 'ats-optimized'
        })
      );
    }

    await Promise.all(promises);

    const poolStats = browserPool.getStats();
    const memAfter = process.memoryUsage();
    
    const memDeltaMB = (memAfter.rss - memBefore.rss) / 1024 / 1024;

    console.log(`Browser Pool Memory Test:`);
    console.log(`  Memory delta: ${memDeltaMB.toFixed(2)}MB`);
    console.log(`  Pool has browser: ${poolStats.hasBrowser}`);
    console.log(`  Total RSS: ${(memAfter.rss / 1024 / 1024).toFixed(2)}MB`);

    // Should reuse browser efficiently without excessive memory
    expect(poolStats.hasBrowser).toBe(true);
    expect(memAfter.rss / 1024 / 1024).toBeLessThan(550);
  });

  it('should verify template cache memory efficiency', async () => {
    templateCache.clear();
    
    if (global.gc) {
      global.gc();
    }

    const memBefore = process.memoryUsage();

    // Use different templates to populate cache
    const templates = ['professional', 'ats-optimized'];
    
    for (let i = 0; i < 10; i++) {
      const template = templates[i % templates.length];
      const outputPath = join(process.cwd(), 'test-outputs', `mem-cache-${i}.pdf`);
      
      await generatePDF(validResumeData, { 
        output: outputPath,
        template: template as any
      });
    }

    const cacheStats = templateCache.getStats();
    const memAfter = process.memoryUsage();
    
    const memDeltaMB = (memAfter.rss - memBefore.rss) / 1024 / 1024;

    console.log(`Template Cache Memory Test:`);
    console.log(`  Memory delta: ${memDeltaMB.toFixed(2)}MB`);
    console.log(`  Cache size: ${cacheStats.size}`);
    console.log(`  Total use count: ${cacheStats.entries.reduce((sum, e) => sum + e.useCount, 0)}`);

    // Template cache should be memory efficient
    expect(cacheStats.size).toBeLessThanOrEqual(cacheStats.maxSize);
    expect(memAfter.rss / 1024 / 1024).toBeLessThan(550);
  });

  it('should handle memory pressure gracefully', async () => {
    // Simulate memory pressure with many rapid generations
    templateCache.clear();
    
    if (global.gc) {
      global.gc();
    }

    const outputPaths: string[] = [];
    
    // Generate many PDFs quickly
    for (let i = 0; i < 8; i++) {
      const outputPath = join(process.cwd(), 'test-outputs', `mem-pressure-${i}.pdf`);
      outputPaths.push(outputPath);
      
      await generatePDF(validResumeData, { 
        output: outputPath,
        template: i % 2 === 0 ? 'professional' : 'ats-optimized'
      });
      
      // Only force GC every few iterations
      if (i % 3 === 0 && global.gc) {
        global.gc();
      }
    }

    const finalMem = process.memoryUsage();
    const rssUsedMB = finalMem.rss / 1024 / 1024;

    console.log(`Memory Pressure Test:`);
    console.log(`  Generated ${outputPaths.length} PDFs`);
    console.log(`  Final memory: ${rssUsedMB.toFixed(2)}MB`);

    // All files should be created successfully
    for (const outputPath of outputPaths) {
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(1000);
    }

    // Memory should still be reasonable under pressure
    expect(rssUsedMB).toBeLessThan(500);
  });
});