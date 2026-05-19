import chokidar, { type FSWatcher } from 'chokidar';
import path from 'node:path';
import { CLI_TOOLS } from '@ccswitch/shared';

let watcher: FSWatcher | null = null;

export function initConfigWatcher(onChange: () => void): void {
  // Watch parent directories of all known config paths
  const watchDirs = new Set<string>();
  for (const tool of CLI_TOOLS) {
    for (const p of tool.configPaths) {
      watchDirs.add(path.dirname(p));
    }
  }

  const watchPatterns = [...watchDirs].filter((d) => d && !d.includes('undefined'));

  watcher = chokidar.watch(watchPatterns, {
    ignoreInitial: true,
    depth: 0,
    // Only watch for config files
    ignored: /(^|[\/\\])\..(?!claude|codex|gemini|opencode|openclaw|hermes)/,
  });

  watcher.on('add', onChange);
  watcher.on('change', onChange);

  console.log('[CC Switch] Watching for CLI tool config changes...');
}

export function stopConfigWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}
