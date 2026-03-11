import { prisma } from '@jurbot/db';
import type { SubscriptionPlan } from '@prisma/client';
import { config } from '../config.js';

const TRIAL_DAYS = 14;

/**
 * Check if a user is the superadmin by telegramId.
 * Superadmin bypasses all plan limits and trial restrictions.
 */
export function isSuperadminTelegramId(telegramId: bigint): boolean {
  return config.superadminTelegramId !== null && telegramId === config.superadminTelegramId;
}

/**
 * Check if a userId belongs to the superadmin.
 */
export async function isSuperadminUser(userId: string): Promise<boolean> {
  if (!config.superadminTelegramId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true } });
  return user?.telegramId === config.superadminTelegramId;
}

interface PlanLimits {
  maxClients: number | null; // null = unlimited
  maxCases: number | null;
  maxAiDocs: number | null;
  maxLawyers: number;
}

const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  TRIAL: { maxClients: null, maxCases: null, maxAiDocs: null, maxLawyers: 1 },
  BASIC: { maxClients: 20, maxCases: 10, maxAiDocs: 5, maxLawyers: 1 },
  PRO: { maxClients: 100, maxCases: 50, maxAiDocs: 30, maxLawyers: 1 },
  BUREAU: { maxClients: null, maxCases: null, maxAiDocs: null, maxLawyers: 5 },
};

export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export async function createTrialSubscription(orgId: string) {
  const expiresAt = new Date(Date.now() + TRIAL_DAYS * 86400000);

  return prisma.subscription.create({
    data: {
      orgId,
      plan: 'TRIAL',
      status: 'TRIAL',
      expiresAt,
      trialUsed: true,
    },
  });
}

export async function getSubscription(orgId: string) {
  return prisma.subscription.findUnique({
    where: { orgId },
  });
}

export async function checkTrialExpiry(orgId: string): Promise<boolean> {
  const sub = await getSubscription(orgId);
  if (!sub) return true;
  if (sub.status === 'EXPIRED' || sub.status === 'CANCELLED') return true;
  if (sub.expiresAt && sub.expiresAt < new Date()) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'EXPIRED' },
    });
    return true;
  }
  return false;
}

export async function getOrCreateUsageCounter(orgId: string) {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return prisma.usageCounter.upsert({
    where: { orgId_period: { orgId, period } },
    create: { orgId, period },
    update: {},
  });
}

export async function incrementUsage(
  orgId: string,
  field: 'clientsCount' | 'casesCount' | 'aiDocsCount' | 'uploadsCount',
) {
  const counter = await getOrCreateUsageCounter(orgId);
  return prisma.usageCounter.update({
    where: { id: counter.id },
    data: { [field]: { increment: 1 } },
  });
}

export async function checkLimit(
  orgId: string,
  limitType: 'clients' | 'cases' | 'aiDocs',
): Promise<{ allowed: boolean; current: number; max: number | null }> {
  const sub = await getSubscription(orgId);
  if (!sub) return { allowed: false, current: 0, max: 0 };

  const limits = getPlanLimits(sub.plan);
  const counter = await getOrCreateUsageCounter(orgId);

  const fieldMap = {
    clients: { current: counter.clientsCount, max: limits.maxClients },
    cases: { current: counter.casesCount, max: limits.maxCases },
    aiDocs: { current: counter.aiDocsCount, max: limits.maxAiDocs },
  };

  const { current, max } = fieldMap[limitType];
  const allowed = max === null || current < max;
  return { allowed, current, max };
}
