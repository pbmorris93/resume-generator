import { describe, it, expect } from 'vitest';
import { validateResumeData } from '../../src/validators/resume-validator.js';

describe('Resume Validator', () => {
  describe('JSON validation', () => {
    it('should throw error for invalid JSON structure', () => {
      const invalidJson = "not a valid json";
      expect(() => validateResumeData(invalidJson)).toThrow();
    });

    it('should throw error for missing required fields', () => {
      const incompleteResume = {
        basics: {
          name: "John Doe"
          // missing email
        }
        // missing work array
      };
      
      expect(() => validateResumeData(incompleteResume)).toThrow();
    });

    it('should pass validation for valid JSON structure', () => {
      const validResume = {
        basics: {
          name: "John Doe",
          email: "john@example.com"
        },
        work: [
          {
            name: "Example Corp",
            position: "Software Engineer", 
            startDate: "2020-01-01"
          }
        ]
      };
      
      expect(() => validateResumeData(validResume)).not.toThrow();
    });

    it('should validate email format', () => {
      const invalidEmailResume = {
        basics: {
          name: "John Doe",
          email: "not-an-email"
        },
        work: []
      };
      
      expect(() => validateResumeData(invalidEmailResume)).toThrow('email');
    });

    it('should validate date format in work experience', () => {
      const invalidDateResume = {
        basics: {
          name: "John Doe",
          email: "john@example.com"
        },
        work: [
          {
            name: "Example Corp",
            position: "Software Engineer",
            startDate: "not-a-date"
          }
        ]
      };
      
      expect(() => validateResumeData(invalidDateResume)).toThrow();
    });

    it('should return validation result with detailed error paths', () => {
      const invalidResume = {
        basics: {
          name: "",
          email: "invalid-email"
        },
        work: [
          {
            // missing required fields
          }
        ]
      };
      
      try {
        validateResumeData(invalidResume);
      } catch (error) {
        expect(error.message).toContain('basics.name');
        expect(error.message).toContain('basics.email');
        expect(error.message).toContain('work[0]');
      }
    });
  });
});