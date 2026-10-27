import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { jwtConfig } from "../../config/jwt.js";
import type { AuthenticatedUser } from "../types/authenticatedUser.js";
import { parseAuthenticatedUser } from "./authMiddlewares.js";

export function authMiddleware(
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
    next();
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expirado" });
    }
    return res.status(401).json({ message: "Token inválido" });
  }
}

// 🔑 USADO PELO TSOA
export async function expressAuthentication(
  request: Request,
  _securityName: string,
  _scopes?: string[]
): Promise<AuthenticatedUser> {
  if (!request.user) {
    throw new Error("Não autenticado");
  }

  return request.user;
}
