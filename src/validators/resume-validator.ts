import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { resumeSchema } from '../schemas/resume-schema.js';
import { ValidationError } from '../utils/errors.js';

// Create AJV instance with formats
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Compile the schema
const validate = ajv.compile(resumeSchema);

export function validateResumeData(data: unknown): void {
  const isValid = validate(data);
  
  if (!isValid && validate.errors) {
    const errorMessages = validate.errors.map(err => {
      let path = err.instancePath || '';
      // Convert /basics/name to basics.name format
      path = path.replace(/^\//, '').replace(/\//g, '.');
      // Handle array indices like /work/0 -> work[0]
      path = path.replace(/\.(\d+)/g, '[$1]');
      return `${path}: ${err.message}`;
    });
    
    throw new ValidationError(
      `Resume validation failed:\n${errorMessages.join('\n')}`,
      validate.errors
    );
  }
}

export function validateResumeJSON(jsonString: string): unknown {
  try {
    const parsed = JSON.parse(jsonString);
    validateResumeData(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      // Parse line number from JSON syntax error
      const lineMatch = error.message.match(/line (\d+)/);
      const columnMatch = error.message.match(/column (\d+)/);
      
      const lineNumber = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
      const columnNumber = columnMatch ? parseInt(columnMatch[1], 10) : undefined;
      
      let message = 'Invalid JSON format';
      if (lineNumber) {
        message += ` at line ${lineNumber}`;
        if (columnNumber) {
          message += `, column ${columnNumber}`;
        }
      }
      
      throw new ValidationError(message, [], lineNumber, columnNumber);
    }
    throw error;
  }
}

export function validateResumeFile(filePath: string): unknown {
  try {
    const fs = require('fs');
    const jsonContent = fs.readFileSync(filePath, 'utf-8');
    return validateResumeJSON(jsonContent);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new (require('../utils/errors.js')).FileSystemError(
        `File not found: ${filePath}`, 
        false, 
        filePath
      );
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EACCES') {
      throw new (require('../utils/errors.js')).FileSystemError(
        `Permission denied: ${filePath}`, 
        false, 
        filePath
      );
    }
    throw error;
  }
}