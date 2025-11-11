import { promises as fs } from 'fs';

/**
 * Makes a PDF deterministic by removing timestamps and other variable metadata
 */
export async function makePDFDeterministic(pdfPath: string): Promise<void> {
  const pdfBuffer = await fs.readFile(pdfPath);
  const pdfString = pdfBuffer.toString('binary');
  
  // Remove creation and modification dates from PDF metadata
  let cleanedPdf = pdfString
    // Remove CreationDate
    .replace(/\/CreationDate \(D:\d{14}[^)]*\)/g, '')
    // Remove ModDate
    .replace(/\/ModDate \(D:\d{14}[^)]*\)/g, '')
    // Remove ID arrays that might contain timestamps
    .replace(/\/ID \[[^\]]+\]/g, '')
    // Remove any other timestamp-like patterns
    .replace(/\(D:\d{14}[^)]*\)/g, '()');
  
  // Write the cleaned PDF back
  await fs.writeFile(pdfPath, Buffer.from(cleanedPdf, 'binary'));
}

/**
 * Configuration for deterministic PDF generation
 */
export interface DeterministicConfig {
  removeTimestamps: boolean;
  fixedCreationDate?: string;
  removeVariableMetadata: boolean;
}

/**
 * Default configuration for deterministic builds
 */
export const DEFAULT_DETERMINISTIC_CONFIG: DeterministicConfig = {
  removeTimestamps: true,
  removeVariableMetadata: true
};

/**
 * Ensures consistent metadata across PDF generations
 */
export async function ensureDeterministicPDF(
  pdfPath: string, 
  config: DeterministicConfig = DEFAULT_DETERMINISTIC_CONFIG
): Promise<void> {
  if (!config.removeTimestamps && !config.removeVariableMetadata) {
    return; // Nothing to do
  }
  
  const pdfBuffer = await fs.readFile(pdfPath);
  let pdfString = pdfBuffer.toString('binary');
  
  if (config.removeTimestamps) {
    // Remove all timestamp metadata
    pdfString = pdfString
      .replace(/\/CreationDate \([^)]*\)/g, '')
      .replace(/\/ModDate \([^)]*\)/g, '');
  }
  
  if (config.removeVariableMetadata) {
    // Remove other variable metadata that could affect determinism
    pdfString = pdfString
      .replace(/\/ID \[[^\]]+\]/g, '')
      .replace(/\/Producer \([^)]*\)/g, '/Producer (Resume PDF Generator)')
      .replace(/\/Creator \([^)]*\)/g, '/Creator (Resume PDF Generator)');
  }
  
  if (config.fixedCreationDate) {
    // Set a fixed creation date if specified
    const titleMatch = pdfString.match(/\/Title \([^)]*\)/);
    if (titleMatch) {
      const insertPoint = titleMatch.index! + titleMatch[0].length;
      pdfString = pdfString.slice(0, insertPoint) + 
                 `\n/CreationDate (${config.fixedCreationDate})` +
                 pdfString.slice(insertPoint);
    }
  }
  
  // Write the processed PDF back
  await fs.writeFile(pdfPath, Buffer.from(pdfString, 'binary'));
}

/**
 * Formats a date for PDF metadata in a deterministic way
 */
export function formatDeterministicDate(date?: Date): string {
  const d = date || new Date('2024-01-01T00:00:00.000Z'); // Fixed date for determinism
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  
  return `D:${year}${month}${day}${hours}${minutes}${seconds}+00'00'`;
}