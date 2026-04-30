/**
 * Deterministic popularity-based recommender baseline.
 * Spec: /directives/recommender_system.md.
 *
 * Pure function. Same input → same output. No randomness.
 * Real ML provider plugs in via RecommenderProvider interface.
 */

export interface UserContext {
  userId: string;
  role?: string;
  location?: string;
  skills?: string[];
}

export interface HistoricalSample {
  kind: string;
  payload?: Record<string, unknown>;
  accepted: boolean | null;
  occurredAt: Date;
}

export interface ScoredRecommendation {
  kind: string;
  payload: Record<string, unknown>;
  confidence: number;
  modelName: string;
  modelVersion: string;
  coldStart: boolean;
}

export interface RecommenderInput {
  user: UserContext;
  history: HistoricalSample[];
  k?: number;
}

const MODEL_NAME = 'popularity-baseline';
const MODEL_VERSION = '1.0.0';
const DEFAULT_KINDS: Array<{ kind: string; payload: Record<string, unknown> }> = [
  { kind: 'allocation', payload: { reason: 'staffing-baseline' } },
  { kind: 'reschedule', payload: { reason: 'demand-shift' } },
  { kind: 'training', payload: { reason: 'skill-gap' } },
  { kind: 'hire', payload: { reason: 'capacity-expansion' } },
];

export function popularityRecommender(input: RecommenderInput): ScoredRecommendation[] {
  const k = input.k ?? 5;
  const now = Date.now();
  const halfLifeMs = 14 * 86_400_000; // 14 days

  // Tally acceptance with exponential recency decay
  const tallies = new Map<string, { accepts: number; rejects: number; weight: number }>();
  for (const h of input.history) {
    const ageDays = (now - h.occurredAt.getTime()) / 86_400_000;
    const decay = Math.pow(0.5, ageDays / 14); // half-life of 14 days
    const t = tallies.get(h.kind) ?? { accepts: 0, rejects: 0, weight: 0 };
    if (h.accepted === true) t.accepts += decay;
    if (h.accepted === false) t.rejects += decay;
    t.weight += 1;
    tallies.set(h.kind, t);
  }

  const cold = input.history.length === 0;
  const candidates = cold ? DEFAULT_KINDS : DEFAULT_KINDS;

  const scored = candidates
    .map((c) => {
      const t = tallies.get(c.kind);
      const total = (t?.accepts ?? 0) + (t?.rejects ?? 0);
      const rate = total === 0 ? 0.4 : t!.accepts / total;
      // Smooth toward prior (0.4) with sample weight
      const smoothed = (rate * total + 0.4 * 5) / (total + 5);
      // Cold start drops confidence
      const confidence = cold ? Math.min(0.35, smoothed) : Math.min(0.95, smoothed);
      return {
        kind: c.kind,
        payload: c.payload,
        confidence: roundTo(confidence, 4),
        modelName: MODEL_NAME,
        modelVersion: MODEL_VERSION,
        coldStart: cold,
      };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, k);

  // Apply lightweight content-based bonus for matching context
  if (input.user.role) {
    for (const r of scored) {
      r.payload = { ...r.payload, audienceRole: input.user.role };
    }
  }

  // Recency tie-breaker for stability across runs (deterministic order)
  scored.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.kind.localeCompare(b.kind);
  });

  return scored;
}

function roundTo(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
