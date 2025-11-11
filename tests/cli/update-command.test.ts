import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { updateCommand } from '../../src/cli/commands/update.js';
import { 
  updateField, 
  addWorkExperience, 
  createBackup,
  UpdateOptions 
} from '../../src/utils/json-update.js';

describe('Update Command', () => {
  let testDir: string;
  let testResumeFile: string;
  let sampleResumeData: any;
  
  beforeEach(async () => {
    // Create temporary directory for tests
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'resume-update-test-'));
    testResumeFile = path.join(testDir, 'test-resume.json');
    
    // Sample resume data
    sampleResumeData = {
      basics: {
        name: "John Doe",
        label: "Software Engineer",
        email: "john@example.com",
        phone: "(555) 123-4567",
        url: "https://johndoe.dev",
        summary: "Experienced software engineer.",
        location: {
          city: "San Francisco",
          region: "CA"
        },
        profiles: [
          {
            network: "LinkedIn",
            username: "johndoe",
            url: "https://linkedin.com/in/johndoe"
          }
        ]
      },
      work: [
        {
          name: "Tech Corp",
          position: "Senior Software Engineer",
          startDate: "2020-01-01",
          endDate: "2024-01-01",
          location: "San Francisco, CA",
          summary: "Led development of microservices architecture.",
          highlights: [
            "Improved system performance by 40%",
            "Led team of 5 developers"
          ]
        }
      ],
      education: [
        {
          institution: "University of California",
          area: "Computer Science",
          studyType: "Bachelor",
          startDate: "2016-09-01",
          endDate: "2020-06-01",
          gpa: "3.8"
        }
      ],
      skills: [
        {
          name: "Programming Languages",
          keywords: ["JavaScript", "TypeScript", "Python"]
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

  describe('Single field updates', () => {
    it('should update basic string fields', async () => {
      const options: UpdateOptions = {
        set: 'basics.name=Jane Smith'
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.basics.name).toBe('Jane Smith');
      
      // Ensure other data is preserved
      expect(updatedData.basics.email).toBe('john@example.com');
      expect(updatedData.work[0].name).toBe('Tech Corp');
    });

    it('should update nested object fields', async () => {
      const options: UpdateOptions = {
        set: 'basics.location.city=New York'
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.basics.location.city).toBe('New York');
      expect(updatedData.basics.location.region).toBe('CA'); // preserved
    });

    it('should update array elements by index', async () => {
      const options: UpdateOptions = {
        set: 'work[0].position=Principal Software Engineer'
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.work[0].position).toBe('Principal Software Engineer');
      expect(updatedData.work[0].name).toBe('Tech Corp'); // preserved
    });

    it('should handle phone number updates with special characters', async () => {
      const options: UpdateOptions = {
        set: 'basics.phone=(555) 987-6543'
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.basics.phone).toBe('(555) 987-6543');
    });

    it('should handle URL updates', async () => {
      const options: UpdateOptions = {
        set: 'basics.url=https://janedoe.dev'
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.basics.url).toBe('https://janedoe.dev');
    });

    it('should handle date updates', async () => {
      const options: UpdateOptions = {
        set: 'work[0].endDate=2025-01-01'
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.work[0].endDate).toBe('2025-01-01');
    });

    it('should handle summary text updates', async () => {
      const newSummary = 'Senior software engineer with 8+ years of experience in full-stack development.';
      const options: UpdateOptions = {
        set: `basics.summary=${newSummary}`
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.basics.summary).toBe(newSummary);
    });
  });

  describe('Multiple field updates', () => {
    it('should update multiple fields in a single command', async () => {
      const options: UpdateOptions = {
        set: [
          'basics.name=Jane Smith',
          'basics.phone=(555) 987-6543',
          'basics.location.city=Seattle'
        ]
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.basics.name).toBe('Jane Smith');
      expect(updatedData.basics.phone).toBe('(555) 987-6543');
      expect(updatedData.basics.location.city).toBe('Seattle');
      
      // Ensure other data is preserved
      expect(updatedData.basics.email).toBe('john@example.com');
      expect(updatedData.work[0].name).toBe('Tech Corp');
    });
  });

  describe('Adding new work experience', () => {
    it('should add new work experience entry', async () => {
      const newWorkEntry = {
        name: "New Company",
        position: "Staff Engineer", 
        startDate: "2024-02-01",
        location: "Remote",
        summary: "Leading platform architecture initiatives."
      };
      
      const options: UpdateOptions = {
        addWork: newWorkEntry
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.work).toHaveLength(2);
      expect(updatedData.work[0]).toEqual(newWorkEntry); // Added at beginning
      expect(updatedData.work[1].name).toBe('Tech Corp'); // Original preserved
    });

    it('should add work experience with highlights', async () => {
      const newWorkEntry = {
        name: "Startup Inc",
        position: "Tech Lead",
        startDate: "2024-01-01",
        highlights: [
          "Built microservices architecture from scratch",
          "Mentored junior developers",
          "Improved deployment pipeline efficiency by 60%"
        ]
      };
      
      const options: UpdateOptions = {
        addWork: newWorkEntry
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.work[0].highlights).toEqual(newWorkEntry.highlights);
    });
  });

  describe('Data preservation', () => {
    it('should preserve existing data when updating single fields', async () => {
      const originalData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      
      const options: UpdateOptions = {
        set: 'basics.name=Jane Smith'
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      
      // Name should be updated
      expect(updatedData.basics.name).toBe('Jane Smith');
      
      // Everything else should be preserved
      expect(updatedData.basics.email).toBe(originalData.basics.email);
      expect(updatedData.basics.phone).toBe(originalData.basics.phone);
      expect(updatedData.work).toEqual(originalData.work);
      expect(updatedData.education).toEqual(originalData.education);
      expect(updatedData.skills).toEqual(originalData.skills);
    });

    it('should preserve JSON formatting and structure', async () => {
      const options: UpdateOptions = {
        set: 'basics.name=Jane Smith'
      };
      
      await updateCommand(testResumeFile, options);
      
      const fileContent = await fs.readFile(testResumeFile, 'utf8');
      
      // Should be properly formatted JSON
      expect(() => JSON.parse(fileContent)).not.toThrow();
      
      // Should maintain indentation (2 spaces)
      expect(fileContent).toContain('  "basics"');
      expect(fileContent).toContain('    "name"');
    });

    it('should preserve array order when adding new items', async () => {
      const originalSkills = [...sampleResumeData.skills];
      
      // Add new skill
      const options: UpdateOptions = {
        set: 'skills[1].name=Frameworks'
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      
      // Original skill should still be at index 0
      expect(updatedData.skills[0]).toEqual(originalSkills[0]);
    });
  });

  describe('Backup functionality', () => {
    it('should create backup file before updating', async () => {
      const options: UpdateOptions = {
        set: 'basics.name=Jane Smith'
      };
      
      await updateCommand(testResumeFile, options);
      
      const backupFile = `${testResumeFile}.bak`;
      const backupExists = await fs.access(backupFile).then(() => true).catch(() => false);
      
      expect(backupExists).toBe(true);
      
      // Backup should contain original data
      const backupData = JSON.parse(await fs.readFile(backupFile, 'utf8'));
      expect(backupData.basics.name).toBe('John Doe');
    });

    it('should not create backup when specified', async () => {
      const options: UpdateOptions = {
        set: 'basics.name=Jane Smith',
        noBackup: true
      };
      
      await updateCommand(testResumeFile, options);
      
      const backupFile = `${testResumeFile}.bak`;
      const backupExists = await fs.access(backupFile).then(() => true).catch(() => false);
      
      expect(backupExists).toBe(false);
    });
  });

  describe('Schema validation', () => {
    it('should validate updates against schema', async () => {
      const options: UpdateOptions = {
        set: 'basics.email=invalid-email'
      };
      
      await expect(updateCommand(testResumeFile, options)).rejects.toThrow('email');
    });

    it('should validate required fields', async () => {
      const options: UpdateOptions = {
        set: 'basics.name='  // Empty name should fail
      };
      
      await expect(updateCommand(testResumeFile, options)).rejects.toThrow();
    });

    it('should validate date format', async () => {
      const options: UpdateOptions = {
        set: 'work[0].startDate=invalid-date'
      };
      
      await expect(updateCommand(testResumeFile, options)).rejects.toThrow();
    });

    it('should allow valid updates to pass validation', async () => {
      const options: UpdateOptions = {
        set: [
          'basics.name=Jane Smith',
          'basics.email=jane@example.com',
          'work[0].startDate=2021-01-01'
        ]
      };
      
      // Should not throw an error for valid updates
      await expect(updateCommand(testResumeFile, options)).resolves.toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent file', async () => {
      const nonExistentFile = path.join(testDir, 'non-existent.json');
      const options: UpdateOptions = {
        set: 'basics.name=Jane Smith'
      };
      
      await expect(updateCommand(nonExistentFile, options)).rejects.toThrow('ENOENT');
    });

    it('should handle invalid JSON file', async () => {
      await fs.writeFile(testResumeFile, 'invalid json content');
      
      const options: UpdateOptions = {
        set: 'basics.name=Jane Smith'
      };
      
      await expect(updateCommand(testResumeFile, options)).rejects.toThrow('JSON');
    });

    it('should handle invalid dot notation paths', async () => {
      const options: UpdateOptions = {
        set: 'invalid.path.that.does.not.exist=value'
      };
      
      await expect(updateCommand(testResumeFile, options)).rejects.toThrow();
    });

    it('should handle array index out of bounds', async () => {
      const options: UpdateOptions = {
        set: 'work[99].name=Company'  // Index 99 doesn't exist
      };
      
      await expect(updateCommand(testResumeFile, options)).rejects.toThrow();
    });
  });

  describe('Dot notation parsing', () => {
    it('should parse simple dot notation', async () => {
      const options: UpdateOptions = {
        set: 'basics.label=Senior Software Engineer'
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.basics.label).toBe('Senior Software Engineer');
    });

    it('should parse array notation with indices', async () => {
      const options: UpdateOptions = {
        set: 'skills[0].name=Programming'
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.skills[0].name).toBe('Programming');
    });

    it('should parse complex nested paths', async () => {
      const options: UpdateOptions = {
        set: 'basics.profiles[0].url=https://linkedin.com/in/janedoe'
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.basics.profiles[0].url).toBe('https://linkedin.com/in/janedoe');
    });
  });

  describe('Special value handling', () => {
    it('should handle values with spaces', async () => {
      const options: UpdateOptions = {
        set: 'basics.label=Senior Full Stack Engineer'
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.basics.label).toBe('Senior Full Stack Engineer');
    });

    it('should handle values with special characters', async () => {
      const options: UpdateOptions = {
        set: 'basics.summary=Expert in C++, Node.js & React.js'
      };
      
      await updateCommand(testResumeFile, options);
      
      const updatedData = JSON.parse(await fs.readFile(testResumeFile, 'utf8'));
      expect(updatedData.basics.summary).toBe('Expert in C++, Node.js & React.js');
    });

    it('should reject empty string values for URL fields', async () => {
      const options: UpdateOptions = {
        set: 'basics.url='
      };
      
      await expect(updateCommand(testResumeFile, options)).rejects.toThrow('url');
    });
  });
});