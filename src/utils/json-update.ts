import { promises as fs } from 'fs';
import { validateResumeData } from '../validators/resume-validator.js';

export interface UpdateOptions {
  set?: string | string[];
  addWork?: WorkExperience;
  noBackup?: boolean;
}

export interface WorkExperience {
  name: string;
  position: string;
  url?: string;
  startDate: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
  location?: string;
}

/**
 * Creates a backup of the original file before making changes
 */
export async function createBackup(filePath: string): Promise<string> {
  const backupPath = `${filePath}.bak`;
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

/**
 * Parses dot notation path and returns the path segments
 * Handles array indices like work[0].position
 */
function parseDotNotation(path: string): (string | number)[] {
  const segments: (string | number)[] = [];
  const parts = path.split('.');
  
  for (const part of parts) {
    const arrayMatch = part.match(/^([^[]+)\[(\d+)\]$/);
    if (arrayMatch) {
      segments.push(arrayMatch[1]);
      segments.push(parseInt(arrayMatch[2], 10));
    } else {
      segments.push(part);
    }
  }
  
  return segments;
}

/**
 * Gets a nested value from an object using dot notation
 */
function getNestedValue(obj: any, path: (string | number)[]): any {
  let current = obj;
  for (const segment of path) {
    if (current == null) return undefined;
    current = current[segment];
  }
  return current;
}

/**
 * Sets a nested value in an object using dot notation
 */
function setNestedValue(obj: any, path: (string | number)[], value: any): void {
  let current = obj;
  
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    const nextSegment = path[i + 1];
    
    if (current[segment] == null) {
      // Only allow creation for known root-level properties
      if (i === 0 && !['basics', 'work', 'education', 'skills', 'projects', 'awards', 'certifications', 'publications', 'languages', 'interests', 'references'].includes(segment as string)) {
        throw new Error(`Invalid root property: ${segment}. Path: ${path.join('.')}`);
      }
      
      // Create new object or array based on next segment
      current[segment] = typeof nextSegment === 'number' ? [] : {};
    }
    
    current = current[segment];
  }
  
  const finalSegment = path[path.length - 1];
  
  // Handle array index out of bounds for existing arrays
  if (typeof finalSegment === 'number' && Array.isArray(current)) {
    // Allow creating new array elements up to the specified index
    while (current.length <= finalSegment) {
      current.push({});
    }
  }
  
  current[finalSegment] = value;
}

/**
 * Updates a single field in the resume data using dot notation
 */
export function updateField(data: any, fieldPath: string, value: string): any {
  const clonedData = JSON.parse(JSON.stringify(data));
  const pathSegments = parseDotNotation(fieldPath);
  
  setNestedValue(clonedData, pathSegments, value);
  return clonedData;
}

/**
 * Adds a new work experience entry to the beginning of the work array
 */
export function addWorkExperience(data: any, workEntry: WorkExperience): any {
  const clonedData = JSON.parse(JSON.stringify(data));
  
  if (!clonedData.work) {
    clonedData.work = [];
  }
  
  // Add to the beginning of the array (most recent first)
  clonedData.work.unshift(workEntry);
  
  return clonedData;
}

/**
 * Parses a set operation string like "basics.name=John Doe"
 */
function parseSetOperation(setString: string): { path: string; value: string } {
  const equalsIndex = setString.indexOf('=');
  if (equalsIndex === -1) {
    throw new Error(`Invalid set operation: ${setString}. Expected format: "path=value"`);
  }
  
  const path = setString.substring(0, equalsIndex);
  const value = setString.substring(equalsIndex + 1);
  
  return { path, value };
}

/**
 * Applies multiple field updates to resume data
 */
export async function applyUpdates(filePath: string, options: UpdateOptions): Promise<void> {
  // Read the current file
  const fileContent = await fs.readFile(filePath, 'utf8');
  let data: any;
  
  try {
    data = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Invalid JSON in file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Create backup if not disabled
  if (!options.noBackup) {
    await createBackup(filePath);
  }
  
  let updatedData = data;
  
  // Handle set operations
  if (options.set) {
    const setOperations = Array.isArray(options.set) ? options.set : [options.set];
    
    for (const setOperation of setOperations) {
      const { path, value } = parseSetOperation(setOperation);
      updatedData = updateField(updatedData, path, value);
    }
  }
  
  // Handle add work experience
  if (options.addWork) {
    updatedData = addWorkExperience(updatedData, options.addWork);
  }
  
  // Validate the updated data against schema
  try {
    validateResumeData(updatedData);
  } catch (error) {
    throw new Error(`Schema validation failed after update: ${error instanceof Error ? error.message : 'Unknown validation error'}`);
  }
  
  // Write the updated data back to file
  const updatedJson = JSON.stringify(updatedData, null, 2);
  await fs.writeFile(filePath, updatedJson, 'utf8');
}