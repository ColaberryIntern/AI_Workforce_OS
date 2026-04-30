/**
 * Seed script. Idempotent: safe to run multiple times.
 *
 * Spec: CLAUDE.md (system roles needed for RBAC); Build Guide §1, §2.4.3, §2.5.1
 * (value-prop content extracted directly from the build guide).
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSIONS = [
  // Identity & access
  { key: 'role.read', description: 'Read roles and assignments' },
  { key: 'role.write', description: 'Create / update / delete roles' },
  { key: 'role.assign', description: 'Assign roles to users' },
  { key: 'permission.write', description: 'Modify role permission sets' },
  // Audit
  { key: 'audit.read', description: 'Read audit logs' },
  // Recommendations / forecasting
  { key: 'recommendation.read', description: 'Read recommendations' },
  { key: 'recommendation.write', description: 'Submit / accept / reject recommendations' },
  { key: 'forecast.read', description: 'Read forecasts' },
  { key: 'forecast.write', description: 'Trigger forecasts' },
  // Notifications & webhooks
  { key: 'notification.read', description: 'Read notifications' },
  { key: 'notification.write', description: 'Send notifications' },
  { key: 'webhook.read', description: 'Read webhooks' },
  { key: 'webhook.write', description: 'Manage webhooks' },
  // Analytics
  { key: 'analytics.read', description: 'Read analytics' },
  { key: 'analytics.write', description: 'Ingest analytics events' },
  // Operations
  { key: 'pipeline.run', description: 'Trigger ETL jobs' },
  { key: 'monitoring.read', description: 'Read perf and model metrics' },
  { key: 'alert.write', description: 'Manage alert rules' },
  // Content
  { key: 'content.read', description: 'Read value-prop / matrix / gap content' },
  { key: 'content.write', description: 'Edit value-prop / matrix / gap content' },
];

const ROLES = [
  {
    name: 'admin',
    description: 'Full system access',
    isSystem: true,
    permissions: PERMISSIONS.map((p) => p.key), // every permission
  },
  {
    name: 'manager',
    description: 'HR / Operations manager — workforce decisions + reporting',
    isSystem: true,
    permissions: [
      'role.read',
      'audit.read',
      'recommendation.read',
      'recommendation.write',
      'forecast.read',
      'forecast.write',
      'notification.read',
      'analytics.read',
      'monitoring.read',
      'content.read',
    ],
  },
  {
    name: 'viewer',
    description: 'Read-only baseline role',
    isSystem: true,
    permissions: [
      'recommendation.read',
      'forecast.read',
      'notification.read',
      'analytics.read',
      'content.read',
    ],
  },
];

const VALUE_PROPS = [
  {
    title: 'Increased Efficiency',
    summary:
      'Automate scheduling and staff allocation so HR managers can focus on strategic initiatives.',
    audience: 'hr_manager',
    orderIndex: 0,
  },
  {
    title: 'Data-Driven Insights',
    summary:
      'Real-time analytics empower HR managers to make decisions backed by accurate, current data.',
    audience: 'hr_manager',
    orderIndex: 1,
  },
  {
    title: 'Seamless Integration',
    summary:
      'Slot into existing HR systems with minimal disruption. The platform meets your stack where it lives.',
    audience: 'it_admin',
    orderIndex: 2,
  },
  {
    title: 'Real-Time Adaptability',
    summary:
      'Respond to demand changes the moment they happen — no daily batch lag, no surprise stockouts.',
    audience: 'operations',
    orderIndex: 3,
  },
  {
    title: 'Outcomes, not Activity',
    summary:
      'Executive dashboards focused on cost saved, schedule efficiency, and retention — not vanity metrics.',
    audience: 'executive',
    orderIndex: 4,
  },
];

const CAPABILITIES = [
  { name: 'Real-Time Data Integration', orderIndex: 0 },
  { name: 'Predictive Analytics', orderIndex: 1 },
  { name: 'Compliance Management', orderIndex: 2 },
  { name: 'User-Friendly Interface', orderIndex: 3 },
  { name: 'Cost-Effectiveness', orderIndex: 4 },
  { name: 'Dynamic Scheduling', orderIndex: 5 },
];

const COMPETITORS = [
  { name: 'AI Workforce OS', isOwn: true, orderIndex: 0 },
  { name: 'ShiftPixy', isOwn: false, orderIndex: 1 },
  { name: 'Kronos', isOwn: false, orderIndex: 2 },
  { name: 'WorkFusion', isOwn: false, orderIndex: 3 },
  { name: 'Deputy', isOwn: false, orderIndex: 4 },
];

// Build Guide §2.5.1 matrix
const MATRIX_VALUES: Record<string, Record<string, string>> = {
  'Real-Time Data Integration': {
    'AI Workforce OS': 'YES',
    ShiftPixy: 'NO',
    Kronos: 'LIMITED',
    WorkFusion: 'NO',
    Deputy: 'NO',
  },
  'Predictive Analytics': {
    'AI Workforce OS': 'YES',
    ShiftPixy: 'LIMITED',
    Kronos: 'YES',
    WorkFusion: 'YES',
    Deputy: 'LIMITED',
  },
  'Compliance Management': {
    'AI Workforce OS': 'YES',
    ShiftPixy: 'LIMITED',
    Kronos: 'YES',
    WorkFusion: 'YES',
    Deputy: 'LIMITED',
  },
  'User-Friendly Interface': {
    'AI Workforce OS': 'YES',
    ShiftPixy: 'YES',
    Kronos: 'NO',
    WorkFusion: 'NO',
    Deputy: 'YES',
  },
  'Cost-Effectiveness': {
    'AI Workforce OS': 'HIGH',
    ShiftPixy: 'MEDIUM',
    Kronos: 'LOW',
    WorkFusion: 'MEDIUM',
    Deputy: 'HIGH',
  },
  'Dynamic Scheduling': {
    'AI Workforce OS': 'YES',
    ShiftPixy: 'NO',
    Kronos: 'LIMITED',
    WorkFusion: 'NO',
    Deputy: 'NO',
  },
};

const COMPETITIVE_GAPS = [
  {
    title: 'Lack of real-time adaptability',
    description:
      'Most existing solutions do not integrate real-time data. HR managers cannot respond to changing demand promptly.',
    ourAnswer: 'Live signals + dynamic scheduling — staffing adjusts as demand shifts.',
    orderIndex: 0,
  },
  {
    title: 'Limited predictive analytics',
    description:
      'Few competitors provide comprehensive demand forecasting based on historical patterns.',
    ourAnswer: 'Time-series forecasting (Prophet/ARIMA) with confidence intervals on every output.',
    orderIndex: 1,
  },
  {
    title: 'High implementation cost for SMEs',
    description:
      'Enterprise workforce systems are prohibitively expensive for small and mid-sized businesses.',
    ourAnswer: 'Tiered subscription model accessible to all org sizes.',
    orderIndex: 2,
  },
  {
    title: 'Inflexible scheduling',
    description:
      'Traditional scheduling tools cannot adapt to dynamic demand. Schedules become static and stale.',
    ourAnswer: 'Automated schedule adjustments based on real-time signals + AI recommendations.',
    orderIndex: 3,
  },
];

async function upsertPermissions() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: p,
      update: { description: p.description },
    });
  }
}

async function upsertRoles() {
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      create: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
      update: { description: role.description, isSystem: role.isSystem },
    });

    // Replace permission set
    await prisma.rolePermission.deleteMany({ where: { roleId: created.id } });
    const perms = await prisma.permission.findMany({
      where: { key: { in: role.permissions } },
    });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: created.id, permissionId: p.id })),
    });
  }
}

async function upsertAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@aiwos.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, displayName: 'Seed Admin' },
    update: {},
  });

  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (adminRole) {
    await prisma.roleAssignment.upsert({
      where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
      create: { userId: user.id, roleId: adminRole.id },
      update: {},
    });
  }
  return { email, password };
}

async function upsertValuePropositions() {
  for (const vp of VALUE_PROPS) {
    const existing = await prisma.valueProposition.findFirst({
      where: { title: vp.title, audience: vp.audience },
    });
    if (existing) {
      await prisma.valueProposition.update({ where: { id: existing.id }, data: vp });
    } else {
      await prisma.valueProposition.create({ data: vp });
    }
  }
}

async function upsertMatrix() {
  for (const c of CAPABILITIES) {
    await prisma.capability.upsert({
      where: { name: c.name },
      create: c,
      update: { orderIndex: c.orderIndex },
    });
  }
  for (const c of COMPETITORS) {
    await prisma.competitor.upsert({
      where: { name: c.name },
      create: c,
      update: { isOwn: c.isOwn, orderIndex: c.orderIndex },
    });
  }

  for (const [capName, cols] of Object.entries(MATRIX_VALUES)) {
    const cap = await prisma.capability.findUnique({ where: { name: capName } });
    if (!cap) continue;
    for (const [compName, value] of Object.entries(cols)) {
      const comp = await prisma.competitor.findUnique({ where: { name: compName } });
      if (!comp) continue;
      await prisma.matrixCell.upsert({
        where: {
          capabilityId_competitorId: { capabilityId: cap.id, competitorId: comp.id },
        },
        create: { capabilityId: cap.id, competitorId: comp.id, value },
        update: { value },
      });
    }
  }
}

async function upsertCompetitiveGaps() {
  for (const g of COMPETITIVE_GAPS) {
    const existing = await prisma.competitiveGap.findFirst({ where: { title: g.title } });
    if (existing) {
      await prisma.competitiveGap.update({ where: { id: existing.id }, data: g });
    } else {
      await prisma.competitiveGap.create({ data: g });
    }
  }
}

// =============================================================================
// Subscription / commercial seed (Build Guide §1 §Business Model + §10 GTM)
// Spec: /directives/subscription_tiers.md
// =============================================================================

const SUBSCRIPTION_TIERS = [
  {
    key: 'basic',
    name: 'Basic',
    description: 'Core features for small organizations.',
    monthlyPriceCents: 2900,
    yearlyPriceCents: 29_000,
    features: [
      'Role management',
      'Basic AI recommendations',
      'Standard reporting',
      'Email support',
    ],
    orderIndex: 0,
    isActive: true,
  },
  {
    key: 'professional',
    name: 'Professional',
    description: 'Advanced AI, analytics, and API access for mid-sized teams.',
    monthlyPriceCents: 7900,
    yearlyPriceCents: 79_000,
    features: [
      'Everything in Basic',
      'Advanced AI recommendations',
      'Usage analytics',
      'API access',
      'Webhooks',
    ],
    orderIndex: 1,
    isActive: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    description: 'Full platform with dedicated support and custom integrations.',
    monthlyPriceCents: 14_900,
    yearlyPriceCents: 149_000,
    features: [
      'Everything in Professional',
      'Performance monitoring',
      'Time-series forecasting',
      'Dedicated support',
      'Custom integrations',
    ],
    orderIndex: 2,
    isActive: true,
  },
];

const ADD_ONS = [
  {
    name: 'Advanced analytics pack',
    description: 'Deeper engagement metrics, retention curves, cohort analysis.',
    monthlyPriceCents: 4900,
    applicableTierKeys: ['professional', 'enterprise'],
    orderIndex: 0,
  },
  {
    name: 'Custom reporting',
    description: 'Build and schedule custom reports with white-label exports.',
    monthlyPriceCents: 9900,
    applicableTierKeys: ['professional', 'enterprise'],
    orderIndex: 1,
  },
  {
    name: 'Priority support',
    description: '4-hour SLA, dedicated success manager.',
    monthlyPriceCents: 19_900,
    applicableTierKeys: ['enterprise'],
    orderIndex: 2,
  },
];

const MARKETING_CHANNELS = [
  {
    name: 'LinkedIn organic',
    channelType: 'social',
    targetAudience: 'hr_manager',
    status: 'active',
    notes: 'Weekly thought-leadership posts targeting HR decision-makers.',
    orderIndex: 0,
  },
  {
    name: 'SEO — workforce-management long-tail',
    channelType: 'seo',
    targetAudience: 'sme',
    status: 'active',
    notes: 'Mid-funnel keywords ("ai workforce planning", "shift forecasting"). Updated quarterly.',
    orderIndex: 1,
  },
  {
    name: 'Content — case-studies and whitepapers',
    channelType: 'content',
    targetAudience: 'executive',
    status: 'active',
    notes: 'Quarterly executive-targeted whitepapers + customer case studies.',
    orderIndex: 2,
  },
];

const PARTNERSHIPS = [
  {
    name: 'Allegis Group',
    partnerType: 'consulting_firm',
    status: 'prospect',
    contactName: 'Strategic Partnerships',
    contactEmail: 'partnerships@allegis.example',
    agreementNotes: 'Initial outreach for HR consulting referral program.',
  },
  {
    name: 'SHRM (Society for Human Resource Management)',
    partnerType: 'industry_association',
    status: 'prospect',
    contactName: 'Marketplace Team',
    contactEmail: 'marketplace@shrm.example',
    agreementNotes: 'Targeting SHRM marketplace listing for credibility + reach.',
  },
];

const EVENTS = [
  {
    title: 'AI Workforce OS — product overview',
    eventType: 'webinar',
    description: 'Demo of forecasting, recommendations, and dynamic scheduling.',
    scheduledAt: new Date(Date.now() + 14 * 86_400_000),
    durationMinutes: 60,
    status: 'scheduled',
  },
  {
    title: 'Live demo: dynamic shift allocation',
    eventType: 'demo',
    description: 'Walk-through of demand forecasting and AI-driven schedule adjustments.',
    scheduledAt: new Date(Date.now() + 7 * 86_400_000),
    durationMinutes: 30,
    status: 'scheduled',
  },
];

const CONSULTING_SERVICES = [
  {
    name: 'HR transformation diagnostic',
    description:
      'Two-week engagement assessing current staffing pain points and modeling AI-driven improvements.',
    pricingModel: 'project',
    audience: 'hr_manager',
    orderIndex: 0,
  },
  {
    name: 'Implementation services',
    description:
      'Hands-on configuration of role hierarchies, integrations, and AI baselines for your environment.',
    pricingModel: 'hourly',
    audience: 'it_admin',
    orderIndex: 1,
  },
];

const TRAINING_PROGRAMS = [
  {
    title: 'Platform fundamentals',
    description: 'Self-paced introduction to AI Workforce OS for HR managers and analysts.',
    format: 'self_paced',
    durationHours: 4,
    level: 'intro',
    audience: 'hr_manager',
    orderIndex: 0,
  },
  {
    title: 'Operations master class',
    description: 'Live blended training for operations leaders deploying dynamic scheduling.',
    format: 'blended',
    durationHours: 12,
    level: 'intermediate',
    audience: 'operations',
    orderIndex: 1,
  },
];

// Per-competitor strengths and weaknesses — Build Guide §1 §Competitive Landscape
const COMPETITOR_INSIGHTS: Array<{
  competitorName: string;
  kind: 'strength' | 'weakness' | 'opportunity' | 'threat';
  summary: string;
  detail?: string;
  orderIndex: number;
}> = [
  {
    competitorName: 'Kronos',
    kind: 'strength',
    summary: 'Established brand and customer loyalty in workforce management.',
    detail: 'Decades of enterprise market share; deeply embedded in compliance-heavy industries.',
    orderIndex: 0,
  },
  {
    competitorName: 'Kronos',
    kind: 'weakness',
    summary: 'High pricing and complex UI deter SMEs.',
    detail: 'Implementations take months; heavy training overhead for end users.',
    orderIndex: 1,
  },
  {
    competitorName: 'ShiftPixy',
    kind: 'strength',
    summary: 'Strong gig-economy positioning and flexible staffing model.',
    orderIndex: 0,
  },
  {
    competitorName: 'ShiftPixy',
    kind: 'weakness',
    summary: 'Limited features for traditional workforce management.',
    orderIndex: 1,
  },
  {
    competitorName: 'WorkFusion',
    kind: 'strength',
    summary: 'Advanced AI capabilities for workforce optimization.',
    orderIndex: 0,
  },
  {
    competitorName: 'Deputy',
    kind: 'weakness',
    summary: 'Limited AI capabilities and weak real-time data integration.',
    orderIndex: 0,
  },
];

async function upsertSubscriptionTiers() {
  for (const t of SUBSCRIPTION_TIERS) {
    await prisma.subscriptionTier.upsert({
      where: { key: t.key },
      create: t,
      update: t,
    });
  }
}

async function upsertAddOns() {
  for (const a of ADD_ONS) {
    await prisma.addOn.upsert({
      where: { name: a.name },
      create: a,
      update: a,
    });
  }
}

async function upsertMarketingChannels() {
  for (const m of MARKETING_CHANNELS) {
    await prisma.marketingChannel.upsert({
      where: { name: m.name },
      create: m,
      update: m,
    });
  }
}

async function upsertPartnerships() {
  for (const p of PARTNERSHIPS) {
    await prisma.partnership.upsert({
      where: { name: p.name },
      create: p,
      update: p,
    });
  }
}

async function upsertEvents() {
  for (const e of EVENTS) {
    const existing = await prisma.event.findFirst({ where: { title: e.title } });
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data: e });
    } else {
      await prisma.event.create({ data: e });
    }
  }
}

async function upsertConsultingServices() {
  for (const c of CONSULTING_SERVICES) {
    await prisma.consultingService.upsert({
      where: { name: c.name },
      create: c,
      update: c,
    });
  }
}

async function upsertTrainingPrograms() {
  for (const t of TRAINING_PROGRAMS) {
    await prisma.trainingProgram.upsert({
      where: { title: t.title },
      create: t,
      update: t,
    });
  }
}

async function upsertCompetitorInsights() {
  for (const ci of COMPETITOR_INSIGHTS) {
    const competitor = await prisma.competitor.findUnique({ where: { name: ci.competitorName } });
    if (!competitor) continue;
    const existing = await prisma.competitorInsight.findFirst({
      where: { competitorId: competitor.id, kind: ci.kind, summary: ci.summary },
    });
    const data = {
      competitorId: competitor.id,
      kind: ci.kind,
      summary: ci.summary,
      detail: ci.detail ?? null,
      orderIndex: ci.orderIndex,
    };
    if (existing) {
      await prisma.competitorInsight.update({ where: { id: existing.id }, data });
    } else {
      await prisma.competitorInsight.create({ data });
    }
  }
}

async function main(): Promise<void> {
  await upsertPermissions();
  await upsertRoles();
  const admin = await upsertAdminUser();
  await upsertValuePropositions();
  await upsertMatrix();
  await upsertCompetitiveGaps();

  // Subscription / commercial
  await upsertSubscriptionTiers();
  await upsertAddOns();
  await upsertMarketingChannels();
  await upsertPartnerships();
  await upsertEvents();
  await upsertConsultingServices();
  await upsertTrainingPrograms();
  await upsertCompetitorInsights();

  // eslint-disable-next-line no-console
  console.error(`Seed complete. Admin: ${admin.email} / ${admin.password}`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
