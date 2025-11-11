import { promises as fs } from 'fs';
import path from 'path';
import { generatePDF, PDFOptions } from './pdf-generator.js';
import { generateHTML } from '../templates/html-generator.js';
import { generatePlainText } from './txt-generator.js';
import { validateResumeData } from '../validators/resume-validator.js';

export type ExportFormat = 'pdf' | 'html' | 'txt';

export interface FormatOptions {
  formats: ExportFormat[];
  outputDir: string;
  baseName?: string;
  timestamp?: boolean;
  template?: 'professional' | 'ats' | 'ultra-ats';
  atsMode?: boolean;
}

export interface FormatResult {
  format: ExportFormat;
  filePath: string;
  success: boolean;
  error?: string;
}

/**
 * Generates multiple output formats from a JSON resume file
 */
export async function generateMultipleFormats(
  resumeFilePath: string,
  options: FormatOptions
): Promise<FormatResult[]> {
  // Read and validate the resume data
  const resumeContent = await fs.readFile(resumeFilePath, 'utf8');
  let resumeData: any;
  
  try {
    resumeData = JSON.parse(resumeContent);
  } catch (error) {
    throw new Error(`Invalid JSON in file ${resumeFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Validate the resume data
  try {
    validateResumeData(resumeData);
  } catch (error) {
    throw new Error(`Resume validation failed: ${error instanceof Error ? error.message : 'Unknown validation error'}`);
  }
  
  // Ensure output directory exists
  await fs.mkdir(options.outputDir, { recursive: true });
  
  // Generate base filename
  const baseFileName = options.baseName || path.parse(resumeFilePath).name;
  const timestampSuffix = options.timestamp ? `-${new Date().toISOString().split('T')[0]}` : '';
  
  const results: FormatResult[] = [];
  
  // Process each requested format
  for (const format of options.formats) {
    try {
      let filePath: string;
      
      switch (format) {
        case 'pdf':
          filePath = await generatePDFFormat(resumeData, options, baseFileName, timestampSuffix);
          break;
        case 'html':
          filePath = await generateHTMLFormat(resumeData, options, baseFileName, timestampSuffix);
          break;
        case 'txt':
          filePath = await generateTXTFormat(resumeData, options, baseFileName, timestampSuffix);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      results.push({
        format,
        filePath,
        success: true
      });
    } catch (error) {
      results.push({
        format,
        filePath: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}

/**
 * Generates PDF format
 */
async function generatePDFFormat(
  resumeData: any,
  options: FormatOptions,
  baseFileName: string,
  timestampSuffix: string
): Promise<string> {
  const fileName = `${baseFileName}${timestampSuffix}.pdf`;
  const outputPath = path.join(options.outputDir, fileName);
  
  const pdfOptions: PDFOptions = {
    output: outputPath,
    template: options.template,
    atsMode: options.atsMode
  };
  
  await generatePDF(resumeData, pdfOptions);
  return outputPath;
}

/**
 * Generates HTML format
 */
async function generateHTMLFormat(
  resumeData: any,
  options: FormatOptions,
  baseFileName: string,
  timestampSuffix: string
): Promise<string> {
  const fileName = `${baseFileName}${timestampSuffix}.html`;
  const outputPath = path.join(options.outputDir, fileName);
  
  const pdfOptions: PDFOptions = {
    template: options.template,
    atsMode: options.atsMode
  };
  
  // Generate HTML - this already returns a complete HTML document
  const htmlContent = await generateHTML(resumeData, pdfOptions);
  
  await fs.writeFile(outputPath, htmlContent, 'utf8');
  return outputPath;
}

/**
 * Generates TXT format
 */
async function generateTXTFormat(
  resumeData: any,
  options: FormatOptions,
  baseFileName: string,
  timestampSuffix: string
): Promise<string> {
  const fileName = `${baseFileName}${timestampSuffix}.txt`;
  const outputPath = path.join(options.outputDir, fileName);
  
  const txtContent = await generatePlainText(resumeData);
  
  await fs.writeFile(outputPath, txtContent, 'utf8');
  return outputPath;
}

