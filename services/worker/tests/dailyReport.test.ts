import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { generateDailyReport } from '../src/dailyReport/dailyReport.js';

describe('generateDailyReport', () => {
  let sandbox: string;
  let autonomyLogPath: string;
  let escalationPath: string;

  beforeEach(async () => {
    sandbox = path.join(tmpdir(), `aiwos_dr_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(sandbox, { recursive: true });
    autonomyLogPath = path.join(sandbox, 'autonomy_log.json');
    escalationPath = path.join(sandbox, 'escalation.json');
  });

  afterEach(async () => {
    await fs.rm(sandbox, { recursive: true, force: true });
  });

  it('produces a valid report shape when no logs exist', async () => {
    const now = new Date('2026-04-30T12:00:00.000Z');
    const r = await generateDailyReport({ now, autonomyLogPath, escalationPath });
    expect(r.generatedAt).toBe('2026-04-30T12:00:00.000Z');
    expect(r.windowStart).toBe('2026-04-29T12:00:00.000Z');
    expect(r.completedWork).toEqual([]);
    expect(r.testsAdded).toEqual([]);
    expect(r.openEscalations).toEqual([]);
    expect(r.confidenceAvg).toBeNull();
    expect(r.nextMilestones.length).toBeGreaterThan(0);
  });

  it('aggregates entries within the 24h window and computes averages', async () => {
    const now = new Date('2026-04-30T12:00:00.000Z');
    await fs.writeFile(
      autonomyLogPath,
      JSON.stringify([
        { timestamp: '2026-04-28T00:00:00.000Z', source: 'old', summary: 'old', confidenceScore: 0.5 },
        {
          timestamp: '2026-04-29T18:00:00.000Z',
          source: 'wave',
          summary: 'recent',
          confidenceScore: 0.9,
          testsAdded: ['t.ts'],
          assumptions: ['x'],
        },
        {
          timestamp: '2026-04-30T06:00:00.000Z',
          source: 'edge',
          summary: 'risky',
          confidenceScore: 0.5,
        },
      ]),
    );
    const r = await generateDailyReport({ now, autonomyLogPath, escalationPath });
    expect(r.completedWork).toHaveLength(2);
    expect(r.testsAdded).toEqual(['t.ts']);
    expect(r.assumptionsMade).toEqual(['x']);
    expect(r.confidenceAvg).toBeCloseTo(0.7);
    expect(r.riskFlags.length).toBe(1);
  });

  it('includes any escalations from the escalation file', async () => {
    const now = new Date('2026-04-30T12:00:00.000Z');
    await fs.writeFile(
      escalationPath,
      JSON.stringify([
        {
          timestamp: '2026-04-29T20:00:00.000Z',
          source: 'arch',
          problemSummary: 'DB choice',
          recommendation: 'Postgres',
          requiredDecision: 'confirm',
        },
      ]),
    );
    const r = await generateDailyReport({ now, autonomyLogPath, escalationPath });
    expect(r.openEscalations).toHaveLength(1);
    expect(r.openEscalations[0].source).toBe('arch');
  });

  it('tolerates malformed JSON', async () => {
    await fs.writeFile(autonomyLogPath, '{ not json');
    const r = await generateDailyReport({
      now: new Date(),
      autonomyLogPath,
      escalationPath,
    });
    expect(r.completedWork).toEqual([]);
  });
});
