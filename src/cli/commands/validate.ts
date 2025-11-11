import chalk from 'chalk';
import ora from 'ora';
import { validateResumeFile } from '../../validators/resume-validator.js';
import { ResumeGeneratorError } from '../../utils/errors.js';
import { ErrorHandler, formatErrorForCLI, getExitCode } from '../../utils/error-handler.js';

interface ValidateOptions {
  debug?: boolean;
  verbose?: boolean;
}

export async function validateCommand(inputPath: string, options: ValidateOptions = {}): Promise<void> {
  const spinner = ora();
  const errorHandler = new ErrorHandler({
    debug: options.debug,
    verbose: options.verbose,
    showSuggestions: true,
    exitOnError: false
  });

  try {
    const startTime = Date.now();
    
    spinner.start(chalk.blue('Reading and validating resume file...'));
    
    // Use the enhanced file validator
    const resumeData = validateResumeFile(inputPath);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    spinner.succeed(chalk.green(`Resume validation passed! ✓ (${duration}ms)`));
    
    if (options.verbose) {
      console.log(chalk.blue('\n📊 Validation Summary:'));
      console.log(chalk.blue(`  • File: ${inputPath}`));
      console.log(chalk.blue(`  • Duration: ${duration}ms`));
      console.log(chalk.blue(`  • Schema: Valid JSON Resume format`));
      
      // Show basic resume info if available
      if (resumeData && typeof resumeData === 'object') {
        const data = resumeData as any;
        if (data.basics?.name) {
          console.log(chalk.blue(`  • Name: ${data.basics.name}`));
        }
        if (data.work?.length) {
          console.log(chalk.blue(`  • Work Entries: ${data.work.length}`));
        }
        if (data.skills?.length) {
          console.log(chalk.blue(`  • Skill Categories: ${data.skills.length}`));
        }
      }
    }
    
    // Success feedback
    console.log(chalk.green('\n✅ Your resume is ready for PDF generation!'));
    console.log(chalk.blue('💡 Next step: resume-pdf generate ' + inputPath));
    
  } catch (error) {
    spinner.fail(chalk.red('Validation failed'));
    
    if (error instanceof ResumeGeneratorError) {
      console.error('\n' + formatErrorForCLI(error, options.debug));
      
      if (options.verbose) {
        console.error(chalk.gray(`\nValidation took ${Date.now() - (Date as any).now()}ms before failing`));
      }
      
      process.exit(getExitCode(error));
    } else {
      // Handle unexpected errors with the error handler
      errorHandler.handle(error);
    }
  }
}