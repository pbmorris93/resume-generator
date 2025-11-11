import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import { generatePDF } from '../../generators/pdf-generator.js';
import { ResumeGeneratorError, ValidationError, FileSystemError } from '../../utils/errors.js';
import { watchFile } from '../../utils/file-watcher.js';
import { generateOutputPath } from '../../utils/output-path.js';

interface GenerateOptions {
  output?: string;
  template?: string;
  atsMode?: boolean;
  timestamp?: boolean;
  force?: boolean;
  watch?: boolean;
}

async function generateOnce(inputPath: string, options: GenerateOptions, spinner?: any): Promise<string> {
  if (spinner) {
    spinner.start(chalk.blue('Reading resume data...'));
  }
  
  // Read and parse JSON file
  const jsonContent = await fs.readFile(inputPath, 'utf8');
  const resumeData = JSON.parse(jsonContent);
  
  if (spinner) {
    spinner.text = chalk.blue('Determining output path...');
  }
  
  // Generate output path based on options
  const outputPath = await generateOutputPath({
    inputPath,
    output: options.output,
    template: options.template,
    atsMode: options.atsMode,
    timestamp: options.timestamp,
    force: options.force
  });
  
  if (spinner) {
    spinner.text = chalk.blue('Validating resume schema...');
  }
  
  // Generate PDF
  if (spinner) {
    spinner.text = chalk.blue('Generating PDF...');
  }
  
  // Pass the determined output path to the PDF generator
  const pdfOptions = {
    ...options,
    output: outputPath
  };
  
  await generatePDF(resumeData, pdfOptions);
  
  return outputPath;
}

export async function generatePDFCommand(inputPath: string, options: GenerateOptions): Promise<void> {
  if (options.watch) {
    // Watch mode
    console.log(chalk.blue(`👁️  Watching ${inputPath} for changes... (Press Ctrl+C to stop)`));
    console.log(chalk.gray('Making initial generation...'));
    
    // Initial generation
    try {
      const spinner = ora();
      const outputPath = await generateOnce(inputPath, options, spinner);
      spinner.succeed(chalk.green(`PDF generated successfully: ${outputPath}`));
    } catch (error) {
      console.error(chalk.red(`Initial generation failed: ${error.message}`));
    }

    // Start watching
    const regenerateFunction = async () => {
      const outputPath = await generateOnce(inputPath, options);
      console.log(chalk.green(`✅ PDF updated: ${outputPath}`));
    };

    const errorHandler = (error: Error) => {
      // Don't exit in watch mode, just log the error
      console.error(chalk.red(`Watch error: ${error.message}`));
    };

    watchFile(inputPath, regenerateFunction, errorHandler);

  } else {
    // Single generation mode
    const spinner = ora();

    try {
      const outputPath = await generateOnce(inputPath, options, spinner);
      spinner.succeed(chalk.green(`PDF generated successfully: ${outputPath}`));
      
    } catch (error) {
      if (error instanceof ValidationError) {
        spinner.fail(chalk.red('Validation failed'));
        console.error(chalk.red(error.message));
        process.exit(1);
      } else if (error instanceof FileSystemError) {
        spinner.fail(chalk.red('File system error'));
        console.error(chalk.red(error.message));
        process.exit(1);
      } else if (error instanceof ResumeGeneratorError) {
        spinner.fail(chalk.red('PDF generation failed'));
        console.error(chalk.red(error.message));
        process.exit(1);
      } else if (error instanceof SyntaxError) {
        spinner.fail(chalk.red('Invalid JSON'));
        console.error(chalk.red(`JSON parsing error: ${error.message}`));
        process.exit(1);
      } else {
        spinner.fail(chalk.red('Unexpected error'));
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    }
  }
}