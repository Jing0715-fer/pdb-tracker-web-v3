import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export function createTempFile(content: string, filename: string): { path: string; cleanup: () => void } {
  const tmpPath = join(tmpdir(), `pdb-tracker-${process.pid}-${filename}`);
  writeFileSync(tmpPath, content, 'utf8');
  return {
    path: tmpPath,
    cleanup: () => {
      try {
        unlinkSync(tmpPath);
      } catch {
        // ignore cleanup errors
      }
    },
  };
}