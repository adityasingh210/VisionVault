import * as authService from "./auth.service.js";
import { verifyRefreshToken } from "../../lib/jwt.js";
import { AuthenticationError } from "../../lib/errors.js";
import { env } from "../../config/env.js";

const REFRESH_COOKIE_NAME = "refresh_token";

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions);
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
  });
}

export async function register(req, res) {
  const { user, accessToken, refreshToken } = await authService.register(
    req.body
  );

  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    user,
    accessToken,
  });
}


export async function login(req, res) {
  const { user, accessToken, refreshToken } = await authService.login(req.body);

  setRefreshCookie(res, refreshToken);

  res.json({
    user,
    accessToken,
  });
}


export async function refresh(req, res) {
  const incomingToken = req.cookies[REFRESH_COOKIE_NAME];

  if (!incomingToken) {
    throw new AuthenticationError("No refresh token provided");
  }

  const { accessToken, refreshToken } = await authService.refresh(incomingToken);

  setRefreshCookie(res, refreshToken);

  res.json({ accessToken });
}

export async function logout(req, res) {
  const incomingToken = req.cookies[REFRESH_COOKIE_NAME];
  let jti = null;
  if (incomingToken) {
    try {
      const payload = verifyRefreshToken(incomingToken);
      jti = payload.jti;
    } catch {
    }
  }
  const authHeader = req.headers.authorization;

if (!authHeader?.startsWith("Bearer ")) {
  throw new AuthenticationError();
}

  const rawAccessToken = req.headers.authorization.slice(7);
  const { exp } = JSON.parse(
    Buffer.from(rawAccessToken.split(".")[1], "base64url").toString()
  );

  if (jti) {
    await authService.logout(req.user.id, jti, rawAccessToken, exp);
  } else {
    const { getRedis } = await import("../../config/redis.js");
    const ttl = Math.max(1, exp - Math.floor(Date.now() / 1000));
    await getRedis().set(`blocklist:${rawAccessToken}`, "1", "EX", ttl);
  }

  clearRefreshCookie(res);

  res.json({ message: "Logged out successfully" });
}

export async function logoutAll(req, res) {
  const authHeader =req.headers.authorization;

if (!authHeader?.startsWith("Bearer ")) {
  throw new AuthenticationError();
}
  const rawAccessToken = req.headers.authorization.slice(7);

  const { exp } = JSON.parse(
    Buffer.from(rawAccessToken.split(".")[1], "base64url").toString()
  );

  await authService.logoutAll(req.user.id, rawAccessToken, exp);

  clearRefreshCookie(res);

  res.json({ message: "Logged out from all devices successfully" });
}

export async function me(req, res) {
  res.json({ user: req.user });
}
