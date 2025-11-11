export interface ErrorSuggestion {
  action: string;
  command?: string;
  explanation?: string;
}

export class ResumeGeneratorError extends Error {
  constructor(
    message: string,
    public code: string,
    public isCatastrophic: boolean = false,
    public suggestions: ErrorSuggestion[] = []
  ) {
    super(message);
    this.name = 'ResumeGeneratorError';
  }

  getFormattedMessage(includeDebugInfo = false): string {
    let output = `❌ ${this.message}`;
    
    if (this.suggestions.length > 0) {
      output += '\n\n💡 Suggestions:';
      this.suggestions.forEach((suggestion, index) => {
        output += `\n  ${index + 1}. ${suggestion.action}`;
        if (suggestion.command) {
          output += `\n     Command: ${suggestion.command}`;
        }
        if (suggestion.explanation) {
          output += `\n     ${suggestion.explanation}`;
        }
      });
    }

    if (includeDebugInfo) {
      output += `\n\n🔍 Debug Info:`;
      output += `\n  Error Code: ${this.code}`;
      output += `\n  Catastrophic: ${this.isCatastrophic}`;
      if (this.stack) {
        output += `\n  Stack Trace:\n${this.stack}`;
      }
    }

    return output;
  }
}

export class ValidationError extends ResumeGeneratorError {
  constructor(
    message: string, 
    public validationErrors: any[] = [],
    public lineNumber?: number,
    public columnNumber?: number
  ) {
    // Update message to include line/column info if available
    let fullMessage = message;
    if (lineNumber !== undefined) {
      fullMessage += ` at line ${lineNumber}`;
      if (columnNumber !== undefined) {
        fullMessage += `, column ${columnNumber}`;
      }
    }
    
    const suggestions = ValidationError.generateSuggestions(validationErrors);
    super(fullMessage, 'VALIDATION_ERROR', false, suggestions);
  }

  private static generateSuggestions(errors: any[]): ErrorSuggestion[] {
    const suggestions: ErrorSuggestion[] = [];
    
    for (const error of errors) {
      const path = error.instancePath || '';
      const keyword = error.keyword;
      
      switch (keyword) {
        case 'required':
          suggestions.push({
            action: `Add the required field: ${error.params?.missingProperty}`,
            explanation: `The field '${error.params?.missingProperty}' is required in the JSON schema.`
          });
          break;
          
        case 'format':
          if (error.params?.format === 'email') {
            suggestions.push({
              action: 'Fix email format',
              explanation: 'Use a valid email format like "user@example.com"'
            });
          } else if (error.params?.format === 'date') {
            suggestions.push({
              action: 'Fix date format',
              explanation: 'Use ISO date format like "2024-01-15" or "2024-01-15T10:30:00Z"'
            });
          } else if (error.params?.format === 'uri') {
            suggestions.push({
              action: 'Fix URL format',
              explanation: 'Use a complete URL like "https://example.com"'
            });
          }
          break;
          
        case 'type':
          suggestions.push({
            action: `Change ${path || 'value'} to ${error.params?.type} type`,
            explanation: `Expected ${error.params?.type}, but got ${typeof error.data}`
          });
          break;
          
        case 'additionalProperties':
          suggestions.push({
            action: `Remove unknown field: ${error.params?.additionalProperty}`,
            explanation: 'This field is not part of the resume schema'
          });
          break;
      }
    }

    // Add generic suggestions if no specific ones were generated
    if (suggestions.length === 0) {
      suggestions.push(
        {
          action: 'Check the JSON schema documentation',
          command: 'resume-pdf validate --help',
          explanation: 'Review the expected JSON structure for resumes'
        },
        {
          action: 'Use an example JSON as a starting point',
          command: 'resume-pdf init --example',
          explanation: 'Generate a valid example resume JSON file'
        }
      );
    }

    return suggestions;
  }
}

