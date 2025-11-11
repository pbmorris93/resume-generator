import { Command } from 'commander';
import { applyUpdates, UpdateOptions, WorkExperience } from '../../utils/json-update.js';

export function createUpdateCommand(): Command {
  const updateCmd = new Command('update');
  
  updateCmd
    .description('Update fields in a resume JSON file')
    .argument('<file>', 'Path to the resume JSON file')
    .option('--set <field=value...>', 'Set field values using dot notation (can be used multiple times)', [])
    .option('--no-backup', 'Skip creating backup file')
    .action(async (file: string, options: any) => {
      try {
        const updateOptions: UpdateOptions = {
          set: options.set.length > 0 ? options.set : undefined,
          noBackup: !options.backup
        };
        
        await applyUpdates(file, updateOptions);
        console.log(`Successfully updated ${file}`);
        
        if (options.backup) {
          console.log(`Backup created: ${file}.bak`);
        }
      } catch (error) {
        console.error('Error updating resume:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
      }
    });

  return updateCmd;
}

/**
 * Main update command function for direct testing
 */
export async function updateCommand(filePath: string, options: UpdateOptions): Promise<void> {
  try {
    await applyUpdates(filePath, options);
  } catch (error) {
    // Ensure we always throw a proper Error object
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Update failed: ${error || 'Unknown error'}`);
    }
  }
}