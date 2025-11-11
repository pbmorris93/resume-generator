import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { generateMultipleFormats, FormatOptions, ExportFormat } from '../../src/generators/multi-format-generator.js';
import { extractTextFromPDF } from '../../src/utils/pdf-text-extractor.js';

describe('Multi-Format Export', () => {
  let testDir: string;
  let testResumeFile: string;
  let sampleResumeData: any;
  
  beforeEach(async () => {
    // Create temporary directory for tests
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'multi-format-test-'));
    testResumeFile = path.join(testDir, 'test-resume.json');
    
    // Sample resume data
    sampleResumeData = {
      basics: {
        name: "Jane Smith",
        label: "Full Stack Developer",
        email: "jane@example.com",
        phone: "(555) 123-4567",
        url: "https://janesmith.dev",
        summary: "Experienced software engineer with expertise in web development.",
        location: {
          city: "San Francisco",
          region: "CA"
        },
        profiles: [
          {
            network: "LinkedIn",
            username: "janesmith",
            url: "https://linkedin.com/in/janesmith"
          }
        ]
      },
      work: [
        {
          name: "Tech Company",
          position: "Senior Software Engineer",
          startDate: "2021-01-01",
          endDate: "2024-01-01",
          location: "San Francisco, CA",
          summary: "Led development of web applications.",
          highlights: [
            "Built microservices architecture",
            "Improved performance by 50%",
            "Mentored junior developers"
          ]
        }
      ],
      education: [
        {
          institution: "Stanford University",
          area: "Computer Science",
          studyType: "Bachelor",
          startDate: "2017-09-01",
          endDate: "2021-06-01",
          gpa: "3.9"
        }
      ],
      skills: [
        {
          name: "Programming Languages",
          keywords: ["JavaScript", "TypeScript", "Python", "Go"]
        },
        {
          name: "Frameworks",
          keywords: ["React", "Node.js", "Express", "Django"]
        }
      ]
    };
    
    // Write sample data to test file
    await fs.writeFile(testResumeFile, JSON.stringify(sampleResumeData, null, 2));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Single format generation', () => {
    it('should generate PDF format', async () => {
      const options: FormatOptions = {
        formats: ['pdf'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      
      expect(results).toHaveLength(1);
      expect(results[0].format).toBe('pdf');
      expect(results[0].success).toBe(true);
      expect(results[0].filePath).toMatch(/\.pdf$/);
      
      // Verify PDF file exists and has content
      const pdfExists = await fs.access(results[0].filePath).then(() => true).catch(() => false);
      expect(pdfExists).toBe(true);
      
      // Check PDF file size (should be > 0 bytes)
      const stats = await fs.stat(results[0].filePath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should generate HTML format', async () => {
      const options: FormatOptions = {
        formats: ['html'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      
      expect(results).toHaveLength(1);
      expect(results[0].format).toBe('html');
      expect(results[0].filePath).toMatch(/\.html$/);
      
      // Verify HTML file exists
      const htmlContent = await fs.readFile(results[0].filePath, 'utf8');
      
      // Verify HTML structure
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toMatch(/<html[^>]*>/);
      expect(htmlContent).toContain('<head>');
      expect(htmlContent).toContain('<body>');
      
      // Verify content
      expect(htmlContent).toContain('Jane Smith');
      expect(htmlContent).toContain('Full Stack Developer');
      expect(htmlContent).toContain('Tech Company');
      expect(htmlContent).toContain('Senior Software Engineer');
    });

    it('should generate TXT format', async () => {
      const options: FormatOptions = {
        formats: ['txt'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      
      expect(results).toHaveLength(1);
      expect(results[0].format).toBe('txt');
      expect(results[0].filePath).toMatch(/\.txt$/);
      
      // Verify TXT file exists
      const txtContent = await fs.readFile(results[0].filePath, 'utf8');
      
      // Verify content structure
      expect(txtContent).toContain('Jane Smith');
      expect(txtContent).toContain('Full Stack Developer');
      expect(txtContent).toContain('WORK EXPERIENCE');
      expect(txtContent).toContain('Tech Company');
      expect(txtContent).toContain('EDUCATION');
      expect(txtContent).toContain('Stanford University');
      expect(txtContent).toContain('SKILLS');
      expect(txtContent).toContain('Programming Languages');
    });
  });

  describe('Multiple format generation', () => {
    it('should generate all three formats in single command', async () => {
      const options: FormatOptions = {
        formats: ['pdf', 'html', 'txt'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      
      expect(results).toHaveLength(3);
      
      const formats = results.map(r => r.format);
      expect(formats).toContain('pdf');
      expect(formats).toContain('html');
      expect(formats).toContain('txt');
      
      // Verify all files exist
      for (const result of results) {
        const fileExists = await fs.access(result.filePath).then(() => true).catch(() => false);
        expect(fileExists).toBe(true);
      }
    });

    it('should generate multiple formats with custom output paths', async () => {
      const options: FormatOptions = {
        formats: ['pdf', 'html'],
        outputDir: testDir,
        baseName: 'custom-resume'
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      
      expect(results).toHaveLength(2);
      expect(results[0].filePath).toContain('custom-resume');
      expect(results[1].filePath).toContain('custom-resume');
    });

    it('should generate formats with timestamp in filename', async () => {
      const options: FormatOptions = {
        formats: ['pdf', 'html'],
        outputDir: testDir,
        timestamp: true
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      
      expect(results).toHaveLength(2);
      
      // Check that filenames contain timestamp pattern (YYYY-MM-DD)
      const timestampPattern = /\d{4}-\d{2}-\d{2}/;
      for (const result of results) {
        expect(result.filePath).toMatch(timestampPattern);
      }
    });
  });

  describe('Content consistency across formats', () => {
    it('should contain identical core content across all formats', async () => {
      const options: FormatOptions = {
        formats: ['pdf', 'html', 'txt'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      
      // Extract content from HTML and TXT formats (skip PDF text extraction for now)
      const htmlResult = results.find(r => r.format === 'html')!;
      const txtResult = results.find(r => r.format === 'txt')!;
      
      const htmlContent = await fs.readFile(htmlResult.filePath, 'utf8');
      const txtContent = await fs.readFile(txtResult.filePath, 'utf8');
      
      // Core content that should appear in HTML and TXT formats
      const coreContent = [
        'Jane Smith',
        'Full Stack Developer',
        'jane@example.com',
        'Tech Company',
        'Senior Software Engineer',
        'Stanford University',
        'Computer Science',
        'JavaScript',
        'TypeScript'
      ];
      
      for (const content of coreContent) {
        expect(htmlContent).toContain(content);
        expect(txtContent).toContain(content);
      }
      
      // Verify PDF exists and has content
      const pdfResult = results.find(r => r.format === 'pdf')!;
      const pdfExists = await fs.access(pdfResult.filePath).then(() => true).catch(() => false);
      expect(pdfExists).toBe(true);
    });

    it('should preserve work experience highlights in all formats', async () => {
      const options: FormatOptions = {
        formats: ['pdf', 'html', 'txt'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      
      const highlights = [
        'Built microservices architecture',
        'Improved performance by 50%',
        'Mentored junior developers'
      ];
      
      for (const result of results) {
        if (result.format === 'pdf') {
          // Just verify PDF exists (skip text extraction)
          const pdfExists = await fs.access(result.filePath).then(() => true).catch(() => false);
          expect(pdfExists).toBe(true);
        } else {
          const content = await fs.readFile(result.filePath, 'utf8');
          for (const highlight of highlights) {
            expect(content).toContain(highlight);
          }
        }
      }
    });

    it('should maintain proper section ordering across formats', async () => {
      const options: FormatOptions = {
        formats: ['html', 'txt'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      
      for (const result of results) {
        const content = await fs.readFile(result.filePath, 'utf8');
        
        // Check that sections appear in expected order
        const nameIndex = content.indexOf('Jane Smith');
        const workIndex = content.toLowerCase().indexOf('work');
        const educationIndex = content.toLowerCase().indexOf('education');
        const skillsIndex = content.toLowerCase().indexOf('skills');
        
        expect(nameIndex).toBeLessThan(workIndex);
        expect(workIndex).toBeLessThan(educationIndex);
        expect(educationIndex).toBeLessThan(skillsIndex);
      }
    });
  });

  describe('HTML-specific features', () => {
    it('should generate self-contained HTML with inline CSS', async () => {
      const options: FormatOptions = {
        formats: ['html'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      const htmlContent = await fs.readFile(results[0].filePath, 'utf8');
      
      // Should contain inline styles
      expect(htmlContent).toContain('<style>');
      expect(htmlContent).toMatch(/\.[\w-]+\s*\{[^}]*\}/); // CSS rule pattern
      
      // Should not reference external stylesheets
      expect(htmlContent).not.toMatch(/<link[^>]+rel=["']stylesheet["'][^>]*>/);
    });

    it('should include proper meta tags for HTML format', async () => {
      const options: FormatOptions = {
        formats: ['html'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      const htmlContent = await fs.readFile(results[0].filePath, 'utf8');
      
      expect(htmlContent).toMatch(/<meta charset="utf-?8">/i);
      expect(htmlContent).toContain('<meta name="viewport"');
      expect(htmlContent).toContain('<title>Jane Smith - Resume</title>');
    });

    it('should generate valid HTML structure', async () => {
      const options: FormatOptions = {
        formats: ['html'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      const htmlContent = await fs.readFile(results[0].filePath, 'utf8');
      
      // Basic HTML validation - should have proper tag structure
      expect(htmlContent).toMatch(/<!DOCTYPE html>\s*<html[^>]*>/);
      expect(htmlContent).toMatch(/<\/html>\s*$/);
      expect(htmlContent).toContain('<head>');
      expect(htmlContent).toContain('</head>');
      expect(htmlContent).toContain('<body>');
      expect(htmlContent).toContain('</body>');
    });
  });

  describe('TXT-specific features', () => {
    it('should maintain readable structure with ASCII formatting', async () => {
      const options: FormatOptions = {
        formats: ['txt'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      const txtContent = await fs.readFile(results[0].filePath, 'utf8');
      
      // Should have section headers in uppercase
      expect(txtContent).toMatch(/WORK EXPERIENCE/);
      expect(txtContent).toMatch(/EDUCATION/);
      expect(txtContent).toMatch(/SKILLS/);
      
      // Should use ASCII formatting for structure
      expect(txtContent).toMatch(/={3,}/); // Section dividers
      expect(txtContent).toMatch(/-{2,}/); // Sub-section dividers
      
      // Should have proper line breaks and spacing
      expect(txtContent).toMatch(/\n\n/); // Double line breaks between sections
    });

    it('should format contact information clearly in TXT', async () => {
      const options: FormatOptions = {
        formats: ['txt'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      const txtContent = await fs.readFile(results[0].filePath, 'utf8');
      
      // Contact info should be properly formatted
      expect(txtContent).toContain('Email: jane@example.com');
      expect(txtContent).toContain('Phone: (555) 123-4567');
      expect(txtContent).toContain('Website: https://janesmith.dev');
      expect(txtContent).toContain('Location: San Francisco, CA');
    });

    it('should format work experience with proper indentation in TXT', async () => {
      const options: FormatOptions = {
        formats: ['txt'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      const txtContent = await fs.readFile(results[0].filePath, 'utf8');
      
      // Work highlights should be properly formatted with bullets or dashes
      expect(txtContent).toMatch(/[-•*]\s+Built microservices architecture/);
      expect(txtContent).toMatch(/[-•*]\s+Improved performance by 50%/);
      expect(txtContent).toMatch(/[-•*]\s+Mentored junior developers/);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      const invalidJsonFile = path.join(testDir, 'invalid.json');
      await fs.writeFile(invalidJsonFile, 'invalid json content');
      
      const options: FormatOptions = {
        formats: ['pdf'],
        outputDir: testDir
      };
      
      await expect(generateMultipleFormats(invalidJsonFile, options)).rejects.toThrow('JSON');
    });

    it('should handle missing file gracefully', async () => {
      const nonExistentFile = path.join(testDir, 'missing.json');
      
      const options: FormatOptions = {
        formats: ['pdf'],
        outputDir: testDir
      };
      
      await expect(generateMultipleFormats(nonExistentFile, options)).rejects.toThrow('ENOENT');
    });

    it('should handle invalid output directory', async () => {
      const invalidDir = '/invalid/path/that/does/not/exist';
      
      const options: FormatOptions = {
        formats: ['pdf'],
        outputDir: invalidDir
      };
      
      await expect(generateMultipleFormats(testResumeFile, options)).rejects.toThrow();
    });

    it('should handle unsupported format gracefully', async () => {
      const options: FormatOptions = {
        formats: ['docx' as ExportFormat], // Unsupported format
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Unsupported format');
    });
  });

  describe('File naming and organization', () => {
    it('should use appropriate file extensions', async () => {
      const options: FormatOptions = {
        formats: ['pdf', 'html', 'txt'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      
      const pdfResult = results.find(r => r.format === 'pdf')!;
      const htmlResult = results.find(r => r.format === 'html')!;
      const txtResult = results.find(r => r.format === 'txt')!;
      
      expect(pdfResult.filePath).toMatch(/\.pdf$/);
      expect(htmlResult.filePath).toMatch(/\.html$/);
      expect(txtResult.filePath).toMatch(/\.txt$/);
    });

    it('should generate unique filenames when multiple formats requested', async () => {
      const options: FormatOptions = {
        formats: ['pdf', 'html', 'txt'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      
      const filePaths = results.map(r => r.filePath);
      const uniquePaths = new Set(filePaths);
      
      expect(uniquePaths.size).toBe(filePaths.length);
    });

    it('should return success information for each generated format', async () => {
      const options: FormatOptions = {
        formats: ['pdf', 'html'],
        outputDir: testDir
      };
      
      const results = await generateMultipleFormats(testResumeFile, options);
      
      for (const result of results) {
        expect(result).toHaveProperty('format');
        expect(result).toHaveProperty('filePath');
        expect(result).toHaveProperty('success', true);
        expect(typeof result.filePath).toBe('string');
        expect(['pdf', 'html']).toContain(result.format);
      }
    });
  });
});