import { describe, it, expect } from 'vitest';
import { generateHTML } from '../../src/templates/html-generator.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Asset Bundling Tests', () => {
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
    }],
    skills: [{
      name: 'Programming',
      keywords: ['JavaScript', 'TypeScript', 'Node.js']
    }]
  };

  it('should have all CSS styles inlined in HTML', async () => {
    const templates = ['ats-optimized', 'professional'];
    
    for (const template of templates) {
      const htmlContent = await generateHTML(validResumeData, { template });
      
      // Verify styles are embedded, not linked
      expect(htmlContent).toContain('<style>');
      expect(htmlContent).not.toContain('<link rel="stylesheet"');
      expect(htmlContent).not.toContain('.css">');
      
      // Verify comprehensive styling is present
      expect(htmlContent).toMatch(/body\s*{[^}]*}/);
      expect(htmlContent).toMatch(/h1\s*{[^}]*}/);
      expect(htmlContent).toMatch(/h2\s*{[^}]*}/);
      
      // Verify no external stylesheet references
      expect(htmlContent).not.toMatch(/href\s*=\s*["'][^"']*\.css/i);
    }
  });

  it('should not reference external static assets', async () => {
    const htmlContent = await generateHTML(validResumeData, { 
      template: 'professional' 
    });

    // Check for any external asset references
    const externalAssetPatterns = [
      /src\s*=\s*["'](?!data:)[^"']*\.(png|jpg|jpeg|gif|svg|ico)/gi,
      /url\s*\(\s*["']?(?!data:)[^"')]*\.(png|jpg|jpeg|gif|svg|ico)/gi,
      /background-image:\s*url\s*\([^)]*http/gi,
      /<img[^>]*src\s*=\s*["'](?!data:)/gi,
      /<link[^>]*href\s*=\s*["'][^"']*\.(css|js)/gi
    ];

    for (const pattern of externalAssetPatterns) {
      const matches = htmlContent.match(pattern);
      if (matches) {
        console.log(`Found external asset references: ${matches.join(', ')}`);
      }
      expect(matches).toBeNull();
    }
  });

  it('should have self-contained template files', () => {
    const templatePath = join(__dirname, '../../src/templates/html-generator.ts');
    expect(existsSync(templatePath)).toBe(true);
    
    const templateContent = readFileSync(templatePath, 'utf-8');
    
    // Verify template is embedded as string, not file references
    expect(templateContent).toContain('const template =');
    
    // Verify no file system reads for templates
    expect(templateContent).not.toMatch(/readFile.*\.html/);
    expect(templateContent).not.toMatch(/readFile.*\.css/);
    expect(templateContent).not.toMatch(/import.*\.html/);
    expect(templateContent).not.toMatch(/require.*\.html/);
  });

  it('should not require any runtime asset loading', async () => {
    const htmlContent = await generateHTML(validResumeData);
    
    // Verify no JavaScript that might load assets dynamically
    const jsPatterns = [
      /<script[^>]*src=/gi,
      /\.load\(/gi,
      /fetch\(/gi,
      /XMLHttpRequest/gi,
      /ajax/gi,
      /import\(/gi,  // Dynamic imports
      /require\(/gi
    ];

    for (const pattern of jsPatterns) {
      const matches = htmlContent.match(pattern);
      expect(matches).toBeNull();
    }
    
    // Should be pure HTML + CSS, no JavaScript
    expect(htmlContent).not.toContain('<script');
  });

  it('should have all icon fonts embedded or use Unicode/emoji', async () => {
    const htmlContent = await generateHTML(validResumeData, { 
      template: 'professional' 
    });

    // Check if icons are used (emoji or Unicode symbols)
    const iconPatterns = [
      /📧|✉|@/,  // Email icons
      /📞|☎|📱/,  // Phone icons  
      /📍|🌍|🌐/, // Location/web icons
    ];

    let hasIcons = false;
    for (const pattern of iconPatterns) {
      if (htmlContent.match(pattern)) {
        hasIcons = true;
        break;
      }
    }

    if (hasIcons) {
      // If icons are used, they should be Unicode/emoji, not font files
      expect(htmlContent).not.toMatch(/font-awesome/gi);
      expect(htmlContent).not.toMatch(/material-icons/gi);
      expect(htmlContent).not.toMatch(/glyphicons/gi);
      expect(htmlContent).not.toMatch(/\.woff|\.ttf|\.eot|\.otf/gi);
    }
  });

  it('should work without any node_modules dependencies at runtime', async () => {
    // This test verifies that once built, the templates don't rely on external deps
    const htmlContent = await generateHTML(validResumeData);
    
    // The generated HTML should be completely self-contained
    expect(htmlContent).toMatch(/^<!DOCTYPE html>/);
    expect(htmlContent).toContain('</html>');
    expect(htmlContent).toContain('<style>');
    
    // Should not contain any require() or import statements in the HTML
    expect(htmlContent).not.toContain('require(');
    expect(htmlContent).not.toContain('import ');
    expect(htmlContent).not.toContain('node_modules');
  });

  it('should bundle all template variations', () => {
    const templatePath = join(__dirname, '../../src/templates/html-generator.ts');
    const templateContent = readFileSync(templatePath, 'utf-8');
    
    // Verify the single template with conditional logic is included
    expect(templateContent).toContain('const template =');
    
    // Verify template contains substantial content (HTML structure)
    const templateMatch = templateContent.match(/const template = `([^`]+)`/s);
    expect(templateMatch).toBeTruthy();
    
    const templateSize = templateMatch?.[1]?.length || 0;
    expect(templateSize).toBeGreaterThan(3000);
    
    // Verify template supports conditional ATS mode
    expect(templateContent).toContain('{{#unless atsMode}}');
    expect(templateContent).toContain('atsMode: options.atsMode');
  });

  it('should have deterministic asset loading', async () => {
    // Generate HTML multiple times to ensure consistent output
    const runs = 3;
    const outputs: string[] = [];
    
    for (let i = 0; i < runs; i++) {
      const htmlContent = await generateHTML(validResumeData, { 
        template: 'professional' 
      });
      outputs.push(htmlContent);
    }
    
    // All outputs should be identical (deterministic)
    for (let i = 1; i < runs; i++) {
      expect(outputs[i]).toBe(outputs[0]);
    }
  });
});