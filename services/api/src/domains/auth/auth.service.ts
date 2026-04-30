import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import { loadEnv } from '../../config/env.js';
import { getEffectivePermissions } from '../../lib/permissions.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from '../../lib/errors.js';
import type {
  RegisterInput,
  LoginInput,
  RefreshInput,
  ChangePasswordInput,
} from './auth.schemas.js';

const BCRYPT_COST = 10;
const REFRESH_TOKEN_BYTES = 32;
const DEFAULT_ROLE = 'viewer';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
}

function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export class AuthService {
  constructor(private readonly db: PrismaClient) {}

  // ---- Public API ----

  async register(input: RegisterInput): Promise<{ user: AuthenticatedUser; tokens: TokenPair }> {
    const existing = await this.db.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const user = await this.db.user.create({
      data: {
        email: input.email,
        passwordHash,
        displayName: input.displayName,
      },
    });

    // Assign default 'viewer' role if it exists (it's seeded in production)
    const defaultRole = await this.db.role.findUnique({ where: { name: DEFAULT_ROLE } });
    if (defaultRole) {
      await this.db.roleAssignment.create({
        data: { userId: user.id, roleId: defaultRole.id },
      });
    }

    const ctx = await this.buildAuthContext(user.id, user.email, user.displayName, user.isActive);
    const tokens = await this.issueTokens(ctx.user.id, ctx.user.email, ctx.user.roles, ctx.user.permissions);
    return { user: ctx.user, tokens };
  }

  async login(input: LoginInput): Promise<{ user: AuthenticatedUser; tokens: TokenPair }> {
    const user = await this.db.user.findUnique({ where: { email: input.email } });
    if (!user) throw new UnauthorizedError('Invalid credentials');

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Invalid credentials');
    if (!user.isActive) throw new ForbiddenError('Account disabled');

    const ctx = await this.buildAuthContext(user.id, user.email, user.displayName, user.isActive);
    const tokens = await this.issueTokens(ctx.user.id, ctx.user.email, ctx.user.roles, ctx.user.permissions);
    return { user: ctx.user, tokens };
  }

  async refresh(input: RefreshInput): Promise<{ user: AuthenticatedUser; tokens: TokenPair }> {
    const tokenHash = hashRefreshToken(input.refreshToken);
    const stored = await this.db.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedError('Invalid refresh token');
    if (stored.revokedAt) {
      // Reuse of revoked token — possible compromise. Revoke the entire chain.
      await this.revokeAllRefreshTokens(stored.userId);
      throw new UnauthorizedError('Refresh token has been revoked');
    }
    if (stored.expiresAt < new Date()) throw new UnauthorizedError('Refresh token expired');
    if (!stored.user.isActive) throw new ForbiddenError('Account disabled');

    // Rotate: revoke old, issue new pair
    const ctx = await this.buildAuthContext(
      stored.user.id,
      stored.user.email,
      stored.user.displayName,
      stored.user.isActive,
    );
    const tokens = await this.issueTokens(ctx.user.id, ctx.user.email, ctx.user.roles, ctx.user.permissions);

    await this.db.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedBy: hashRefreshToken(tokens.refreshToken) },
    });

    return { user: ctx.user, tokens };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(refreshToken);
    await this.db.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<AuthenticatedUser> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError('User not found');
    const { user: built } = await this.buildAuthContext(user.id, user.email, user.displayName, user.isActive);
    return built;
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError('User not found');
    const ok = await bcrypt.compare(input.oldPassword, user.passwordHash);
    if (!ok) throw new BadRequestError('Old password is incorrect');
    const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_COST);
    await this.db.user.update({ where: { id: userId }, data: { passwordHash } });
    // Invalidate all refresh tokens
    await this.revokeAllRefreshTokens(userId);
  }

  // ---- Helpers ----

  private async buildAuthContext(
    userId: string,
    email: string,
    displayName: string,
    isActive: boolean,
  ): Promise<{ user: AuthenticatedUser }> {
    const { roles, permissions } = await getEffectivePermissions(this.db, userId);
    return {
      user: { id: userId, email, displayName, roles, permissions },
    };
  }

  private async issueTokens(
    userId: string,
    email: string,
    roles: string[],
    permissions: string[],
  ): Promise<TokenPair> {
    const env = loadEnv();
    const accessToken = jwt.sign(
      { userId, email, roles, permissions },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
    );

    const raw = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 86_400_000);
    await this.db.refreshToken.create({
      data: { userId, tokenHash: hashRefreshToken(raw), expiresAt },
    });

    return { accessToken, refreshToken: raw, expiresAt: expiresAt.toISOString() };
  }

  private async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
