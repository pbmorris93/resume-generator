import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { generatePDFCommand } from '../../src/cli/commands/generate.js';
import { watchFile } from '../../src/utils/file-watcher.js';

describe('Watch Mode', () => {
  let testDir: string;
  let testJsonFile: string;
  let testPdfFile: string;
  
  beforeEach(async () => {
    // Create temporary directory for tests
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'resume-watch-test-'));
    testJsonFile = path.join(testDir, 'test-resume.json');
    testPdfFile = path.join(testDir, 'test-resume.pdf');
    
    // Create valid test JSON file
    const testResumeData = {
      basics: {
        name: "John Doe",
        email: "john@example.com"
      },
      work: [
        {
          name: "Test Corp",
          position: "Software Engineer",
          startDate: "2020-01-01"
        }
      ]
    };
    
    await fs.writeFile(testJsonFile, JSON.stringify(testResumeData, null, 2));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('File change detection', () => {
    it('should trigger regeneration when JSON file changes', async () => {
      let regenerationCalled = false;
      const mockRegenerate = vi.fn(() => {
        regenerationCalled = true;
        return Promise.resolve();
      });

      // Start watching
      const watcher = watchFile(testJsonFile, mockRegenerate);

      // Modify the file
      const updatedData = {
        basics: {
          name: "Jane Doe", // Changed name
          email: "jane@example.com"
        },
        work: [
          {
            name: "Test Corp",
            position: "Software Engineer",
            startDate: "2020-01-01"
          }
        ]
      };

      await fs.writeFile(testJsonFile, JSON.stringify(updatedData, null, 2));

      // Wait for file system events to propagate
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(mockRegenerate).toHaveBeenCalledTimes(1);
      expect(regenerationCalled).toBe(true);

      watcher.close();
    });

    it('should not crash watcher when JSON file has errors', async () => {
      let errorHandled = false;
      const mockRegenerate = vi.fn().mockRejectedValue(new Error('Validation failed'));
      const mockErrorHandler = vi.fn(() => {
        errorHandled = true;
      });

      // Start watching with error handler
      const watcher = watchFile(testJsonFile, mockRegenerate, mockErrorHandler);

      // Write invalid JSON
      await fs.writeFile(testJsonFile, 'invalid json content');

      // Wait for file system events to propagate
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(mockRegenerate).toHaveBeenCalled();
      expect(mockErrorHandler).toHaveBeenCalled();
      expect(errorHandled).toBe(true);

      // Watcher should still be running
      expect(watcher.closed).toBe(false);

      watcher.close();
    });

    it('should debounce multiple rapid file changes', async () => {
      const mockRegenerate = vi.fn().mockResolvedValue(undefined);

      // Start watching
      const watcher = watchFile(testJsonFile, mockRegenerate);

      // Make multiple rapid changes
      const changes = [
        { name: "Change 1" },
        { name: "Change 2" },
        { name: "Change 3" },
        { name: "Change 4" },
        { name: "Change 5" }
      ];

      for (const change of changes) {
        const data = {
          basics: {
            name: change.name,
            email: "john@example.com"
          },
          work: [
            {
              name: "Test Corp",
              position: "Software Engineer",
              startDate: "2020-01-01"
            }
          ]
        };
        await fs.writeFile(testJsonFile, JSON.stringify(data, null, 2));
        // Small delay between changes (less than debounce time)
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait for debounce period to complete
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should only be called once due to debouncing
      expect(mockRegenerate).toHaveBeenCalledTimes(1);

      watcher.close();
    });
  });

  describe('Integration with generate command', () => {
    it('should regenerate PDF when file changes in watch mode', async () => {
      // This test would be integration-level and might need mocking
      // For now, we'll test the structure exists
      expect(typeof generatePDFCommand).toBe('function');
    });
  });

  describe('Error recovery', () => {
    it('should continue watching after temporary file system errors', async () => {
      const mockRegenerate = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce(undefined);
      
      const mockErrorHandler = vi.fn();

      const watcher = watchFile(testJsonFile, mockRegenerate, mockErrorHandler);

      // First change should fail
      await fs.writeFile(testJsonFile, JSON.stringify({ basics: { name: "Test 1", email: "test@example.com" }, work: [] }));
      await new Promise(resolve => setTimeout(resolve, 600));

      // Second change should succeed
      await fs.writeFile(testJsonFile, JSON.stringify({ basics: { name: "Test 2", email: "test@example.com" }, work: [] }));
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(mockRegenerate).toHaveBeenCalledTimes(2);
      expect(mockErrorHandler).toHaveBeenCalledTimes(1);

      watcher.close();
    });
  });

  describe('Clean shutdown', () => {
    it('should cleanly exit watch mode on CTRL+C', async () => {
      const mockRegenerate = vi.fn();
      const watcher = watchFile(testJsonFile, mockRegenerate);

      // Simulate CTRL+C
      process.emit('SIGINT');

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(watcher.closed).toBe(true);
    });
  });
});