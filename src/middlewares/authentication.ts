import type { Request } from "express";
import { verifyToken, type JwtPayload } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { toHttpError } from "@/lib/errors";

function parseBearerToken(authorizationHeader: unknown): string | null {
  if (typeof authorizationHeader !== "string") return null;
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
};

export interface AuthenticatedRequest {
  user?: AuthenticatedUser;
}

export type AuthenticationErrorResponse = {
  message: string;
};

export const AUTH_ERROR_401 =
  "Unauthorized - Missing Authorization header, invalid token, or expired token";
export const AUTH_ERROR_403 =
  "Forbidden - User does not have required role/permissions";

export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[]
): Promise<AuthenticatedUser> {
  if (securityName !== "bearerAuth") {
    throw toHttpError(401, "Unknown security definition");
  }

  const token = parseBearerToken(request.headers.authorization);
  if (!token) {
    throw toHttpError(401, "Missing Authorization header");
  }

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    throw toHttpError(401, "Invalid or expired token");
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null },
  });
  if (!user) {
    throw toHttpError(401, "Invalid or expired token");
  }

  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
  };

  (request as AuthenticatedRequest).user = authenticatedUser;

  if (scopes?.length) {
    const allowed = new Set(scopes);
    if (!allowed.has(user.role)) {
      throw toHttpError(403, "Forbidden");
    }
  }

  return authenticatedUser;
}
