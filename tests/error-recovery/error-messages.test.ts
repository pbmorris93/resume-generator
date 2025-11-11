import { describe, it, expect } from 'vitest';
import { 
  ValidationError, 
  FileSystemError, 
  PDFGenerationError, 
  TemplateError,
  NetworkError 
} from '../../src/utils/errors.js';
import { formatErrorForCLI, getExitCode } from '../../src/utils/error-handler.js';

describe('Enhanced Error Messages', () => {
  describe('ValidationError', () => {
    it('should provide actionable messages for required field errors', () => {
      const mockErrors = [{
        keyword: 'required',
        instancePath: '/basics',
        params: { missingProperty: 'name' }
      }];

      const error = new ValidationError('Missing required field', mockErrors);
      
      expect(error.suggestions).toHaveLength(1);
      expect(error.suggestions[0].action).toContain('name');
      expect(error.suggestions[0].explanation).toContain('required');
    });

    it('should provide specific suggestions for email format errors', () => {
      const mockErrors = [{
        keyword: 'format',
        instancePath: '/basics/email',
        params: { format: 'email' },
        data: 'invalid-email'
      }];

      const error = new ValidationError('Invalid email format', mockErrors);
      
      expect(error.suggestions).toHaveLength(1);
      expect(error.suggestions[0].action).toContain('email format');
      expect(error.suggestions[0].explanation).toContain('user@example.com');
    });

    it('should provide specific suggestions for date format errors', () => {
      const mockErrors = [{
        keyword: 'format',
        instancePath: '/work/0/startDate',
        params: { format: 'date' },
        data: '2024/01/15'
      }];

      const error = new ValidationError('Invalid date format', mockErrors);
      
      expect(error.suggestions).toHaveLength(1);
      expect(error.suggestions[0].action).toContain('date format');
      expect(error.suggestions[0].explanation).toContain('2024-01-15');
    });

    it('should provide specific suggestions for URL format errors', () => {
      const mockErrors = [{
        keyword: 'format',
        instancePath: '/basics/url',
        params: { format: 'uri' },
        data: 'invalid-url'
      }];

      const error = new ValidationError('Invalid URL format', mockErrors);
      
      expect(error.suggestions).toHaveLength(1);
      expect(error.suggestions[0].action).toContain('URL format');
      expect(error.suggestions[0].explanation).toContain('https://example.com');
    });

    it('should provide type conversion suggestions', () => {
      const mockErrors = [{
        keyword: 'type',
        instancePath: '/basics/profiles',
        params: { type: 'array' },
        data: 'not-an-array'
      }];

      const error = new ValidationError('Type mismatch', mockErrors);
      
      expect(error.suggestions).toHaveLength(1);
      expect(error.suggestions[0].action).toContain('array type');
      expect(error.suggestions[0].explanation).toContain('Expected array');
    });

    it('should provide generic suggestions when no specific ones apply', () => {
      const mockErrors = [{
        keyword: 'unknown',
        instancePath: '/unknown',
        params: {}
      }];

      const error = new ValidationError('Unknown error', mockErrors);
      
      expect(error.suggestions.length).toBeGreaterThan(0);
      expect(error.suggestions.some(s => s.command)).toBe(true);
    });

    it('should include line numbers when available', () => {
      const error = new ValidationError('Syntax error', [], 15, 23);
      
      expect(error.lineNumber).toBe(15);
      expect(error.columnNumber).toBe(23);
      expect(error.message).toContain('line 15');
      expect(error.message).toContain('column 23');
    });
  });

  describe('FileSystemError', () => {
    it('should provide suggestions for file not found errors', () => {
      const error = new FileSystemError('File not found: resume.json', false, 'resume.json');
      
      expect(error.suggestions.length).toBeGreaterThan(0);
      expect(error.suggestions.some(s => s.action.includes('file path'))).toBe(true);
      expect(error.suggestions.some(s => s.command && s.command.includes('init'))).toBe(true);
    });

    it('should provide suggestions for permission errors', () => {
      const error = new FileSystemError('Permission denied accessing /protected/file', false, '/protected/file');
      
      expect(error.suggestions.some(s => s.action.includes('permission'))).toBe(true);
      expect(error.suggestions.some(s => s.command && s.command.includes('ls -la'))).toBe(true);
    });

    it('should provide suggestions for disk space errors', () => {
      const error = new FileSystemError('No space left on device', false);
      
      expect(error.suggestions.some(s => s.action.includes('disk space'))).toBe(true);
      expect(error.suggestions.some(s => s.command && s.command.includes('df -h'))).toBe(true);
    });
  });

  describe('PDFGenerationError', () => {
    it('should provide suggestions for browser-related errors', () => {
      const error = new PDFGenerationError('Chromium browser not found');
      
      expect(error.suggestions.some(s => s.action.includes('browser'))).toBe(true);
      expect(error.suggestions.some(s => s.command && s.command.includes('playwright install'))).toBe(true);
    });

    it('should provide suggestions for timeout errors', () => {
      const error = new PDFGenerationError('PDF generation timeout');
      
      expect(error.suggestions.some(s => s.action.includes('simpler template'))).toBe(true);
      expect(error.suggestions.some(s => s.command && s.command.includes('--ats-mode'))).toBe(true);
    });

    it('should provide suggestions for memory errors', () => {
      const error = new PDFGenerationError('JavaScript heap out of memory');
      
      expect(error.suggestions.some(s => s.action.includes('memory'))).toBe(true);
      expect(error.suggestions.some(s => s.command && s.command.includes('--max-old-space-size'))).toBe(true);
    });

    it('should always include validation suggestion', () => {
      const error = new PDFGenerationError('Unknown error');
      
      expect(error.suggestions.some(s => s.action.includes('Validate'))).toBe(true);
      expect(error.suggestions.some(s => s.command && s.command.includes('validate'))).toBe(true);
    });
  });

  describe('TemplateError', () => {
    it('should provide template alternatives', () => {
      const error = new TemplateError('Template rendering failed', 'custom-template');
      
      expect(error.suggestions.some(s => s.action.includes('different template'))).toBe(true);
      expect(error.suggestions.some(s => s.action.includes('ATS mode'))).toBe(true);
    });
  });

  describe('NetworkError', () => {
    it('should provide network troubleshooting suggestions', () => {
      const error = new NetworkError('Connection failed');
      
      expect(error.suggestions.some(s => s.action.includes('internet connection'))).toBe(true);
      expect(error.suggestions.some(s => s.action.includes('offline mode'))).toBe(true);
    });
  });

  describe('Error Formatting', () => {
    it('should format basic error messages correctly', () => {
      const error = new ValidationError('Test error');
      const formatted = formatErrorForCLI(error, false);
      
      expect(formatted).toContain('❌');
      expect(formatted).toContain('Test error');
    });

    it('should include suggestions in formatted output', () => {
      const mockErrors = [{
        keyword: 'required',
        instancePath: '/basics',
        params: { missingProperty: 'name' }
      }];

      const error = new ValidationError('Missing field', mockErrors);
      const formatted = formatErrorForCLI(error, false);
      
      expect(formatted).toContain('💡 Suggestions:');
      expect(formatted).toContain('1.');
    });

    it('should include debug info when requested', () => {
      const error = new ValidationError('Test error');
      const formatted = formatErrorForCLI(error, true);
      
      expect(formatted).toContain('🔍 Debug Info:');
      expect(formatted).toContain('Error Code:');
    });

    it('should handle non-ResumeGeneratorError instances', () => {
      const error = new Error('Generic error');
      const formatted = formatErrorForCLI(error, false);
      
      expect(formatted).toContain('❌');
      expect(formatted).toContain('Generic error');
    });

    it('should include stack trace in debug mode for generic errors', () => {
      const error = new Error('Generic error');
      error.stack = 'Stack trace here';
      const formatted = formatErrorForCLI(error, true);
      
      expect(formatted).toContain('🔍 Debug Info:');
      expect(formatted).toContain('Stack trace here');
    });
  });

  describe('Exit Codes', () => {
    it('should return 1 for normal ResumeGeneratorError', () => {
      const error = new ValidationError('Normal error');
      expect(getExitCode(error)).toBe(1);
    });

    it('should return 2 for catastrophic ResumeGeneratorError', () => {
      const error = new FileSystemError('Catastrophic error', true);
      expect(getExitCode(error)).toBe(2);
    });

    it('should return 1 for generic errors', () => {
      const error = new Error('Generic error');
      expect(getExitCode(error)).toBe(1);
    });
  });

  describe('Error Chaining and Context', () => {
    it('should preserve error context in PDF generation errors', () => {
      const error = new PDFGenerationError('Render failed', 'template-professional');
      
      expect(error.context).toBe('template-professional');
      expect(error.code).toBe('PDF_GENERATION_ERROR');
    });

    it('should preserve file path in filesystem errors', () => {
      const error = new FileSystemError('Access denied', false, '/path/to/file');
      
      expect(error.filePath).toBe('/path/to/file');
      expect(error.suggestions.some(s => s.explanation?.includes('/path/to/file'))).toBe(true);
    });

    it('should preserve template name in template errors', () => {
      const error = new TemplateError('Compilation failed', 'custom-template');
      
      expect(error.templateName).toBe('custom-template');
    });
  });
});