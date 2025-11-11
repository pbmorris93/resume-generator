import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generatePDF } from '../../src/generators/pdf-generator.js';
import { generateHTML } from '../../src/templates/html-generator.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import process from 'process';

describe('Performance Benchmarks', () => {
  const validResumeData = {
    basics: {
      name: 'Performance Test User',
      email: 'perf@example.com',
      phone: '(555) 123-4567',
      location: { city: 'Performance City', region: 'PC' },
      summary: 'Testing performance optimizations for resume generation',
      url: 'https://example.com'
    },
    work: Array.from({ length: 5 }, (_, i) => ({
      name: `Company ${i + 1}`,
      position: `Position ${i + 1}`,
      startDate: `202${i}-01-01`,
      endDate: `202${i + 1}-01-01`,
      location: 'Remote',
      summary: `Work experience summary for position ${i + 1}`,
      highlights: [
        `Achievement ${i + 1}.1`,
        `Achievement ${i + 1}.2`,
        `Achievement ${i + 1}.3`
      ]
    })),
    education: [{
      institution: 'Performance University',
      area: 'Computer Science',
      studyType: 'Bachelor',
      startDate: '2018-01-01',
      endDate: '2022-01-01',
      gpa: '3.8'
    }],
    skills: Array.from({ length: 10 }, (_, i) => ({
      name: `Skill Category ${i + 1}`,
      keywords: [`Skill ${i + 1}.1`, `Skill ${i + 1}.2`, `Skill ${i + 1}.3`]
    })),
    projects: Array.from({ length: 3 }, (_, i) => ({
      name: `Project ${i + 1}`,
      description: `Description for project ${i + 1}`,
      startDate: `202${i + 2}-01-01`,
      endDate: `202${i + 3}-01-01`,
      highlights: [
        `Project achievement ${i + 1}.1`,
        `Project achievement ${i + 1}.2`
      ]
    }))
  };

  beforeAll(async () => {
    // Ensure output directory exists
    await fs.mkdir(join(process.cwd(), 'test-outputs'), { recursive: true });
  });

  afterAll(async () => {
    // Clean up performance test files
    try {
      const files = await fs.readdir(join(process.cwd(), 'test-outputs'));
      const perfFiles = files.filter(f => f.includes('perf-'));
      await Promise.all(
        perfFiles.map(f => fs.unlink(join(process.cwd(), 'test-outputs', f)))
      );
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should measure HTML generation performance', async () => {
    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await generateHTML(validResumeData, { template: 'professional' });
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`HTML Generation Performance:`);
    console.log(`  Average: ${avgTime.toFixed(2)}ms`);
    console.log(`  Min: ${minTime.toFixed(2)}ms`);
    console.log(`  Max: ${maxTime.toFixed(2)}ms`);

    // HTML generation should be very fast (< 50ms)
    expect(avgTime).toBeLessThan(50);
  });

  it('should measure PDF generation performance (cold start)', async () => {
    const start = performance.now();
    
    const outputPath = join(process.cwd(), 'test-outputs', 'perf-cold-start.pdf');
    await generatePDF(validResumeData, { 
      output: outputPath,
      template: 'professional' 
    });
    
    const end = performance.now();
    const coldStartTime = end - start;

    console.log(`PDF Generation (Cold Start): ${coldStartTime.toFixed(2)}ms`);

    // Cold start should be reasonable (< 5000ms for first run)
    expect(coldStartTime).toBeLessThan(5000);

    // Verify file was created
    const stats = await fs.stat(outputPath);
    expect(stats.size).toBeGreaterThan(1000);
  });

  it('should measure PDF generation performance (warm runs)', async () => {
    const iterations = 5;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      const outputPath = join(process.cwd(), 'test-outputs', `perf-warm-${i}.pdf`);
      await generatePDF(validResumeData, { 
        output: outputPath,
        template: 'professional' 
      });
      
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`PDF Generation Performance (Warm):`);
    console.log(`  Average: ${avgTime.toFixed(2)}ms`);
    console.log(`  Min: ${minTime.toFixed(2)}ms`);
    console.log(`  Max: ${maxTime.toFixed(2)}ms`);

    // Subsequent runs should be faster
    // Target: < 1000ms after first run (Definition of Done)
    expect(avgTime).toBeLessThan(1000);
  });

  it('should measure memory usage during PDF generation', async () => {
    const memBefore = process.memoryUsage();
    
    const outputPath = join(process.cwd(), 'test-outputs', 'perf-memory.pdf');
    await generatePDF(validResumeData, { 
      output: outputPath,
      template: 'professional' 
    });
    
    const memAfter = process.memoryUsage();
    
    const heapUsedMB = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
    const rssUsedMB = (memAfter.rss - memBefore.rss) / 1024 / 1024;

    console.log(`Memory Usage:`);
    console.log(`  Heap Delta: ${heapUsedMB.toFixed(2)}MB`);
    console.log(`  RSS Delta: ${rssUsedMB.toFixed(2)}MB`);
    console.log(`  Total RSS: ${(memAfter.rss / 1024 / 1024).toFixed(2)}MB`);

    // Memory usage should be reasonable (< 500MB for Node.js + Playwright)
    expect(memAfter.rss / 1024 / 1024).toBeLessThan(500);
  });

  it('should measure performance across different templates', async () => {
    const templates = ['ats-optimized', 'professional'] as const;
    const results: Record<string, number> = {};

    for (const template of templates) {
      const start = performance.now();
      
      const outputPath = join(process.cwd(), 'test-outputs', `perf-${template}.pdf`);
      await generatePDF(validResumeData, { 
        output: outputPath,
        template 
      });
      
      const end = performance.now();
      results[template] = end - start;
    }

    console.log('Template Performance:');
    for (const [template, time] of Object.entries(results)) {
      console.log(`  ${template}: ${time.toFixed(2)}ms`);
    }

    // All templates should perform well
    for (const time of Object.values(results)) {
      expect(time).toBeLessThan(1500);
    }
  });

  it('should measure ATS mode performance', async () => {
    const start = performance.now();
    
    const outputPath = join(process.cwd(), 'test-outputs', 'perf-ats-mode.pdf');
    await generatePDF(validResumeData, { 
      output: outputPath,
      atsMode: true 
    });
    
    const end = performance.now();
    const atsTime = end - start;

    console.log(`ATS Mode Performance: ${atsTime.toFixed(2)}ms`);

    // ATS mode should be fastest (minimal styling)
    expect(atsTime).toBeLessThan(1000);
  });

  it('should measure large resume performance', async () => {
    // Create a larger resume with more data
    const largeResumeData = {
      ...validResumeData,
      work: Array.from({ length: 15 }, (_, i) => ({
        name: `Large Company ${i + 1}`,
        position: `Senior Position ${i + 1}`,
        startDate: `${2010 + i}-01-01`,
        endDate: `${2011 + i}-01-01`,
        location: 'Various Locations',
        summary: `Extended work experience summary for position ${i + 1} with detailed descriptions and comprehensive coverage of responsibilities and achievements during this role.`,
        highlights: Array.from({ length: 5 }, (_, j) => 
          `Detailed achievement ${i + 1}.${j + 1} with comprehensive description of impact and results`
        )
      })),
      skills: Array.from({ length: 20 }, (_, i) => ({
        name: `Extended Skill Category ${i + 1}`,
        keywords: Array.from({ length: 8 }, (_, j) => `Skill ${i + 1}.${j + 1}`)
      })),
      projects: Array.from({ length: 8 }, (_, i) => ({
        name: `Major Project ${i + 1}`,
        description: `Comprehensive description for major project ${i + 1} including technical details, challenges, and outcomes.`,
        startDate: `${2015 + i}-01-01`,
        endDate: `${2016 + i}-01-01`,
        highlights: Array.from({ length: 4 }, (_, j) => 
          `Project achievement ${i + 1}.${j + 1} with detailed explanation`
        )
      }))
    };

    const start = performance.now();
    
    const outputPath = join(process.cwd(), 'test-outputs', 'perf-large-resume.pdf');
    await generatePDF(largeResumeData, { 
      output: outputPath,
      template: 'professional' 
    });
    
    const end = performance.now();
    const largeResumeTime = end - start;

    console.log(`Large Resume Performance: ${largeResumeTime.toFixed(2)}ms`);

    // Even large resumes should perform reasonably well (< 2000ms)
    expect(largeResumeTime).toBeLessThan(2000);

    // Verify the large resume was created
    const stats = await fs.stat(outputPath);
    expect(stats.size).toBeGreaterThan(5000);
  });

  it('should measure startup time performance', async () => {
    // Measure time from module import to first HTML generation
    const start = performance.now();
    
    // Re-import to simulate cold start
    const { generateHTML: freshGenerateHTML } = await import('../../src/templates/html-generator.js');
    await freshGenerateHTML(validResumeData, { template: 'ats-optimized' });
    
    const end = performance.now();
    const startupTime = end - start;

    console.log(`Startup Time: ${startupTime.toFixed(2)}ms`);

    // Startup should be fast (< 500ms as per performance targets in resume-app.md)
    expect(startupTime).toBeLessThan(500);
  });
});