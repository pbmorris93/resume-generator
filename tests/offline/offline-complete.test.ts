import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generatePDF } from '../../src/generators/pdf-generator.js';
import { generateHTML } from '../../src/templates/html-generator.js';
import { validateCompleteOfflineCompatibility, NetworkRequestMonitor } from '../../src/utils/offline-validator.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Complete Offline Operation Verification', () => {
  const validResumeData = {
    basics: {
      name: 'Complete Test User',
      email: 'complete@test.com',
      phone: '(555) 999-8888',
      location: { city: 'Complete City', region: 'CC' },
      summary: 'Complete offline testing résumé with special chars: naïve, café, coöperation',
      url: 'https://example.com'
    },
    work: [{
      name: 'Complete Test Company',
      position: 'Complete Test Position', 
      startDate: '2021-01-01',
      endDate: '2024-01-01',
      location: 'Remote',
      summary: 'Complete testing of offline capabilities',
      highlights: [
        'Built 100% offline applications',
        'Improved performance by 200% ✓',
        'Led team of 5 developers → success ★'
      ]
    }],
    education: [{
      institution: 'Complete University',
      area: 'Computer Science',
      studyType: 'Bachelor',
      startDate: '2017-01-01',
      endDate: '2020-12-01',
      gpa: '3.8'
    }],
    skills: [{
      name: 'Offline Technologies',
      keywords: ['JavaScript', 'TypeScript', 'Node.js', 'Service Workers']
    }, {
      name: 'Design',
      keywords: ['HTML', 'CSS', 'Responsive Design']
    }],
    projects: [{
      name: 'Offline Resume Generator',
      description: 'A completely offline resume generation tool',
      startDate: '2023-01-01',
      endDate: '2024-01-01',
      highlights: [
        'Zero network dependencies',
        'Embedded fonts and assets',
        'ATS-compliant output'
      ]
    }]
  };

  let networkMonitor: NetworkRequestMonitor;

  beforeEach(() => {
    networkMonitor = new NetworkRequestMonitor();
    networkMonitor.start();
  });

  afterEach(() => {
    networkMonitor.stop();
  });

  it('should pass complete offline validation for all templates', async () => {
    const templates = ['ats-optimized', 'professional'];
    
    for (const template of templates) {
      const htmlContent = await generateHTML(validResumeData, { template });
      const validation = validateCompleteOfflineCompatibility(htmlContent);
      
      expect(validation.isOfflineCompatible).toBe(true);
      
      if (validation.issues.length > 0) {
        console.log(`Issues in ${template} template:`, validation.issues);
      }
      expect(validation.issues).toHaveLength(0);
    }
  });

  it('should pass ultra-ATS mode offline validation', async () => {
    const htmlContent = await generateHTML(validResumeData, { atsMode: true });
    const validation = validateCompleteOfflineCompatibility(htmlContent);
    
    expect(validation.isOfflineCompatible).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  it('should generate complete PDF without any network activity', async () => {
    const outputPath = join(process.cwd(), 'test-outputs', 'complete-offline.pdf');
    
    await generatePDF(validResumeData, { 
      output: outputPath,
      template: 'professional' 
    });

    // Verify no network requests were made
    const networkRequests = networkMonitor.getNetworkRequests();
    expect(networkRequests).toHaveLength(0);
    
    // Verify PDF was created with comprehensive content
    const pdfBuffer = readFileSync(outputPath);
    const pdfString = pdfBuffer.toString('binary');
    
    expect(pdfString).toContain('/Title (Complete Test User - Resume)');
    expect(pdfString).toMatch(/^%PDF-/);
    expect(pdfBuffer.length).toBeGreaterThan(5000); // Substantial content
  });

  it('should handle all resume sections offline', async () => {
    const htmlContent = await generateHTML(validResumeData, { template: 'professional' });
    
    // Verify all sections are rendered
    expect(htmlContent).toContain('Complete Test User');
    expect(htmlContent).toContain('Complete Test Company');
    expect(htmlContent).toContain('Complete University');
    expect(htmlContent).toContain('Offline Technologies');
    expect(htmlContent).toContain('Offline Resume Generator');
    
    // Verify special characters are preserved
    expect(htmlContent).toContain('résumé');
    expect(htmlContent).toContain('naïve');
    expect(htmlContent).toContain('café');
    expect(htmlContent).toContain('coöperation');
    
    // Verify Unicode symbols work
    expect(htmlContent).toContain('✓');
    expect(htmlContent).toContain('→');
    expect(htmlContent).toContain('★');
  });

  it('should work with deterministic generation offline', async () => {
    const outputPath1 = join(process.cwd(), 'test-outputs', 'deterministic-1.pdf');
    const outputPath2 = join(process.cwd(), 'test-outputs', 'deterministic-2.pdf');
    
    await generatePDF(validResumeData, { 
      output: outputPath1,
      deterministic: true 
    });
    
    await generatePDF(validResumeData, { 
      output: outputPath2,
      deterministic: true 
    });

    // Both PDFs should be identical
    const pdf1 = readFileSync(outputPath1);
    const pdf2 = readFileSync(outputPath2);
    expect(pdf1.equals(pdf2)).toBe(true);
    
    // Verify no network activity during either generation
    expect(networkMonitor.hasNetworkActivity()).toBe(false);
  });

  it('should work with all CLI template options offline', async () => {
    const options = [
      { template: 'ats-optimized' },
      { template: 'professional' },
      { atsMode: true },
      { template: 'professional', atsMode: false }
    ];

    for (const option of options) {
      const outputPath = join(process.cwd(), 'test-outputs', `option-${JSON.stringify(option).replace(/[^a-z0-9]/gi, '-')}.pdf`);
      
      await generatePDF(validResumeData, { 
        output: outputPath,
        ...option
      });

      // Verify file creation
      const stats = await require('fs').promises.stat(outputPath);
      expect(stats.size).toBeGreaterThan(1000);
    }

    // Verify no network activity across all generations
    expect(networkMonitor.hasNetworkActivity()).toBe(false);
  });

  it('should properly embed emoji and Unicode in PDF', async () => {
    const emojiData = {
      ...validResumeData,
      basics: {
        ...validResumeData.basics,
        summary: 'Developer 👨‍💻 specializing in offline-first apps 🚀'
      },
      work: [{
        ...validResumeData.work[0],
        highlights: [
          '✅ Completed major project ahead of schedule',
          '📈 Improved performance metrics by 200%',
          '🏆 Received excellence award from team'
        ]
      }]
    };

    const outputPath = join(process.cwd(), 'test-outputs', 'emoji-complete.pdf');
    
    await generatePDF(emojiData, { 
      output: outputPath,
      template: 'professional' 
    });

    // Verify no network requests for emoji rendering
    expect(networkMonitor.hasNetworkActivity()).toBe(false);
    
    // Verify PDF was created successfully
    const pdfBuffer = readFileSync(outputPath);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });

  it('should validate all templates have offline-compatible CSS', async () => {
    const templates = [
      { template: 'ats-optimized' },
      { template: 'professional' },
      { atsMode: true }
    ];

    for (const option of templates) {
      const htmlContent = await generateHTML(validResumeData, option);
      
      // Should have inline CSS
      expect(htmlContent).toContain('<style>');
      
      // Should not have external CSS references
      expect(htmlContent).not.toMatch(/<link[^>]*rel\s*=\s*["']stylesheet/);
      expect(htmlContent).not.toMatch(/@import\s+url/);
      expect(htmlContent).not.toMatch(/href\s*=\s*["'][^"']*\.css/);
      
      // Should use system fonts
      const fontMatches = htmlContent.match(/font-family:\s*[^;}]+/gi);
      if (fontMatches) {
        for (const fontDeclaration of fontMatches) {
          expect(fontDeclaration).toMatch(/(Arial|Calibri|sans-serif|serif)/i);
        }
      }
    }
  });

  it('should work in complete isolation (no external dependencies)', async () => {
    // Just verify that PDF generation works without making network calls
    // (the network monitor already verifies no external calls are made)
    const outputPath = join(process.cwd(), 'test-outputs', 'isolated-complete.pdf');
    
    await generatePDF(validResumeData, { 
      output: outputPath,
      template: 'professional' 
    });

    // Should succeed and produce a substantial PDF
    const stats = await require('fs').promises.stat(outputPath);
    expect(stats.size).toBeGreaterThan(1000);
    
    // Verify no network activity was detected
    expect(networkMonitor.hasNetworkActivity()).toBe(false);
  });
});