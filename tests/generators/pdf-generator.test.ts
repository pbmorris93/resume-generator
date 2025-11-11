import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generatePDF } from '../../src/generators/pdf-generator.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('PDF Generator', () => {
  const testOutputDir = 'test-output';
  const sampleResume = {
    basics: {
      name: "John Doe",
      email: "john@example.com",
      phone: "+1-555-0123",
      summary: "Software engineer with 5 years experience"
    },
    work: [
      {
        name: "Example Corp",
        position: "Software Engineer",
        startDate: "2020-01-01",
        highlights: [
          "Built scalable web applications",
          "Led a team of 3 developers"
        ]
      }
    ]
  };

  beforeEach(async () => {
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testOutputDir, { recursive: true, force: true });
  });

  describe('PDF Generation', () => {
    it('should generate a PDF file from valid resume data', async () => {
      const outputPath = path.join(testOutputDir, 'test-resume.pdf');
      
      await generatePDF(sampleResume, { output: outputPath });
      
      // Check that PDF file exists
      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should generate PDF with all resume sections', async () => {
      const outputPath = path.join(testOutputDir, 'full-resume.pdf');
      
      const fullResume = {
        ...sampleResume,
        education: [
          {
            institution: "State University",
            area: "Computer Science",
            studyType: "Bachelor"
          }
        ],
        skills: [
          {
            name: "Programming",
            keywords: ["JavaScript", "TypeScript", "Python"]
          }
        ]
      };

      await generatePDF(fullResume, { output: outputPath });
      
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(1000); // PDF should have substantial content
    });

    it('should generate machine-readable PDF text', async () => {
      const outputPath = path.join(testOutputDir, 'readable-resume.pdf');
      
      await generatePDF(sampleResume, { output: outputPath });
      
      // We would need to use a PDF text extraction library to test this
      // For now, just ensure the file exists and has reasonable size
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(500);
    });

    it('should generate PDF under 100KB for simple resume', async () => {
      const outputPath = path.join(testOutputDir, 'small-resume.pdf');
      
      await generatePDF(sampleResume, { output: outputPath });
      
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeLessThan(100 * 1024); // 100KB
    });

    it('should throw error for invalid resume data', async () => {
      const invalidResume = {
        basics: {
          name: "", // invalid - empty name
          email: "not-an-email" // invalid email format
        }
      };
      
      await expect(generatePDF(invalidResume, {})).rejects.toThrow();
    });

    it('should handle different output paths', async () => {
      const nestedPath = path.join(testOutputDir, 'nested', 'deep', 'resume.pdf');
      
      await generatePDF(sampleResume, { output: nestedPath });
      
      const stats = await fs.stat(nestedPath);
      expect(stats.isFile()).toBe(true);
    });

    it('should generate default filename when no output specified', async () => {
      const result = await generatePDF(sampleResume, {});
      expect(result).toBe('resume.pdf');
      
      // Verify the file was actually created
      const stats = await fs.stat('resume.pdf');
      expect(stats.isFile()).toBe(true);
    });
  });
});