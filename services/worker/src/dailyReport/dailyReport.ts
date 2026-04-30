/**
 * Daily executive report generator. Spec: CLAUDE.md §Daily Executive Report.
 *
 * Pure function — paths are injected so the test harness controls them.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

interface AutonomyLogEntry {
  timestamp: string;
  source: string;
  summary: string;
  assumptions?: string[];
  confidenceScore?: number;
  testsAdded?: string[];
  directivesUpdated?: string[];
}

interface EscalationEntry {
  timestamp: string;
  source: string;
  problemSummary: string;
  recommendation: string;
  requiredDecision: string;
}

export interface DailyReport {
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  completedWork: string[];
  testsAdded: string[];
  failuresResolved: string[];
  architecturalChanges: string[];
  confidenceAvg: number | null;
  assumptionsMade: string[];
  riskFlags: string[];
  openEscalations: EscalationEntry[];
  nextMilestones: string[];
}

export interface ReportOptions {
  now?: Date;
  autonomyLogPath?: string;
  escalationPath?: string;
}

function defaultRepoRoot(): string {
  return path.resolve(process.cwd(), '..', '..');
}

async function readJsonSafe<T>(p: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    return fallback; // tolerate malformed
  }
}

export async function generateDailyReport(options: ReportOptions = {}): Promise<DailyReport> {
  const now = options.now ?? new Date();
  const root = defaultRepoRoot();
  const autonomyLogPath = options.autonomyLogPath ?? path.join(root, 'tmp', 'autonomy_log.json');
  const escalationPath = options.escalationPath ?? path.join(root, 'tmp', 'escalation.json');

  const windowStart = new Date(now.getTime() - 86_400_000);
  const log = await readJsonSafe<AutonomyLogEntry[]>(autonomyLogPath, []);
  const escalations = await readJsonSafe<EscalationEntry[]>(escalationPath, []);

  const safeLog = Array.isArray(log) ? log : [];
  const safeEsc = Array.isArray(escalations) ? escalations : [];

  const recent = safeLog.filter((e) => {
    const t = new Date(e.timestamp);
    return t >= windowStart && t <= now;
  });

  const confidences = recent
    .map((e) => e.confidenceScore)
    .filter((v): v is number => typeof v === 'number');
  const confidenceAvg =
    confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null;

  return {
    generatedAt: now.toISOString(),
    windowStart: windowStart.toISOString(),
    windowEnd: now.toISOString(),
    completedWork: recent.map((e) => `[${e.source}] ${e.summary}`),
    testsAdded: recent.flatMap((e) => e.testsAdded ?? []),
    failuresResolved: [],
    architecturalChanges: recent
      .filter((e) => e.source.startsWith('arch:') || e.source.includes('architecture'))
      .map((e) => e.summary),
    confidenceAvg,
    assumptionsMade: recent.flatMap((e) => e.assumptions ?? []),
    riskFlags: recent
      .filter((e) => (e.confidenceScore ?? 1) < 0.65)
      .map((e) => `Low confidence: ${e.summary}`),
    openEscalations: safeEsc,
    nextMilestones: [
      'Phase 4: real email/SMS provider integration',
      'Phase 4: real ML model integration (Python service)',
      'Phase 5: production deployment + APM vendor wiring',
    ],
  };
}

async function main(): Promise<void> {
  const report = await generateDailyReport();
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

const isMain = process.argv[1] && /dailyReport\.(js|ts)$/.test(process.argv[1]);
if (isMain) {
  main().catch((err) => {
    process.stderr.write(`Daily report failed: ${(err as Error).message}\n`);
    process.exit(1);
  });
}
