import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { generatePDF, PDFOptions } from '../../src/generators/pdf-generator.js';
import { generateHTML } from '../../src/templates/html-generator.js';
import { generateMultipleFormats, FormatOptions } from '../../src/generators/multi-format-generator.js';

describe('Deterministic Generation', () => {
  let testDir: string;
  let testResumeFile: string;
  let sampleResumeData: any;
  
  beforeEach(async () => {
    // Create temporary directory for tests
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'deterministic-test-'));
    testResumeFile = path.join(testDir, 'test-resume.json');
    
    // Sample resume data with various date formats and sections
    sampleResumeData = {
      basics: {
        name: "John Doe",
        label: "Software Engineer",
        email: "john@example.com",
        phone: "(555) 123-4567",
        url: "https://johndoe.dev",
        summary: "Experienced software engineer with expertise in web development.",
        location: {
          city: "San Francisco",
          region: "CA"
        },
        profiles: [
          {
            network: "LinkedIn",
            username: "johndoe",
            url: "https://linkedin.com/in/johndoe"
          },
          {
            network: "GitHub",
            username: "johndoe",
            url: "https://github.com/johndoe"
          }
        ]
      },
      work: [
        {
          name: "Tech Corp",
          position: "Senior Software Engineer",
          startDate: "2021-03-15",
          endDate: "2024-01-10",
          location: "San Francisco, CA",
          summary: "Led development of microservices architecture.",
          highlights: [
            "Improved system performance by 40%",
            "Led team of 5 developers",
            "Implemented CI/CD pipelines"
          ]
        },
        {
          name: "StartupCo",
          position: "Full Stack Developer",
          startDate: "2019-06-01",
          endDate: "2021-03-01",
          location: "Remote",
          summary: "Built web applications from scratch.",
          highlights: [
            "Developed React frontend",
            "Built Node.js backend APIs",
            "Managed AWS infrastructure"
          ]
        }
      ],
      education: [
        {
          institution: "University of California",
          area: "Computer Science",
          studyType: "Bachelor",
          startDate: "2015-09-01",
          endDate: "2019-06-01",
          gpa: "3.8"
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
        },
        {
          name: "Tools",
          keywords: ["Git", "Docker", "AWS", "Kubernetes"]
        }
      ],
      projects: [
        {
          name: "E-commerce Platform",
          description: "Full-stack e-commerce solution",
          startDate: "2023-01-01",
          endDate: "2023-06-01",
          url: "https://github.com/johndoe/ecommerce",
          highlights: [
            "Built with React and Node.js",
            "Integrated payment processing",
            "Deployed on AWS"
          ],
          keywords: ["React", "Node.js", "AWS", "MongoDB"]
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

  describe('Binary identical PDF generation', () => {
    it('should produce byte-identical PDFs from same input', async () => {
      const options: PDFOptions = {
        output: path.join(testDir, 'resume1.pdf'),
        template: 'ats'
      };
      
      // Generate first PDF
      await generatePDF(sampleResumeData, options);
      const pdf1Content = await fs.readFile(options.output!);
      
      // Generate second PDF with same input
      const options2: PDFOptions = {
        output: path.join(testDir, 'resume2.pdf'),
        template: 'ats'
      };
      
      await generatePDF(sampleResumeData, options2);
      const pdf2Content = await fs.readFile(options2.output!);
      
      // PDFs should be byte-identical
      expect(pdf1Content.equals(pdf2Content)).toBe(true);
    });

    it('should produce identical PDFs across multiple generations', async () => {
      const pdfs: Buffer[] = [];
      
      // Generate 5 PDFs with same input
      for (let i = 0; i < 5; i++) {
        const outputPath = path.join(testDir, `resume${i}.pdf`);
        const options: PDFOptions = {
          output: outputPath,
          template: 'ats'
        };
        
        await generatePDF(sampleResumeData, options);
        const pdfContent = await fs.readFile(outputPath);
        pdfs.push(pdfContent);
      }
      
      // All PDFs should be identical to the first one
      const firstPdf = pdfs[0];
      for (let i = 1; i < pdfs.length; i++) {
        expect(pdfs[i].equals(firstPdf)).toBe(true);
      }
    });

    it('should produce identical PDFs regardless of generation timing', async () => {
      // Generate first PDF
      const options1: PDFOptions = {
        output: path.join(testDir, 'resume_time1.pdf'),
        template: 'ats'
      };
      
      await generatePDF(sampleResumeData, options1);
      const pdf1Content = await fs.readFile(options1.output!);
      
      // Wait a short time to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Generate second PDF
      const options2: PDFOptions = {
        output: path.join(testDir, 'resume_time2.pdf'),
        template: 'ats'
      };
      
      await generatePDF(sampleResumeData, options2);
      const pdf2Content = await fs.readFile(options2.output!);
      
      // PDFs should be identical despite timing difference
      expect(pdf1Content.equals(pdf2Content)).toBe(true);
    });
  });

  describe('Date formatting consistency', () => {
    it('should format dates consistently across generations', async () => {
      const htmlOutputs: string[] = [];
      
      // Generate HTML multiple times
      for (let i = 0; i < 3; i++) {
        const html = await generateHTML(sampleResumeData, { template: 'ats' });
        htmlOutputs.push(html);
      }
      
      // All HTML outputs should be identical
      const firstHtml = htmlOutputs[0];
      for (let i = 1; i < htmlOutputs.length; i++) {
        expect(htmlOutputs[i]).toBe(firstHtml);
      }
    });

    it('should handle different date input formats consistently', async () => {
      const testDataVariations = [
        // ISO format with different precision
        { ...sampleResumeData, work: [{ ...sampleResumeData.work[0], startDate: "2021-03-15T00:00:00.000Z" }] },
        { ...sampleResumeData, work: [{ ...sampleResumeData.work[0], startDate: "2021-03-15T12:30:45Z" }] },
        { ...sampleResumeData, work: [{ ...sampleResumeData.work[0], startDate: "2021-03-15" }] }
      ];
      
      const htmlOutputs: string[] = [];
      
      for (const data of testDataVariations) {
        const html = await generateHTML(data, { template: 'ats' });
        htmlOutputs.push(html);
      }
      
      // All outputs should contain consistently formatted dates
      for (const html of htmlOutputs) {
        // Should contain formatted date ranges
        expect(html).toContain('2021');
        expect(html).toContain('March'); 
      }
      
      // All outputs should be identical
      for (let i = 1; i < htmlOutputs.length; i++) {
        expect(htmlOutputs[i]).toBe(htmlOutputs[0]);
      }
    });

    it('should use configurable date format consistently', async () => {
      // Test with different date format configurations
      const options1: PDFOptions = {
        output: path.join(testDir, 'resume_date1.pdf'),
        template: 'ats',
        dateFormat: 'long' // Should be consistent
      };
      
      const options2: PDFOptions = {
        output: path.join(testDir, 'resume_date2.pdf'),
        template: 'ats',
        dateFormat: 'long' // Same format
      };
      
      const html1 = await generateHTML(sampleResumeData, options1);
      const html2 = await generateHTML(sampleResumeData, options2);
      
      expect(html1).toBe(html2);
    });
  });

  describe('Element ordering consistency', () => {
    it('should preserve work experience order consistently', async () => {
      const htmlOutputs: string[] = [];
      
      // Generate HTML multiple times
      for (let i = 0; i < 5; i++) {
        const html = await generateHTML(sampleResumeData, { template: 'ats' });
        htmlOutputs.push(html);
      }
      
      // Extract work experience order from each HTML
      for (const html of htmlOutputs) {
        const techCorpIndex = html.indexOf('Tech Corp');
        const startupCoIndex = html.indexOf('StartupCo');
        
        expect(techCorpIndex).toBeLessThan(startupCoIndex);
        expect(techCorpIndex).toBeGreaterThan(-1);
        expect(startupCoIndex).toBeGreaterThan(-1);
      }
      
      // All HTML outputs should be identical
      const firstHtml = htmlOutputs[0];
      for (let i = 1; i < htmlOutputs.length; i++) {
        expect(htmlOutputs[i]).toBe(firstHtml);
      }
    });

    it('should preserve skills array order consistently', async () => {
      const htmlOutputs: string[] = [];
      
      // Generate HTML multiple times
      for (let i = 0; i < 3; i++) {
        const html = await generateHTML(sampleResumeData, { template: 'ats' });
        htmlOutputs.push(html);
      }
      
      // Check that skills appear in consistent order
      for (const html of htmlOutputs) {
        const programmingIndex = html.indexOf('Programming Languages');
        const frameworksIndex = html.indexOf('Frameworks');
        const toolsIndex = html.indexOf('Tools');
        
        expect(programmingIndex).toBeLessThan(frameworksIndex);
        expect(frameworksIndex).toBeLessThan(toolsIndex);
      }
      
      // All outputs should be identical
      const firstHtml = htmlOutputs[0];
      for (let i = 1; i < htmlOutputs.length; i++) {
        expect(htmlOutputs[i]).toBe(firstHtml);
      }
    });

    it('should preserve profiles array order consistently', async () => {
      const htmlOutputs: string[] = [];
      
      // Generate HTML multiple times
      for (let i = 0; i < 3; i++) {
        const html = await generateHTML(sampleResumeData, { template: 'ats' });
        htmlOutputs.push(html);
      }
      
      // Check that profiles appear in consistent order (LinkedIn before GitHub)
      for (const html of htmlOutputs) {
        const linkedinIndex = html.indexOf('linkedin.com');
        const githubIndex = html.indexOf('github.com');
        
        if (linkedinIndex > -1 && githubIndex > -1) {
          expect(linkedinIndex).toBeLessThan(githubIndex);
        }
      }
    });
  });

  describe('Template determinism', () => {
    it('should produce identical HTML for same template and data', async () => {
      const templates = ['ats', 'professional'] as const;
      
      for (const template of templates) {
        const htmlOutputs: string[] = [];
        
        // Generate same template multiple times
        for (let i = 0; i < 3; i++) {
          const html = await generateHTML(sampleResumeData, { template });
          htmlOutputs.push(html);
        }
        
        // All outputs for this template should be identical
        const firstHtml = htmlOutputs[0];
        for (let i = 1; i < htmlOutputs.length; i++) {
          expect(htmlOutputs[i]).toBe(firstHtml);
        }
      }
    });

    it('should produce different but consistent output for different templates', async () => {
      const atsHtml1 = await generateHTML(sampleResumeData, { template: 'ats' });
      const atsHtml2 = await generateHTML(sampleResumeData, { template: 'ats' });
      
      const professionalHtml1 = await generateHTML(sampleResumeData, { template: 'professional' });
      const professionalHtml2 = await generateHTML(sampleResumeData, { template: 'professional' });
      
      // Same template should produce identical output
      expect(atsHtml1).toBe(atsHtml2);
      expect(professionalHtml1).toBe(professionalHtml2);
      
      // Templates should maintain ATS compatibility
      expect(atsHtml1).toContain('Arial, sans-serif');
      expect(professionalHtml1).toContain('Arial, sans-serif');
    });
  });

  describe('PDF metadata consistency', () => {
    it('should exclude timestamps from PDF metadata', async () => {
      // Generate PDFs at different times
      const options1: PDFOptions = {
        output: path.join(testDir, 'resume_meta1.pdf'),
        template: 'ats'
      };
      
      await generatePDF(sampleResumeData, options1);
      
      // Wait to ensure different creation time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const options2: PDFOptions = {
        output: path.join(testDir, 'resume_meta2.pdf'),
        template: 'ats'
      };
      
      await generatePDF(sampleResumeData, options2);
      
      // Read both PDFs
      const pdf1Content = await fs.readFile(options1.output!);
      const pdf2Content = await fs.readFile(options2.output!);
      
      // PDFs should be identical (no timestamp differences)
      expect(pdf1Content.equals(pdf2Content)).toBe(true);
    });

    it('should have deterministic PDF properties', async () => {
      const options: PDFOptions = {
        output: path.join(testDir, 'resume_props.pdf'),
        template: 'ats'
      };
      
      await generatePDF(sampleResumeData, options);
      
      // Verify PDF exists and has content
      const pdfContent = await fs.readFile(options.output!);
      expect(pdfContent.length).toBeGreaterThan(0);
      
      // Check that PDF doesn't contain variable timestamps in metadata
      const pdfString = pdfContent.toString('binary');
      
      // Should not contain creation or modification dates that would vary
      // Look for absence of common PDF timestamp patterns
      expect(pdfString).not.toMatch(/\/CreationDate \(D:\d{14}/);
      expect(pdfString).not.toMatch(/\/ModDate \(D:\d{14}/);
    });
  });

  describe('CSS determinism', () => {
    it('should generate consistent CSS across multiple renders', async () => {
      const htmlOutputs: string[] = [];
      
      // Generate HTML multiple times
      for (let i = 0; i < 3; i++) {
        const html = await generateHTML(sampleResumeData, { template: 'ats' });
        htmlOutputs.push(html);
      }
      
      // Extract CSS sections from each HTML
      const cssRegex = /<style[^>]*>([\s\S]*?)<\/style>/g;
      
      for (let i = 0; i < htmlOutputs.length; i++) {
        const matches = htmlOutputs[i].match(cssRegex);
        if (i === 0) {
          // Store first CSS for comparison
          expect(matches).toBeTruthy();
        } else {
          // Compare with first CSS
          const firstMatches = htmlOutputs[0].match(cssRegex);
          expect(matches).toEqual(firstMatches);
        }
      }
    });

    it('should have stable CSS property ordering', async () => {
      const html = await generateHTML(sampleResumeData, { template: 'ats' });
      
      // Extract CSS content
      const cssMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
      expect(cssMatch).toBeTruthy();
      
      const cssContent = cssMatch![1];
      
      // CSS properties should be in a consistent order
      // Check for consistent patterns
      expect(cssContent).toContain('font-family');
      expect(cssContent).toContain('font-size');
      expect(cssContent).toContain('line-height');
      
      // Generate again and ensure same CSS
      const html2 = await generateHTML(sampleResumeData, { template: 'ats' });
      const cssMatch2 = html2.match(/<style[^>]*>([\s\S]*?)<\/style>/);
      
      expect(cssMatch2![1]).toBe(cssContent);
    });
  });

  describe('Multi-format consistency', () => {
    it('should produce consistent output across all formats', async () => {
      const options: FormatOptions = {
        formats: ['pdf', 'html', 'txt'],
        outputDir: testDir,
        baseName: 'test-resume'
      };
      
      // Generate first set
      const results1 = await generateMultipleFormats(testResumeFile, options);
      const files1 = await Promise.all(
        results1.map(async r => ({
          format: r.format,
          content: await fs.readFile(r.filePath)
        }))
      );
      
      // Generate second set
      const results2 = await generateMultipleFormats(testResumeFile, {
        ...options,
        baseName: 'test-resume-2'
      });
      const files2 = await Promise.all(
        results2.map(async r => ({
          format: r.format,
          content: await fs.readFile(r.filePath)
        }))
      );
      
      // Compare files by format
      for (const file1 of files1) {
        const file2 = files2.find(f => f.format === file1.format);
        expect(file2).toBeTruthy();
        
        if (file1.format === 'pdf') {
          // PDFs should be byte-identical
          expect(file1.content.equals(file2!.content)).toBe(true);
        } else {
          // Text-based formats should be identical
          expect(file1.content.toString('utf8')).toBe(file2!.content.toString('utf8'));
        }
      }
    });
  });

  describe('Reproducible builds', () => {
    it('should generate identical output in different environments', async () => {
      // Simulate different environment conditions
      const originalTZ = process.env.TZ;
      const originalLocale = process.env.LANG;
      
      try {
        // Test with different timezone
        process.env.TZ = 'UTC';
        const options1: PDFOptions = {
          output: path.join(testDir, 'resume_env1.pdf'),
          template: 'ats'
        };
        await generatePDF(sampleResumeData, options1);
        const pdf1 = await fs.readFile(options1.output!);
        
        // Test with different timezone
        process.env.TZ = 'America/New_York';
        const options2: PDFOptions = {
          output: path.join(testDir, 'resume_env2.pdf'),
          template: 'ats'
        };
        await generatePDF(sampleResumeData, options2);
        const pdf2 = await fs.readFile(options2.output!);
        
        // PDFs should be identical regardless of environment
        expect(pdf1.equals(pdf2)).toBe(true);
        
      } finally {
        // Restore environment
        if (originalTZ) {
          process.env.TZ = originalTZ;
        } else {
          delete process.env.TZ;
        }
        if (originalLocale) {
          process.env.LANG = originalLocale;
        }
      }
    });

    it('should handle edge cases consistently', async () => {
      // Test with edge case data
      const edgeCaseData = {
        ...sampleResumeData,
        work: [
          {
            ...sampleResumeData.work[0],
            highlights: [
              "Text with \"quotes\" and 'apostrophes'",
              "Text with special chars: äöü ñ ç",
              "Text with numbers: 1,234.56 and percentages: 42.5%"
            ]
          }
        ]
      };
      
      // Generate multiple times
      const htmlOutputs: string[] = [];
      for (let i = 0; i < 3; i++) {
        const html = await generateHTML(edgeCaseData, { template: 'ats' });
        htmlOutputs.push(html);
      }
      
      // All should be identical
      const firstHtml = htmlOutputs[0];
      for (let i = 1; i < htmlOutputs.length; i++) {
        expect(htmlOutputs[i]).toBe(firstHtml);
      }
    });
  });
});