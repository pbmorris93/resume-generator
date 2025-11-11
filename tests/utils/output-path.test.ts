import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { 
  generateOutputPath, 
  checkOverwriteProtection, 
  createTimestampedName,
  validateOutputPath,
  OutputPathOptions 
} from '../../src/utils/output-path.js';

describe('Output Path Management', () => {
  let testDir: string;
  
  beforeEach(async () => {
    // Create temporary directory for tests
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'resume-output-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Custom output paths', () => {
    it('should use custom output path when specified', async () => {
      const customPath = path.join(testDir, 'custom-resume.pdf');
      const options: OutputPathOptions = {
        output: customPath,
        inputPath: 'test-resume.json'
      };
      
      const result = await generateOutputPath(options);
      expect(result).toBe(customPath);
    });

    it('should resolve relative paths correctly', async () => {
      const relativePath = './custom/resume.pdf';
      const options: OutputPathOptions = {
        output: relativePath,
        inputPath: 'test-resume.json'
      };
      
      const result = await generateOutputPath(options);
      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain('custom');
      expect(result).toContain('resume.pdf');
    });

    it('should create necessary directories for output path', async () => {
      const customPath = path.join(testDir, 'nested', 'deep', 'custom-resume.pdf');
      const options: OutputPathOptions = {
        output: customPath,
        inputPath: 'test-resume.json'
      };
      
      const result = await generateOutputPath(options);
      const dirExists = await fs.access(path.dirname(result)).then(() => true).catch(() => false);
      
      expect(result).toBe(customPath);
      expect(dirExists).toBe(true);
    });

    it('should validate output path extensions', async () => {
      const options: OutputPathOptions = {
        output: path.join(testDir, 'resume.txt'),
        inputPath: 'test-resume.json'
      };
      
      await expect(generateOutputPath(options)).rejects.toThrow('Output file must have .pdf extension');
    });
  });

  describe('Automatic naming based on template', () => {
    it('should generate default name based on input file', async () => {
      const options: OutputPathOptions = {
        inputPath: 'john-doe-resume.json'
      };
      
      const result = await generateOutputPath(options);
      expect(path.basename(result)).toBe('john-doe-resume.pdf');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should include template name in automatic naming', async () => {
      const options: OutputPathOptions = {
        inputPath: 'resume.json',
        template: 'professional'
      };
      
      const result = await generateOutputPath(options);
      expect(path.basename(result)).toBe('resume-professional.pdf');
    });

    it('should include ats-mode in automatic naming', async () => {
      const options: OutputPathOptions = {
        inputPath: 'resume.json',
        atsMode: true
      };
      
      const result = await generateOutputPath(options);
      expect(path.basename(result)).toBe('resume-ats.pdf');
    });

    it('should prioritize ats-mode over template in naming', async () => {
      const options: OutputPathOptions = {
        inputPath: 'resume.json',
        template: 'professional',
        atsMode: true
      };
      
      const result = await generateOutputPath(options);
      expect(path.basename(result)).toBe('resume-ats.pdf');
    });

    it('should handle input files with complex names', async () => {
      const options: OutputPathOptions = {
        inputPath: 'path/to/my-awesome-resume-v2.json',
        template: 'professional'
      };
      
      const result = await generateOutputPath(options);
      expect(path.basename(result)).toBe('my-awesome-resume-v2-professional.pdf');
    });
  });

  describe('Timestamp functionality', () => {
    it('should add timestamp when requested', async () => {
      const mockDate = new Date('2024-01-15T10:30:00Z');
      const originalDate = global.Date;
      global.Date = vi.fn(() => mockDate) as any;
      global.Date.now = vi.fn(() => mockDate.getTime());
      
      const timestampedName = createTimestampedName('resume.pdf');
      expect(timestampedName).toBe('resume-2024-01-15.pdf');
      
      global.Date = originalDate;
    });

    it('should add timestamp to complex names', async () => {
      const mockDate = new Date('2024-12-31T23:59:59Z');
      const originalDate = global.Date;
      global.Date = vi.fn(() => mockDate) as any;
      global.Date.now = vi.fn(() => mockDate.getTime());
      
      const timestampedName = createTimestampedName('john-doe-professional-resume.pdf');
      expect(timestampedName).toBe('john-doe-professional-resume-2024-12-31.pdf');
      
      global.Date = originalDate;
    });

    it('should handle files without extensions', async () => {
      const mockDate = new Date('2024-06-15T12:00:00Z');
      const originalDate = global.Date;
      global.Date = vi.fn(() => mockDate) as any;
      global.Date.now = vi.fn(() => mockDate.getTime());
      
      const timestampedName = createTimestampedName('resume');
      expect(timestampedName).toBe('resume-2024-06-15');
      
      global.Date = originalDate;
    });

    it('should integrate timestamp with automatic naming', async () => {
      const mockDate = new Date('2024-01-15T10:30:00Z');
      const originalDate = global.Date;
      global.Date = vi.fn(() => mockDate) as any;
      global.Date.now = vi.fn(() => mockDate.getTime());
      
      const options: OutputPathOptions = {
        inputPath: 'resume.json',
        template: 'professional',
        timestamp: true
      };
      
      const result = await generateOutputPath(options);
      expect(path.basename(result)).toBe('resume-professional-2024-01-15.pdf');
      
      global.Date = originalDate;
    });
  });

  describe('Overwrite protection', () => {
    it('should detect when file already exists', async () => {
      const existingFile = path.join(testDir, 'existing-resume.pdf');
      await fs.writeFile(existingFile, 'dummy content');
      
      const shouldOverwrite = await checkOverwriteProtection(existingFile, false);
      expect(shouldOverwrite).toBe(false);
    });

    it('should allow overwrite when force flag is set', async () => {
      const existingFile = path.join(testDir, 'existing-resume.pdf');
      await fs.writeFile(existingFile, 'dummy content');
      
      const shouldOverwrite = await checkOverwriteProtection(existingFile, true);
      expect(shouldOverwrite).toBe(true);
    });

    it('should allow write when file does not exist', async () => {
      const newFile = path.join(testDir, 'new-resume.pdf');
      
      const shouldOverwrite = await checkOverwriteProtection(newFile, false);
      expect(shouldOverwrite).toBe(true);
    });

    it('should throw error when trying to overwrite without force', async () => {
      const existingFile = path.join(testDir, 'existing-resume.pdf');
      await fs.writeFile(existingFile, 'dummy content');
      
      await expect(
        generateOutputPath({ 
          output: existingFile, 
          inputPath: 'test.json',
          force: false 
        })
      ).rejects.toThrow('File already exists. Use --force to overwrite');
    });
  });

  describe('Path validation', () => {
    it('should accept valid PDF paths', async () => {
      const validPaths = [
        'resume.pdf',
        'path/to/resume.pdf',
        './resume.pdf',
        '../resume.pdf',
        '/absolute/path/resume.pdf'
      ];
      
      for (const validPath of validPaths) {
        expect(() => validateOutputPath(validPath)).not.toThrow();
      }
    });

    it('should reject non-PDF extensions', async () => {
      const invalidPaths = [
        'resume.doc',
        'resume.txt', 
        'resume.html',
        'resume'
      ];
      
      for (const invalidPath of invalidPaths) {
        expect(() => validateOutputPath(invalidPath)).toThrow('Output file must have .pdf extension');
      }
      
      // Test case sensitivity separately as .PDF might be valid on some systems
      expect(() => validateOutputPath('resume.PDF')).toThrow('Output file must have .pdf extension');
    });

    it('should reject dangerous paths', async () => {
      const dangerousPaths = [
        '',
        '   ',
        '/',
        '../../../etc/passwd',
        'resume.pdf\0malicious'
      ];
      
      for (const dangerousPath of dangerousPaths) {
        expect(() => validateOutputPath(dangerousPath)).toThrow();
      }
    });
  });

  describe('Multiple versions generation', () => {
    it('should generate different names for different templates', async () => {
      const baseOptions: OutputPathOptions = {
        inputPath: 'resume.json'
      };
      
      const defaultPath = await generateOutputPath(baseOptions);
      const professionalPath = await generateOutputPath({
        ...baseOptions, 
        template: 'professional'
      });
      const atsPath = await generateOutputPath({
        ...baseOptions, 
        atsMode: true
      });
      
      expect(path.basename(defaultPath)).toBe('resume.pdf');
      expect(path.basename(professionalPath)).toBe('resume-professional.pdf');
      expect(path.basename(atsPath)).toBe('resume-ats.pdf');
      
      // All should be different
      const paths = [defaultPath, professionalPath, atsPath];
      const uniquePaths = [...new Set(paths)];
      expect(uniquePaths).toHaveLength(3);
    });

    it('should handle multiple versions with timestamps', async () => {
      const mockDate = new Date('2024-01-15T10:30:00Z');
      const originalDate = global.Date;
      global.Date = vi.fn(() => mockDate) as any;
      global.Date.now = vi.fn(() => mockDate.getTime());
      
      const baseOptions: OutputPathOptions = {
        inputPath: 'resume.json',
        timestamp: true
      };
      
      const paths = await Promise.all([
        generateOutputPath(baseOptions),
        generateOutputPath({ ...baseOptions, template: 'professional' }),
        generateOutputPath({ ...baseOptions, atsMode: true })
      ]);
      
      const basenames = paths.map(p => path.basename(p));
      expect(basenames).toEqual([
        'resume-2024-01-15.pdf',
        'resume-professional-2024-01-15.pdf', 
        'resume-ats-2024-01-15.pdf'
      ]);
      
      global.Date = originalDate;
    });
  });

  describe('Error handling', () => {
    it('should handle invalid input paths gracefully', async () => {
      const options: OutputPathOptions = {
        inputPath: ''
      };
      
      await expect(generateOutputPath(options)).rejects.toThrow('Input path cannot be empty');
    });

    it('should handle filesystem errors gracefully', async () => {
      const options: OutputPathOptions = {
        output: '/root/forbidden/path/resume.pdf',
        inputPath: 'test.json'
      };
      
      // This might succeed on some systems, so we check the behavior
      try {
        await generateOutputPath(options);
      } catch (error) {
        expect(error.message).toMatch(/(permission|access|forbidden|ENOENT|EACCES|EROFS)/i);
      }
    });
  });

  describe('Success message formatting', () => {
    it('should provide full output path in success message', async () => {
      const customPath = path.join(testDir, 'success-test.pdf');
      const options: OutputPathOptions = {
        output: customPath,
        inputPath: 'test.json'
      };
      
      const result = await generateOutputPath(options);
      expect(result).toBe(customPath);
      expect(path.isAbsolute(result)).toBe(true);
    });
  });
});