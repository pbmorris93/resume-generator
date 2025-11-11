import { watch, FSWatcher } from 'fs';
import chalk from 'chalk';

export interface FileWatcherOptions {
  debounceMs?: number;
  persistent?: boolean;
}

export function watchFile(
  filePath: string, 
  onchange: () => Promise<void>, 
  onError?: (error: Error) => void,
  options: FileWatcherOptions = {}
): FSWatcher & { closed: boolean } {
  const { debounceMs = 500, persistent = true } = options;
  let debounceTimer: NodeJS.Timeout | null = null;

  const watcher = watch(filePath, { persistent }, async (eventType) => {
    if (eventType === 'change') {
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set new debounced timer
      debounceTimer = setTimeout(async () => {
        try {
          console.log(chalk.blue('📝 File changed, regenerating...'));
          await onchange();
          console.log(chalk.green('✅ Regeneration complete'));
        } catch (error) {
          console.error(chalk.red('❌ Regeneration failed:'), error.message);
          if (onError) {
            onError(error);
          }
        }
      }, debounceMs);
    }
  }) as FSWatcher & { closed: boolean };

  // Track closed state
  watcher.closed = false;

  // Handle errors
  watcher.on('error', (error) => {
    console.error(chalk.red('File watcher error:'), error.message);
    if (onError) {
      onError(error);
    }
  });

  // Override close method to track state
  const originalClose = watcher.close.bind(watcher);
  watcher.close = () => {
    watcher.closed = true;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    return originalClose();
  };

  // Handle graceful shutdown (only in non-test environment)
  const cleanup = () => {
    console.log(chalk.yellow('\n🛑 Shutting down file watcher...'));
    watcher.close();
    if (process.env.NODE_ENV !== 'test') {
      process.exit(0);
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return watcher;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}