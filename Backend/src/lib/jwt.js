import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AuthenticationError } from "./errors.js";

export function signAccessToken(userId) {
  return jwt.sign({ sub: userId, type: "access" }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    audience: "photo-platform",
    issuer: "photo-platform",
  });
}

export function signRefreshToken(userId, jti) {
  return jwt.sign(
    { sub: userId, type: "refresh", jti },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      audience: "photo-platform",
      issuer: "photo-platform",
    }
  );
}

export function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      audience: "photo-platform",
      issuer: "photo-platform",
    });

    if (payload.type !== "access") {
      throw new AuthenticationError("Invalid token type");
    }

    return payload;
  } catch (err) {
    if (err instanceof AuthenticationError) throw err;
    if (err.name === "TokenExpiredError") {
      throw new AuthenticationError("Access token expired");
    }
    throw new AuthenticationError("Invalid access token");
  }
}

export function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      audience: "photo-platform",
      issuer: "photo-platform",
    });

    if (payload.type !== "refresh") {
      throw new AuthenticationError("Invalid token type");
    }

    return payload;
  } catch (err) {
    if (err instanceof AuthenticationError) throw err;
    if (err.name === "TokenExpiredError") {
      throw new AuthenticationError("Refresh token expired");
    }
    throw new AuthenticationError("Invalid refresh token");
  }
}

export function getRefreshTokenTtlSeconds() {
  const raw = env.JWT_REFRESH_EXPIRES_IN;
  const match = raw.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(`Cannot parse JWT_REFRESH_EXPIRES_IN: "${raw}"`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * multipliers[unit];
}
