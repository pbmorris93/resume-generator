import { promises as fs } from 'fs';
import path from 'path';
import { validateResumeData } from '../validators/resume-validator.js';
import { PDFGenerationError, FileSystemError } from '../utils/errors.js';
import { generateHTML } from '../templates/html-generator.js';
import { ensureDeterministicPDF, DEFAULT_DETERMINISTIC_CONFIG, DeterministicConfig } from '../utils/deterministic-pdf.js';
import { browserPool } from '../utils/browser-pool.js';

export interface PDFOptions {
  output?: string;
  template?: string;
  atsMode?: boolean;
  dateFormat?: string;
  deterministic?: boolean;
  deterministicConfig?: DeterministicConfig;
}

export async function generatePDF(resumeData: unknown, options: PDFOptions = {}): Promise<string> {
  // Validate the resume data first
  validateResumeData(resumeData);

  const outputPath = options.output || 'resume.pdf';
  let page: Awaited<ReturnType<typeof browserPool.getBrowserPage>> | null = null;
  
  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Generate HTML content
    const htmlContent = await generateHTML(resumeData, options);

    // Get page from browser pool for better performance
    page = await browserPool.getBrowserPage();
    
    // Set content and wait for DOM to be ready
    await page.setContent(htmlContent, { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 // 10 second timeout
    });
    
    // Generate PDF with optimized settings
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true, // For accessibility and ATS parsing
      // Performance optimizations
      scale: 1,
      displayHeaderFooter: false,
    });

    // Make PDF deterministic if requested (default: true)
    const shouldBeDeterministic = options.deterministic !== false;
    if (shouldBeDeterministic) {
      const config = options.deterministicConfig || DEFAULT_DETERMINISTIC_CONFIG;
      await ensureDeterministicPDF(outputPath, config);
    }

    return outputPath;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EACCES') {
      throw new FileSystemError(`Cannot write to output path: ${outputPath}`);
    }
    throw new PDFGenerationError(`Failed to generate PDF: ${error.message}`);
  } finally {
    // Always release the page back to the pool
    if (page) {
      await browserPool.releasePage(page);
    }
  }
}