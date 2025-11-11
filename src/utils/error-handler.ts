import chalk from 'chalk';
import { ResumeGeneratorError } from './errors.js';

export interface ErrorHandlerOptions {
  debug?: boolean;
  verbose?: boolean;
  showSuggestions?: boolean;
  exitOnError?: boolean;
}

export class ErrorHandler {
  constructor(private options: ErrorHandlerOptions = {}) {
    this.options = {
      debug: false,
      verbose: false,
      showSuggestions: true,
      exitOnError: true,
      ...options
    };
  }

  handle(error: Error): void {
    if (error instanceof ResumeGeneratorError) {
      this.handleResumeGeneratorError(error);
    } else {
      this.handleGenericError(error);
    }

    if (this.options.exitOnError) {
      process.exit(1);
    }
  }

  private handleResumeGeneratorError(error: ResumeGeneratorError): void {
    console.error(chalk.red(error.getFormattedMessage(this.options.debug)));

    if (this.options.verbose && error.code) {
      console.error(chalk.gray(`\nError Code: ${error.code}`));
    }

    if (error.isCatastrophic) {
      console.error(chalk.red.bold('\n⚠️  This is a catastrophic error that requires immediate attention.'));
    }

    this.logContextualHelp(error);
  }

  private handleGenericError(error: Error): void {
    console.error(chalk.red(`❌ Unexpected error: ${error.message}`));
    
    if (this.options.debug && error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }

    // Generic suggestions for unknown errors
    console.error(chalk.blue('\n💡 General suggestions:'));
    console.error(chalk.blue('  1. Run with --debug flag for more information'));
    console.error(chalk.blue('     Command: resume-pdf --debug <your-command>'));
    console.error(chalk.blue('  2. Check the GitHub issues for similar problems'));
    console.error(chalk.blue('     URL: https://github.com/your-repo/resume-pdf-generator/issues'));
  }

  private logContextualHelp(error: ResumeGeneratorError): void {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        this.logValidationHelp();
        break;
      case 'PDF_GENERATION_ERROR':
        this.logPDFGenerationHelp();
        break;
      case 'FILESYSTEM_ERROR':
        this.logFileSystemHelp();
        break;
      case 'TEMPLATE_ERROR':
        this.logTemplateHelp();
        break;
    }
  }

  private logValidationHelp(): void {
    if (!this.options.verbose) return;

    console.error(chalk.blue('\n📚 JSON Validation Help:'));
    console.error(chalk.blue('  • Required fields: basics.name, basics.email, work'));
    console.error(chalk.blue('  • Date format: YYYY-MM-DD (e.g., "2024-01-15")'));
    console.error(chalk.blue('  • Email format: user@domain.com'));
    console.error(chalk.blue('  • URL format: https://example.com'));
    console.error(chalk.blue('  • Arrays should contain objects with proper structure'));
  }

  private logPDFGenerationHelp(): void {
    if (!this.options.verbose) return;

    console.error(chalk.blue('\n🏗️  PDF Generation Help:'));
    console.error(chalk.blue('  • Ensure Playwright browsers are installed'));
    console.error(chalk.blue('  • Check available disk space for output file'));
    console.error(chalk.blue('  • Try ATS mode for simpler PDF generation'));
    console.error(chalk.blue('  • Reduce resume size if memory issues occur'));
  }

  private logFileSystemHelp(): void {
    if (!this.options.verbose) return;

    console.error(chalk.blue('\n📁 File System Help:'));
    console.error(chalk.blue('  • Check file/directory permissions'));
    console.error(chalk.blue('  • Ensure paths use forward slashes (/) on Unix'));
    console.error(chalk.blue('  • Verify sufficient disk space'));
    console.error(chalk.blue('  • Use absolute paths if relative paths fail'));
  }

  private logTemplateHelp(): void {
    if (!this.options.verbose) return;

    console.error(chalk.blue('\n🎨 Template Help:'));
    console.error(chalk.blue('  • Available templates: professional, ats-optimized'));
    console.error(chalk.blue('  • ATS mode provides maximum compatibility'));
    console.error(chalk.blue('  • Check if all required data fields are present'));
    console.error(chalk.blue('  • Some templates may not support all resume sections'));
  }

  static createFromOptions(options: ErrorHandlerOptions): ErrorHandler {
    return new ErrorHandler(options);
  }

  static handleUncaughtErrors(options: ErrorHandlerOptions = {}): void {
    const handler = new ErrorHandler(options);

    process.on('uncaughtException', (error: Error) => {
      console.error(chalk.red.bold('\n💥 Uncaught Exception:'));
      handler.handle(error);
    });

    process.on('unhandledRejection', (reason: any) => {
      console.error(chalk.red.bold('\n💥 Unhandled Promise Rejection:'));
      if (reason instanceof Error) {
        handler.handle(reason);
      } else {
        console.error(chalk.red(`❌ ${String(reason)}`));
        if (options.exitOnError !== false) {
          process.exit(1);
        }
      }
    });
  }
}

export function formatErrorForCLI(error: Error, debugMode = false): string {
  if (error instanceof ResumeGeneratorError) {
    return error.getFormattedMessage(debugMode);
  }

  let output = `❌ ${error.message}`;
  
  if (debugMode && error.stack) {
    output += `\n\n🔍 Debug Info:\n${error.stack}`;
  }

  return output;
}

export function getExitCode(error: Error): number {
  if (error instanceof ResumeGeneratorError) {
    return error.isCatastrophic ? 2 : 1;
  }
  return 1;
}