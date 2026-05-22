import chokidar, { type FSWatcher } from 'chokidar';
import path from 'node:path';
import { getCliTools } from '@ccmodels/shared';

let watcher: FSWatcher | null = null;

export function initConfigWatcher(onChange: () => void): void {
  // Watch parent directories of all known config paths
  const watchDirs = new Set<string>();
  for (const tool of getCliTools()) {
    for (const p of tool.configPaths) {
      watchDirs.add(path.dirname(p));
    }
  }

  // Exclude the user's home directory root — changes there (e.g. setx env var writes)
  // trigger infinite re-apply loops since gemini-cli config paths include ~/.env.
  const homeDir = require('node:os').homedir();
  const watchPatterns = [...watchDirs].filter((d) => d && !d.includes('undefined') && d !== homeDir);

  watcher = chokidar.watch(watchPatterns, {
    ignoreInitial: true,
    depth: 0,
    // Only watch for config files
    ignored: /(^|[\/\\])\..(?!claude|codex|gemini|opencode|openclaw|hermes)/,
  });

  watcher.on('add', onChange);
  watcher.on('change', onChange);

  console.log('[CC Models] Watching for CLI tool config changes...');
}

export function stopConfigWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}
