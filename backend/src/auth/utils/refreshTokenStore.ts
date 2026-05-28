import jwt from "jsonwebtoken";
import RefreshToken, { IRefreshToken } from "../models/RefreshToken";
import hashToken from "./hashToken";

const DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getRefreshTokenExpiry(refreshToken: string): Date {
  const decoded = jwt.decode(refreshToken) as { exp?: number } | null;
  if (!decoded?.exp) {
    return new Date(Date.now() + DEFAULT_REFRESH_TOKEN_TTL_MS);
  }

  return new Date(decoded.exp * 1000);
}

export async function storeRefreshToken(params: {
  userId: string;
  refreshToken: string;
  ip?: string;
  userAgent?: string;
}): Promise<IRefreshToken> {
  const tokenHash = hashToken(params.refreshToken);
  return RefreshToken.create({
    userId: params.userId,
    token: tokenHash,
    expiresAt: getRefreshTokenExpiry(params.refreshToken),
    ip: params.ip,
    userAgent: params.userAgent,
  });
}

export async function validateRefreshToken(
  refreshToken: string,
  userId?: string,
): Promise<IRefreshToken | null> {
  const tokenHash = hashToken(refreshToken);
  const record = await RefreshToken.findOne({
    token: tokenHash,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    return null;
  }

  if (userId && record.userId.toString() !== userId) {
    return null;
  }

  return record;
}

export async function rotateRefreshToken(params: {
  tokenRecord: IRefreshToken;
  userId: string;
  newRefreshToken: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const newTokenHash = hashToken(params.newRefreshToken);

  params.tokenRecord.revokedAt = new Date();
  params.tokenRecord.replacedByToken = newTokenHash;
  await params.tokenRecord.save();

  await RefreshToken.create({
    userId: params.userId,
    token: newTokenHash,
    expiresAt: getRefreshTokenExpiry(params.newRefreshToken),
    ip: params.ip,
    userAgent: params.userAgent,
  });
}

export async function revokeRefreshToken(refreshToken: string): Promise<boolean> {
  const tokenHash = hashToken(refreshToken);
  const result = await RefreshToken.updateOne(
    { token: tokenHash, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );

  return result.modifiedCount > 0;
}
