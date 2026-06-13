import { verifyAccessToken } from "../lib/jwt.js";
import { getRedis } from "../config/redis.js";
import { AuthenticationError } from "../lib/errors.js";
import prisma from "../config/database.js";

/**
 * @param {import("express").Request} req
 * @returns {string|null}
 */
function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function authenticate(req, _res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    throw new AuthenticationError("No token provided");
  }

  const payload = verifyAccessToken(token); 

  const redis = getRedis();
  const isBlocklisted = await redis.get(`blocklist:${token}`);

  if (isBlocklisted) {
    throw new AuthenticationError("Token has been revoked");
  }


  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AuthenticationError("User no longer exists");
  }

  req.user = user;
  next();
}

export async function optionalAuthenticate(req, _res, next) {
  const token = extractBearerToken(req);

  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);

    const redis = getRedis();
    const isBlocklisted = await redis.get(`blocklist:${token}`);
    if (isBlocklisted) return next();

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (user) req.user = user;
  } catch {
    
  }

  next();
}
