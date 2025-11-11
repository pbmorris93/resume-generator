import { promises as fs } from 'fs';
import path from 'path';
import { FileSystemError } from './errors.js';

export interface OutputPathOptions {
  inputPath: string;
  output?: string;
  template?: string;
  atsMode?: boolean;
  timestamp?: boolean;
  force?: boolean;
}

export async function generateOutputPath(options: OutputPathOptions): Promise<string> {
  const { inputPath, output, template, atsMode, timestamp, force = false } = options;
  
  if (!inputPath || inputPath.trim() === '') {
    throw new Error('Input path cannot be empty');
  }

  let outputPath: string;

  if (output) {
    // Custom output path specified
    outputPath = path.resolve(output);
    validateOutputPath(outputPath);
    
    // Create directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Check overwrite protection
    const canOverwrite = await checkOverwriteProtection(outputPath, force);
    if (!canOverwrite) {
      throw new FileSystemError('File already exists. Use --force to overwrite');
    }
  } else {
    // Generate automatic name
    outputPath = generateAutomaticName(inputPath, template, atsMode);
    
    if (timestamp) {
      outputPath = createTimestampedName(outputPath);
    }
    
    outputPath = path.resolve(outputPath);
  }

  return outputPath;
}

export function generateAutomaticName(
  inputPath: string, 
  template?: string, 
  atsMode?: boolean
): string {
  // Extract base name from input path
  const baseName = path.basename(inputPath, path.extname(inputPath));
  
  // Determine suffix based on options
  let suffix = '';
  if (atsMode) {
    suffix = '-ats';
  } else if (template && template !== 'ats-optimized') {
    suffix = `-${template}`;
  }
  
  return `${baseName}${suffix}.pdf`;
}

export function createTimestampedName(filename: string): string {
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  return `${baseName}-${timestamp}${ext}`;
}

export async function checkOverwriteProtection(
  filePath: string, 
  force: boolean
): Promise<boolean> {
  try {
    await fs.access(filePath);
    // File exists
    return force;
  } catch {
    // File doesn't exist, safe to write
    return true;
  }
}

export function validateOutputPath(outputPath: string): void {
  if (!outputPath || outputPath.trim() === '') {
    throw new Error('Output path cannot be empty');
  }
  
  // Check for null bytes and other dangerous characters
  if (outputPath.includes('\0')) {
    throw new Error('Output path contains invalid characters');
  }
  
  // Validate extension (case-sensitive)
  if (!outputPath.endsWith('.pdf')) {
    throw new Error('Output file must have .pdf extension');
  }
  
  // Basic path validation
  const normalizedPath = path.normalize(outputPath);
  if (normalizedPath === '/' || normalizedPath === '.') {
    throw new Error('Invalid output path');
  }
}