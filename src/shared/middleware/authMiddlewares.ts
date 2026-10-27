import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { jwtConfig } from "../../config/jwt.js";
import type { AuthenticatedUser } from "../types/authenticatedUser.js";

interface JwtPayloadCandidate {
  id?: unknown;
  nome?: unknown;
  email?: unknown;
  role?: unknown;
  [key: string]: unknown;
}

export function isValidRole(role: unknown): role is Role {
  return typeof role === "string" && Object.values(Role).includes(role as Role);
}

export function parseAuthenticatedUser(payload: unknown): AuthenticatedUser | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as JwtPayloadCandidate;

  // Validação segura do ID (aceita number inteiro positivo ou string numérica positiva)
  let validId: number | null = null;
  if (typeof candidate.id === "number" && Number.isInteger(candidate.id) && candidate.id > 0) {
    validId = candidate.id;
  } else if (typeof candidate.id === "string" && /^\d+$/.test(candidate.id.trim())) {
    const parsed = parseInt(candidate.id.trim(), 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      validId = parsed;
    }
  }

  if (validId === null) {
    return null;
  }

  // Validação obrigatória de email
  if (typeof candidate.email !== "string" || !candidate.email.includes("@")) {
    return null;
  }

  // Validação de role contra enum oficial do Prisma
  if (!isValidRole(candidate.role)) {
    return null;
  }

  const nome = typeof candidate.nome === "string" ? candidate.nome : "";

  return {
    id: validId,
    nome,
    email: candidate.email,
    role: candidate.role
  };
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Token não informado" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ message: "Formato de token inválido" });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    const user = parseAuthenticatedUser(decoded);

    if (!user) {
      return res.status(401).json({ message: "Payload do token inconsistente" });
    }

    req.user = user;
    return next();
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expirado" });
    }
    return res.status(401).json({ message: "Token inválido" });
  }
}
