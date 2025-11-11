import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { generatePDF } from '../../src/generators/pdf-generator.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';

const execFile = promisify(require('child_process').execFile);

describe('Complete Offline Integration Tests', () => {
  const validResumeData = {
    basics: {
      name: 'Offline Test User',
      email: 'offline@example.com',
      phone: '(555) 987-6543',
      location: { city: 'Offline City', region: 'OC' },
      summary: 'Testing offline capabilities'
    },
    work: [{
      name: 'Offline Company',
      position: 'Offline Developer', 
      startDate: '2022-01-01',
      endDate: '2024-01-01',
      highlights: ['Built offline-first applications', 'Implemented local-only features']
    }],
    skills: [{
      name: 'Offline Technologies',
      keywords: ['Service Workers', 'IndexedDB', 'LocalStorage', 'PWA']
    }]
  };

  let originalNetworkInterface: any;

  beforeAll(() => {
    // Ensure test output directory exists
    return fs.mkdir(join(process.cwd(), 'test-outputs'), { recursive: true });
  });

  it('should work completely offline (airplane mode simulation)', async () => {

    // Override global fetch
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network blocked'));

    try {
      const outputPath = join(process.cwd(), 'test-outputs', 'airplane-mode.pdf');
      
      const result = await generatePDF(validResumeData, { 
        output: outputPath,
        template: 'professional',
        deterministic: true
      });

      expect(result).toBe(outputPath);
      
      // Verify file was created
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(1000);
      
      // Verify PDF content (check metadata as text may be compressed)
      const pdfBuffer = await fs.readFile(outputPath);
      const pdfString = pdfBuffer.toString('binary');
      expect(pdfString).toContain('/Title (Offline Test User - Resume)');
      
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should generate identical PDFs in different network conditions', async () => {
    const outputPath1 = join(process.cwd(), 'test-outputs', 'online-mode.pdf');
    const outputPath2 = join(process.cwd(), 'test-outputs', 'offline-mode.pdf');

    // Generate first PDF in "online" mode (normal conditions)
    await generatePDF(validResumeData, { 
      output: outputPath1,
      deterministic: true
    });

    // Generate second PDF with network completely blocked
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network blocked'));

    try {
      await generatePDF(validResumeData, { 
        output: outputPath2,
        deterministic: true
      });

      // Read both PDFs
      const pdf1 = await fs.readFile(outputPath1);
      const pdf2 = await fs.readFile(outputPath2);

      // They should be byte-identical
      expect(pdf1.equals(pdf2)).toBe(true);
      
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should work without internet connectivity (DNS failure simulation)', async () => {
    // Mock DNS resolution to fail
    const originalResolve = require('dns').resolve;
    require('dns').resolve = vi.fn().mockImplementation((hostname, callback) => {
      callback(new Error('DNS resolution failed - no internet'), null);
    });

    try {
      const outputPath = join(process.cwd(), 'test-outputs', 'no-dns.pdf');
      
      await generatePDF(validResumeData, { 
        output: outputPath,
        template: 'ats-optimized'
      });

      // Verify successful generation
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(500);
      
    } finally {
      require('dns').resolve = originalResolve;
    }
  });

  it('should work with all external ports blocked', async () => {
    // Mock net module to reject all connections
    const originalConnect = require('net').connect;
    require('net').connect = vi.fn().mockImplementation(() => {
      const mockSocket = {
        on: vi.fn(),
        end: vi.fn(),
        write: vi.fn()
      };
      setTimeout(() => {
        mockSocket.on.mock.calls
          .filter(call => call[0] === 'error')
          .forEach(call => call[1](new Error('Connection refused')));
      }, 10);
      return mockSocket;
    });

    try {
      const outputPath = join(process.cwd(), 'test-outputs', 'ports-blocked.pdf');
      
      await generatePDF(validResumeData, { 
        output: outputPath,
        template: 'professional'
      });

      // Verify file creation
      const exists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
    } finally {
      require('net').connect = originalConnect;
    }
  });

  it('should handle firewall-like network blocking gracefully', async () => {
    // Simulate aggressive firewall that blocks all HTTP(S) traffic
    const networkError = new Error('Network unreachable');
    networkError.code = 'ENETUNREACH';

    const originalRequest = require('https').request;
    require('https').request = vi.fn().mockImplementation(() => {
      throw networkError;
    });

    const originalHttpRequest = require('http').request;
    require('http').request = vi.fn().mockImplementation(() => {
      throw networkError;
    });

    try {
      const outputPath = join(process.cwd(), 'test-outputs', 'firewall-blocked.pdf');
      
      // Should complete successfully despite network blocking
      await generatePDF(validResumeData, { 
        output: outputPath
      });

      const pdfBuffer = await fs.readFile(outputPath);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      
    } finally {
      require('https').request = originalRequest;
      require('http').request = originalHttpRequest;
    }
  });

  it('should work on a machine with no network interfaces', async () => {
    // Mock os.networkInterfaces to return empty
    const originalNetworkInterfaces = require('os').networkInterfaces;
    require('os').networkInterfaces = vi.fn().mockReturnValue({});

    try {
      const outputPath = join(process.cwd(), 'test-outputs', 'no-network-interface.pdf');
      
      await generatePDF(validResumeData, { 
        output: outputPath,
        deterministic: true
      });

      // Verify successful operation
      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(500);
      
    } finally {
      require('os').networkInterfaces = originalNetworkInterfaces;
    }
  });

  it('should not make any outbound network connections during generation', async () => {
    const networkCalls: string[] = [];
    
    // Comprehensive network monitoring
    const originalHttpsRequest = require('https').request;
    const originalHttpRequest = require('http').request;
    const originalFetch = global.fetch;

    require('https').request = vi.fn().mockImplementation((options: any) => {
      networkCalls.push(`HTTPS: ${JSON.stringify(options)}`);
      throw new Error('Network call intercepted');
    });

    require('http').request = vi.fn().mockImplementation((options: any) => {
      networkCalls.push(`HTTP: ${JSON.stringify(options)}`);
      throw new Error('Network call intercepted');
    });

    global.fetch = vi.fn().mockImplementation((url: string) => {
      networkCalls.push(`FETCH: ${url}`);
      return Promise.reject(new Error('Network call intercepted'));
    });

    try {
      const outputPath = join(process.cwd(), 'test-outputs', 'network-monitoring.pdf');
      
      await generatePDF(validResumeData, { 
        output: outputPath,
        template: 'professional'
      });

      // Verify no network calls were made
      expect(networkCalls).toHaveLength(0);
      
      // Verify PDF was still generated successfully
      const exists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
    } finally {
      require('https').request = originalHttpsRequest;
      require('http').request = originalHttpRequest;
      global.fetch = originalFetch;
    }
  });

  it('should work when run in a completely isolated environment', async () => {
    // Simulate container or sandbox environment with minimal network access
    const envOverrides = {
      NO_PROXY: '*',
      HTTP_PROXY: '',
      HTTPS_PROXY: '',
      http_proxy: '',
      https_proxy: ''
    };

    const originalEnv = { ...process.env };
    Object.assign(process.env, envOverrides);

    try {
      const outputPath = join(process.cwd(), 'test-outputs', 'isolated-env.pdf');
      
      await generatePDF(validResumeData, { 
        output: outputPath,
        template: 'ats-optimized'
      });

      // Verify generation in isolated environment
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(500);
      
    } finally {
      // Restore original environment
      process.env = originalEnv;
    }
  });
});