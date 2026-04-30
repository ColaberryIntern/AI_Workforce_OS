import type { PrismaClient, Prisma } from '@prisma/client';

/**
 * Alerter loop. Spec: /directives/alerting_system.md.
 *
 * Evaluates active AlertRules every tick:
 *  - Aggregates PerfMetric / ModelMetric values within `windowSecs`
 *  - If breached, creates an Alert (deduped against existing open alerts)
 */

interface RuleAggResult {
  matched: boolean;
  observedValue: number | null;
}

export class Alerter {
  constructor(private readonly db: PrismaClient) {}

  async tick(now: Date = new Date()): Promise<{ rulesEvaluated: number; alertsCreated: number }> {
    const rules = await this.db.alertRule.findMany({ where: { isActive: true } });

    let alertsCreated = 0;
    for (const rule of rules) {
      const since = new Date(now.getTime() - rule.windowSecs * 1000);
      const result = await this.evaluate(rule, since);
      if (result.matched) {
        // Skip if there's an existing open alert from the same rule
        const existing = await this.db.alert.findFirst({
          where: { ruleId: rule.id, status: 'open' },
        });
        if (existing) continue;
        await this.db.alert.create({
          data: {
            ruleId: rule.id,
            source: rule.source,
            severity: rule.severity,
            title: `${rule.name}: ${rule.metric} breached`,
            description: `Observed ${result.observedValue} ${rule.operator} ${rule.threshold} (window=${rule.windowSecs}s)`,
            status: 'open',
            triggeredAt: now,
          },
        });
        alertsCreated++;
      }
    }

    return { rulesEvaluated: rules.length, alertsCreated };
  }

  private async evaluate(
    rule: { source: string; metric: string; operator: string; threshold: number },
    since: Date,
  ): Promise<RuleAggResult> {
    if (rule.source === 'apm') {
      const items = await this.db.perfMetric.findMany({
        where: { metricName: rule.metric, recordedAt: { gte: since } },
      });
      if (items.length === 0) return { matched: false, observedValue: null };
      const avg = items.reduce((s, x) => s + x.metricValue, 0) / items.length;
      return { matched: cmp(avg, rule.operator, rule.threshold), observedValue: avg };
    }
    if (rule.source === 'model') {
      const items = await this.db.modelMetric.findMany({
        where: { metricName: rule.metric, recordedAt: { gte: since } },
      });
      if (items.length === 0) return { matched: false, observedValue: null };
      const avg = items.reduce((s, x) => s + x.metricValue, 0) / items.length;
      return { matched: cmp(avg, rule.operator, rule.threshold), observedValue: avg };
    }
    return { matched: false, observedValue: null };
  }
}

function cmp(a: number, op: string, b: number): boolean {
  switch (op) {
    case 'gt': return a > b;
    case 'gte': return a >= b;
    case 'lt': return a < b;
    case 'lte': return a <= b;
    case 'eq': return a === b;
    default: return false;
  }
}

// Used by the alerter directive (kept available for typing in tests)
export type _AlertWhere = Prisma.AlertWhereInput;
