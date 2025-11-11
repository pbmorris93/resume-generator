import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generatePDF } from '../../src/generators/pdf-generator.js';
import { generateHTML } from '../../src/templates/html-generator.js';
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Network Isolation Tests', () => {
  const validResumeData = {
    basics: {
      name: 'Test User',
      email: 'test@example.com',
      phone: '(555) 123-4567',
      location: { city: 'Test City', region: 'TS' },
      summary: 'Test summary'
    },
    work: [{
      name: 'Test Company',
      position: 'Test Position', 
      startDate: '2020-01-01',
      endDate: '2023-01-01',
      highlights: ['Test achievement']
    }]
  };

  let networkRequestsMade: string[] = [];
  let originalFetch: typeof fetch;

  beforeEach(() => {
    networkRequestsMade = [];
    
    // Mock global fetch to detect any network calls
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      networkRequestsMade.push(url);
      throw new Error(`Network request blocked: ${url}`);
    });
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  it('should generate PDF without making any network requests', async () => {
    const outputPath = join(process.cwd(), 'test-outputs', 'offline-test.pdf');
    
    await generatePDF(validResumeData, { 
      output: outputPath,
      template: 'professional' 
    });

    // Verify no network requests were made
    expect(networkRequestsMade).toHaveLength(0);
    
    // Verify PDF was created successfully
    expect(() => readFileSync(outputPath)).not.toThrow();
  });

  it('should generate HTML without external resource references', async () => {
    const htmlContent = await generateHTML(validResumeData, { 
      template: 'professional' 
    });

    // Check for external URLs that would trigger network requests
    const externalUrlPatterns = [
      /https?:\/\/(?!localhost)/gi,  // Any external HTTP(S) URLs
      /@import\s+url\(/gi,           // CSS imports
      /src\s*=\s*["']https?:/gi,     // External image/script sources
      /href\s*=\s*["']https?:/gi,    // External stylesheets/links
      /fonts\.googleapis\.com/gi,    // Google Fonts
      /fonts\.gstatic\.com/gi,       // Google Fonts static
      /cdnjs\.cloudflare\.com/gi,    // CDNJS
      /unpkg\.com/gi,                // unpkg CDN
      /jsdelivr\.net/gi,             // jsDelivr CDN
      /fontawesome\.com/gi,          // Font Awesome CDN
      /bootstrap\.min\.css/gi,       // Bootstrap CDN
      /tailwindcss\.com/gi          // Tailwind CDN
    ];

    for (const pattern of externalUrlPatterns) {
      const matches = htmlContent.match(pattern);
      if (matches) {
        console.log(`Found external references: ${matches.join(', ')}`);
      }
      expect(matches).toBeNull();
    }

    // Verify HTML is self-contained
    expect(htmlContent).toContain('<style>');
    expect(htmlContent).not.toContain('@import');
    expect(htmlContent).not.toContain('http://');
    expect(htmlContent).not.toContain('https://');
  });

  it('should work with Playwright in offline mode', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      // Block all network requests
      offline: true
    });
    const page = await context.newPage();

    // Track any network requests that might slip through
    const networkRequests: string[] = [];
    page.on('request', (request) => {
      networkRequests.push(request.url());
    });

    const htmlContent = await generateHTML(validResumeData);
    
    try {
      await page.setContent(htmlContent, { waitUntil: 'networkidle' });
      
      // Verify content loaded successfully
      const title = await page.title();
      expect(title).toContain('Test User');
      
      // Verify no network requests were made
      expect(networkRequests).toHaveLength(0);
      
    } finally {
      await browser.close();
    }
  });

  it('should use only embedded fonts and styles', async () => {
    const htmlContent = await generateHTML(validResumeData, { 
      template: 'professional' 
    });

    // Verify fonts are specified as system fonts, not web fonts
    const fontFamilyMatches = htmlContent.match(/font-family:\s*[^;]+/gi);
    
    if (fontFamilyMatches) {
      for (const fontDeclaration of fontFamilyMatches) {
        // Should only contain safe system fonts
        expect(fontDeclaration).toMatch(/(Arial|Calibri|Times New Roman|serif|sans-serif)/i);
        
        // Should not reference web fonts or external font services
        expect(fontDeclaration).not.toMatch(/(google|typekit|fonts\.com)/i);
      }
    }

    // Verify no @font-face rules with external URLs
    const fontFaceMatches = htmlContent.match(/@font-face\s*{[^}]*}/gi);
    if (fontFaceMatches) {
      for (const fontFace of fontFaceMatches) {
        expect(fontFace).not.toMatch(/url\s*\(\s*["']?https?:/i);
      }
    }
  });

  it('should generate identical output in airplane mode simulation', async () => {
    // First generation with normal conditions
    const outputPath1 = join(process.cwd(), 'test-outputs', 'normal-mode.pdf');
    await generatePDF(validResumeData, { 
      output: outputPath1,
      deterministic: true 
    });
    const pdf1 = readFileSync(outputPath1);

    // Second generation with network completely blocked
    const outputPath2 = join(process.cwd(), 'test-outputs', 'airplane-mode.pdf');
    
    // Mock any potential network libraries
    const originalHttpsGet = require('https').get;
    const originalHttpGet = require('http').get;
    
    require('https').get = vi.fn().mockImplementation(() => {
      throw new Error('Network blocked in airplane mode');
    });
    require('http').get = vi.fn().mockImplementation(() => {
      throw new Error('Network blocked in airplane mode');
    });

    try {
      await generatePDF(validResumeData, { 
        output: outputPath2,
        deterministic: true 
      });
      const pdf2 = readFileSync(outputPath2);

      // PDFs should be identical
      expect(pdf1.equals(pdf2)).toBe(true);
      
    } finally {
      // Restore original functions
      require('https').get = originalHttpsGet;
      require('http').get = originalHttpGet;
    }
  });

  it('should not include any analytics or telemetry', async () => {
    const htmlContent = await generateHTML(validResumeData);

    // Check for common analytics/telemetry patterns
    const analyticsPatterns = [
      /google-analytics/gi,
      /gtag\(/gi,
      /ga\(/gi,
      /googletagmanager/gi,
      /_gaq/gi,
      /mixpanel/gi,
      /segment\.com/gi,
      /hotjar/gi,
      /intercom/gi,
      /zendesk/gi,
      /facebook\.net/gi,
      /twitter\.com\/intent/gi,
      /linkedin\.com\/insight/gi,
      /beacon/gi,
      /track\(/gi,
      /analytics/gi,
      /telemetry/gi
    ];

    for (const pattern of analyticsPatterns) {
      const matches = htmlContent.match(pattern);
      expect(matches).toBeNull();
    }

    // Verify no JavaScript tracking code
    expect(htmlContent).not.toMatch(/<script[^>]*>/gi);
  });
});