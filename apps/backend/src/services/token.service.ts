import { randomBytes } from 'crypto';
import { prisma } from '@jurbot/db';
import type { TokenType } from '@prisma/client';

const TOKEN_PREFIX: Record<TokenType, string> = {
  PUBLIC_LAWYER: 'inv',
  PRIVATE_CASE: 'case',
};

export function generateTokenString(type: TokenType): string {
  const prefix = TOKEN_PREFIX[type];
  const random = randomBytes(12).toString('base64url');
  return `${prefix}_${random}`;
}

export async function createInviteToken(params: {
  orgId: string;
  lawyerId: string;
  tokenType: TokenType;
  caseId?: string;
  maxUses?: number;
  expiresInDays?: number;
}) {
  const token = generateTokenString(params.tokenType);
  const expiresAt = params.expiresInDays
    ? new Date(Date.now() + params.expiresInDays * 86400000)
    : null;

  return prisma.inviteToken.create({
    data: {
      orgId: params.orgId,
      lawyerId: params.lawyerId,
      token,
      tokenType: params.tokenType,
      caseId: params.caseId,
      maxUses: params.maxUses ?? null,
      expiresAt,
    },
  });
}

export async function resolveToken(token: string) {
  const record = await prisma.inviteToken.findUnique({
    where: { token },
    include: {
      org: true,
      lawyer: { include: { user: true } },
    },
  });

  if (!record) return null;
  if (!record.isActive) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;
  if (record.maxUses && record.usageCount >= record.maxUses) return null;

  return record;
}

export async function incrementTokenUsage(tokenId: string) {
  return prisma.inviteToken.update({
    where: { id: tokenId },
    data: { usageCount: { increment: 1 } },
  });
}

export async function deactivateToken(tokenId: string) {
  return prisma.inviteToken.update({
    where: { id: tokenId },
    data: { isActive: false },
  });
}

export async function getTokensByLawyer(lawyerId: string) {
  return prisma.inviteToken.findMany({
    where: { lawyerId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}