export class FileSystemError extends ResumeGeneratorError {
  constructor(message: string, isCatastrophic = false, public filePath?: string) {
    const suggestions = FileSystemError.generateSuggestions(message, filePath);
    super(message, 'FILESYSTEM_ERROR', isCatastrophic, suggestions);
  }

  private static generateSuggestions(message: string, filePath?: string): ErrorSuggestion[] {
    const suggestions: ErrorSuggestion[] = [];
    
    if (message.includes('ENOENT') || message.includes('not found')) {
      suggestions.push({
        action: 'Check if the file path is correct',
        explanation: filePath ? `Verify that "${filePath}" exists and is accessible` : 'Verify the file path exists'
      });
      
      if (filePath?.endsWith('.json')) {
        suggestions.push({
          action: 'Create the file if it doesn\'t exist',
          command: 'resume-pdf init --example > resume.json',
          explanation: 'Generate a sample resume JSON file'
        });
      }
    }
    
    if (message.includes('EACCES') || message.includes('permission') || message.includes('Permission denied') || message.includes('Access denied')) {
      suggestions.push({
        action: 'Check file permissions',
        command: filePath ? `ls -la "${filePath}"` : 'ls -la',
        explanation: filePath ? `Ensure you have read/write permissions for "${filePath}"` : 'Ensure you have read/write permissions for the file'
      });
    }
    
    if (message.includes('ENOSPC') || message.includes('space')) {
      suggestions.push({
        action: 'Free up disk space',
        command: 'df -h',
        explanation: 'Check available disk space and clean up if necessary'
      });
    }

    return suggestions;
  }
}

export class PDFGenerationError extends ResumeGeneratorError {
  constructor(message: string, public context?: string) {
    const suggestions = PDFGenerationError.generateSuggestions(message, context);
    super(message, 'PDF_GENERATION_ERROR', false, suggestions);
  }

  private static generateSuggestions(message: string, context?: string): ErrorSuggestion[] {
    const suggestions: ErrorSuggestion[] = [];
    
    if (message.includes('browser') || message.includes('chromium')) {
      suggestions.push({
        action: 'Install Playwright browsers',
        command: 'npx playwright install chromium',
        explanation: 'PDF generation requires Playwright browser binaries'
      });
    }
    
    if (message.includes('timeout')) {
      suggestions.push({
        action: 'Try with a simpler template',
        command: 'resume-pdf generate resume.json --ats-mode',
        explanation: 'ATS mode uses minimal styling and loads faster'
      });
    }
    
    if (message.includes('memory') || message.includes('heap')) {
      suggestions.push({
        action: 'Increase Node.js memory limit',
        command: 'node --max-old-space-size=4096 resume-pdf generate resume.json',
        explanation: 'Allocate more memory for PDF generation'
      });
    }

    // Generic suggestions
    suggestions.push({
      action: 'Validate your JSON first',
      command: 'resume-pdf validate resume.json',
      explanation: 'Ensure your resume data is valid before PDF generation'
    });

    return suggestions;
  }
}

export class TemplateError extends ResumeGeneratorError {
  constructor(message: string, public templateName?: string) {
    const suggestions: ErrorSuggestion[] = [
      {
        action: 'Try a different template',
        command: 'resume-pdf generate resume.json --template professional',
        explanation: 'Some templates may not support all resume features'
      },
      {
        action: 'Use ATS mode for maximum compatibility',
        command: 'resume-pdf generate resume.json --ats-mode',
        explanation: 'ATS mode has the fewest requirements and highest compatibility'
      }
    ];
    
    super(message, 'TEMPLATE_ERROR', false, suggestions);
  }
}

export class NetworkError extends ResumeGeneratorError {
  constructor(message: string) {
    const suggestions: ErrorSuggestion[] = [
      {
        action: 'Check your internet connection',
        explanation: 'Some operations may require network access for downloading dependencies'
      },
      {
        action: 'Use offline mode',
        explanation: 'The resume generator is designed to work completely offline'
      }
    ];
    
    super(message, 'NETWORK_ERROR', false, suggestions);
  }
}