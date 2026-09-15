import bcrypt from "bcryptjs";
import prisma from "../../config/database.js";
import { getRedis } from "../../config/redis.js";
import { env } from "../../config/env.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenTtlSeconds,
} from "../../lib/jwt.js";
import { generateTokenId } from "../../lib/crypto.js";
import {
  ConflictError,
  AuthenticationError,
  NotFoundError,
} from "../../lib/errors.js";


const sessionKey = (userId, jti) => `refresh:session:${userId}:${jti}`;
const userSessionsKey = (userId) => `refresh:user:${userId}`;


/**
 *
 * @param {string} userId
 * @returns {{ accessToken: string, refreshToken: string }}
 */
async function issueTokenPair(userId) {
  const jti = generateTokenId();
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId, jti);
  const ttl = getRefreshTokenTtlSeconds();

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(sessionKey(userId, jti), "1", "EX", ttl);

  // Add jti to the user's session set (used for logout-all)
  pipeline.sadd(userSessionsKey(userId), jti);
  pipeline.expire(userSessionsKey(userId), ttl);

  await pipeline.exec();

  return { accessToken, refreshToken };
}

/**
 *
 * @param {string} userId
 * @param {string} jti
 */
async function revokeSession(userId, jti) {
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.del(sessionKey(userId, jti));
  pipeline.srem(userSessionsKey(userId), jti);
  await pipeline.exec();
}

/**
 *
 * @param {string} userId
 */
async function revokeAllSessions(userId) {
  const redis = getRedis();
  const jtis = await redis.smembers(userSessionsKey(userId));

  if (jtis.length === 0) return;

  const pipeline = redis.pipeline();
  for (const jti of jtis) {
    pipeline.del(sessionKey(userId, jti));
  }
  pipeline.del(userSessionsKey(userId));
  await pipeline.exec();
}

/**
 *
 * @param {{ name: string, email: string, password: string }} dto
 * @returns {{ user: object, accessToken: string, refreshToken: string }}
 */
export async function register({ name, email, password }) {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  const { accessToken, refreshToken } = await issueTokenPair(user.id);

  return { user, accessToken, refreshToken };
}

/**
 *
 * @param {{ email: string, password: string }} dto
 * @returns {{ user: object, accessToken: string, refreshToken: string }}
 */
export async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
      passwordHash: true,
    },
  });

  const DUMMY_HASH =
    "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5o8J8sYq8j8N0wG5jWQ9f8hJ8F4lK2K";
  const isValid = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH
  );

  if (!user || !isValid) {
    // A Google-only account (passwordHash === null) is always compared
    // against DUMMY_HASH above, so isValid is always false for it — the
    // more specific "use Google Sign-In" message below was previously dead
    // code because this generic check threw first in every case. Only
    // decide the message here, after confirming *why* it failed.
    if (user && !user.passwordHash) {
      throw new AuthenticationError(
        "This account uses Google Sign-In. Please log in with Google."
      );
    }
    throw new AuthenticationError("Invalid email or password");
  }

  const { accessToken, refreshToken } = await issueTokenPair(user.id);

  // Strip passwordHash before returning
  const { passwordHash: _, ...safeUser } = user;

  return { user: safeUser, accessToken, refreshToken };
}

/**
 *
 * @param {string} incomingRefreshToken
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export async function refresh(incomingRefreshToken) {
  const payload = verifyRefreshToken(incomingRefreshToken); 
  const redis = getRedis();
  const exists = await redis.get(sessionKey(payload.sub, payload.jti));
  if (!exists) {
    await revokeAllSessions(payload.sub);
    throw new AuthenticationError(
      "Refresh token has already been used or revoked"
    );
  }
  await revokeSession(payload.sub, payload.jti);
  const tokens = await issueTokenPair(payload.sub);

  return tokens;
}

/**
 *
 * @param {string} userId
 * @param {string} jti           
 * @param {string} accessToken  
 * @param {number} accessTokenExp  
 */
export async function logout(userId, jti, accessToken, accessTokenExp) {
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.del(sessionKey(userId, jti));
  pipeline.srem(userSessionsKey(userId), jti);
  const ttl = Math.max(1, accessTokenExp - Math.floor(Date.now() / 1000));
  pipeline.set(`blocklist:${accessToken}`, "1", "EX", ttl);

  await pipeline.exec();
}

/**
 *
 * @param {string} userId
 * @param {string} accessToken
 * @param {number} accessTokenExp
 */
export async function logoutAll(userId, accessToken, accessTokenExp) {
  await revokeAllSessions(userId);

  const redis = getRedis();
  const ttl = Math.max(1, accessTokenExp - Math.floor(Date.now() / 1000));
  await redis.set(`blocklist:${accessToken}`, "1", "EX", ttl);
}