/**
 * Owner notification channel for escalations.
 * Spec: CLAUDE.md §Escalation Protocol.
 *
 * Writes /tmp/escalation.json + appends history. Real delivery channels
 * (SMS / email / Slack) plug in via the NotificationProvider interface in
 * Phase 4 once a vendor is selected.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface EscalationInput {
  source: string;
  problemSummary: string;
  rootCause: string;
  options: string[];
  risks: string[];
  recommendation: string;
  requiredDecision: string;
}

export interface EscalationEnvelope extends EscalationInput {
  timestamp: string;
  id: string;
  channelsAttempted: string[];
}

const moduleFilename = fileURLToPath(import.meta.url);
const moduleDirname = path.dirname(moduleFilename);
const REPO_ROOT = path.resolve(moduleDirname, '..');
const ESCALATION_PATH = path.join(REPO_ROOT, 'tmp', 'escalation.json');
const HISTORY_PATH = path.join(REPO_ROOT, 'tmp', 'escalations_history.json');

export async function notifyOwner(input: EscalationInput): Promise<EscalationEnvelope> {
  const envelope: EscalationEnvelope = {
    ...input,
    timestamp: new Date().toISOString(),
    id: `esc_${Date.now().toString(36)}`,
    channelsAttempted: [],
  };

  await fs.mkdir(path.dirname(ESCALATION_PATH), { recursive: true });
  await fs.writeFile(ESCALATION_PATH, JSON.stringify(envelope, null, 2), 'utf8');

  let history: EscalationEnvelope[] = [];
  try {
    const raw = await fs.readFile(HISTORY_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) history = parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  history.push(envelope);
  await fs.writeFile(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');

  process.stdout.write(`ESCALATION: ${envelope.id}\n`);
  process.stdout.write(JSON.stringify(envelope, null, 2) + '\n');
  return envelope;
}

async function main(): Promise<void> {
  const argInput = process.argv[2];
  if (!argInput) {
    process.stderr.write('Usage: notify_owner.ts <json_input>\n');
    process.exit(2);
  }
  const parsed = JSON.parse(argInput) as EscalationInput;
  await notifyOwner(parsed);
}

const isMain = process.argv[1] && process.argv[1].endsWith('notify_owner.ts');
if (isMain) {
  main().catch((err) => {
    process.stderr.write(`notify_owner failed: ${(err as Error).message}\n`);
    process.exit(1);
  });
}
