import { describe, it, expect } from 'vitest';
import { generateHTML } from '../../src/templates/html-generator.js';
import { generatePDF } from '../../src/generators/pdf-generator.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Font Embedding Tests', () => {
  const validResumeData = {
    basics: {
      name: 'Test User',
      email: 'test@example.com',
      phone: '(555) 123-4567',
      location: { city: 'Test City', region: 'TS' },
      summary: 'Test summary with special characters: résumé, naïve, café'
    },
    work: [{
      name: 'Test Company',
      position: 'Test Position', 
      startDate: '2020-01-01',
      endDate: '2023-01-01',
      highlights: ['Test achievement with unicode: • ✓ → ★']
    }]
  };

  it('should only use system fonts in templates', async () => {
    const templates = ['ats-optimized', 'professional'];
    
    for (const template of templates) {
      const htmlContent = await generateHTML(validResumeData, { template });
      
      // Extract all font-family declarations
      const fontFamilyMatches = htmlContent.match(/font-family:\s*[^;}]+[;}]/gi);
      
      if (fontFamilyMatches) {
        for (const fontDeclaration of fontFamilyMatches) {
          // Should contain only safe system fonts
          const systemFonts = [
            'Arial',
            'Calibri', 
            'Times New Roman',
            'Georgia',
            'Helvetica',
            'sans-serif',
            'serif',
            'monospace'
          ];
          
          const hasSystemFont = systemFonts.some(font => 
            fontDeclaration.toLowerCase().includes(font.toLowerCase())
          );
          
          expect(hasSystemFont).toBe(true);
          
          // Should not reference web fonts
          const webFontPatterns = [
            /roboto/gi,
            /open sans/gi,
            /lato/gi,
            /montserrat/gi,
            /source/gi,
            /ubuntu/gi,
            /nunito/gi
          ];
          
          for (const pattern of webFontPatterns) {
            expect(fontDeclaration).not.toMatch(pattern);
          }
        }
      }
    }
  });

  it('should not include @font-face declarations with external URLs', async () => {
    const htmlContent = await generateHTML(validResumeData, { 
      template: 'professional' 
    });

    // Check for @font-face rules
    const fontFaceMatches = htmlContent.match(/@font-face\s*{[^}]*}/gis);
    
    if (fontFaceMatches) {
      for (const fontFace of fontFaceMatches) {
        // If @font-face exists, it should use data URIs or local fonts only
        expect(fontFace).not.toMatch(/url\s*\(\s*["']?https?:/i);
        expect(fontFace).not.toMatch(/url\s*\(\s*["']?\/\//i);
        
        // Should use data: URIs or local() references only
        if (fontFace.includes('url(')) {
          expect(fontFace).toMatch(/url\s*\(\s*["']?data:/i);
        }
      }
    }
  });

  it('should render special characters correctly with system fonts', async () => {
    const htmlContent = await generateHTML(validResumeData);
    
    // Verify special characters are preserved in HTML
    expect(htmlContent).toContain('résumé');
    expect(htmlContent).toContain('naïve');
    expect(htmlContent).toContain('café');
    expect(htmlContent).toContain('•');
    expect(htmlContent).toContain('✓');
    expect(htmlContent).toContain('→');
    expect(htmlContent).toContain('★');
    
    // Verify proper UTF-8 encoding declaration
    expect(htmlContent).toContain('<meta charset="UTF-8">');
  });

  it('should generate PDF with embedded fonts', async () => {
    const outputPath = join(process.cwd(), 'test-outputs', 'font-test.pdf');
    
    await generatePDF(validResumeData, { 
      output: outputPath,
      template: 'professional' 
    });

    const pdfBuffer = readFileSync(outputPath);
    const pdfString = pdfBuffer.toString('binary');
    
    // PDF should contain font embedding information
    // Look for font dictionary patterns in PDF
    expect(pdfString).toMatch(/\/Type\s*\/Font/);
    expect(pdfString).toMatch(/\/Subtype\s*\/Type0|\/CIDFontType2/);
    
    // Should not reference external font URLs
    expect(pdfString).not.toMatch(/https?:\/\/.*\.(?:woff|ttf|otf|eot)/);
    expect(pdfString).not.toMatch(/fonts\.googleapis\.com/);
    expect(pdfString).not.toMatch(/fonts\.gstatic\.com/);
  });

  it('should handle emoji and Unicode symbols correctly', async () => {
    const dataWithEmojis = {
      ...validResumeData,
      basics: {
        ...validResumeData.basics,
        summary: 'Developer 👨‍💻 with expertise in various technologies 🚀'
      },
      work: [{
        ...validResumeData.work[0],
        highlights: [
          '✅ Completed major project',
          '📈 Improved performance by 50%',
          '🏆 Won team achievement award'
        ]
      }]
    };

    const htmlContent = await generateHTML(dataWithEmojis);
    
    // Verify emojis are preserved
    expect(htmlContent).toContain('👨‍💻');
    expect(htmlContent).toContain('🚀');
    expect(htmlContent).toContain('✅');
    expect(htmlContent).toContain('📈');
    expect(htmlContent).toContain('🏆');
    
    // Generate PDF to ensure emojis render
    const outputPath = join(process.cwd(), 'test-outputs', 'emoji-test.pdf');
    
    // Should not throw errors with emoji content
    await expect(generatePDF(dataWithEmojis, { output: outputPath }))
      .resolves.toBe(outputPath);
  });

  it('should use fallback fonts appropriately', async () => {
    const htmlContent = await generateHTML(validResumeData, { 
      template: 'professional' 
    });

    // Extract font-family declarations
    const fontFamilyMatches = htmlContent.match(/font-family:\s*[^;}]+/gi);
    
    if (fontFamilyMatches) {
      for (const fontDeclaration of fontFamilyMatches) {
        // Should include fallback fonts
        const hasFallback = fontDeclaration.includes('sans-serif') || 
                           fontDeclaration.includes('serif') ||
                           fontDeclaration.includes('Arial');
        expect(hasFallback).toBe(true);
      }
    }
  });

  it('should not reference external font services', async () => {
    const htmlContent = await generateHTML(validResumeData);
    
    // Check for external font service references
    const externalFontServices = [
      /fonts\.googleapis\.com/gi,
      /fonts\.gstatic\.com/gi,
      /typekit\.net/gi,
      /fonts\.com/gi,
      /webtype\.com/gi,
      /fontdeck\.com/gi,
      /typography\.com/gi
    ];

    for (const pattern of externalFontServices) {
      const matches = htmlContent.match(pattern);
      expect(matches).toBeNull();
    }
    
    // Should not have external link tags for fonts
    expect(htmlContent).not.toMatch(/<link[^>]*href[^>]*font/gi);
  });

  it('should maintain text readability with system fonts only', async () => {
    const outputPath = join(process.cwd(), 'test-outputs', 'system-fonts-test.pdf');
    
    await generatePDF(validResumeData, { 
      output: outputPath,
      template: 'professional' 
    });

    // PDF should be created successfully with system fonts
    const pdfBuffer = readFileSync(outputPath);
    expect(pdfBuffer.length).toBeGreaterThan(1000); // Reasonable PDF size
    
    // Verify basic PDF structure and metadata
    const pdfString = pdfBuffer.toString('binary');
    expect(pdfString).toMatch(/^%PDF-/);
    expect(pdfString).toContain('/Title (Test User - Resume)');
  });

  it('should specify font sizes in device-independent units', async () => {
    const htmlContent = await generateHTML(validResumeData);
    
    // Extract font-size declarations
    const fontSizeMatches = htmlContent.match(/font-size:\s*[^;}]+/gi);
    
    if (fontSizeMatches) {
      for (const fontSizeDeclaration of fontSizeMatches) {
        // Should use pt, em, rem, or % units, not px for print media
        expect(fontSizeDeclaration).toMatch(/\d+(?:pt|em|rem|%)/);
        
        // Should not use pixel units for print documents
        expect(fontSizeDeclaration).not.toMatch(/\d+px\b/);
      }
    }
  });
});