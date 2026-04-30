import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Append-only autonomy log. CLAUDE.md "Autonomous Logging" requirement.
 * Tolerates missing or malformed files (autonomy log is non-critical — it
 * must never block business flow).
 */

export interface AutonomyLogEntry {
  timestamp: string;
  source: string;
  summary: string;
  assumptions?: string[];
  confidenceScore?: number;
  testsAdded?: string[];
  directivesUpdated?: string[];
  escalationTriggered?: boolean;
}

export function defaultLogPath(): string {
  return path.resolve(process.cwd(), '..', '..', 'tmp', 'autonomy_log.json');
}

export async function appendAutonomyLog(
  entry: Omit<AutonomyLogEntry, 'timestamp'>,
  logPath: string = defaultLogPath(),
): Promise<void> {
  const fullEntry: AutonomyLogEntry = { timestamp: new Date().toISOString(), ...entry };

  await fs.mkdir(path.dirname(logPath), { recursive: true });

  let current: AutonomyLogEntry[] = [];
  try {
    const raw = await fs.readFile(logPath, 'utf8');
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) current = parsed;
    } catch {
      // malformed → start fresh
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  current.push(fullEntry);
  await fs.writeFile(logPath, JSON.stringify(current, null, 2), 'utf8');
}
