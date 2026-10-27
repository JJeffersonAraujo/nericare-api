import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { jwtConfig } from "../../config/jwt.js";
import type { AuthenticatedUser } from "../types/authenticatedUser.js";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Token não informado" });

  const [, token] = authHeader.split(" ");

  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as any; // <- usar any aqui
    req.user = {
      id: Number(decoded.id),
      nome: decoded.nome ?? "",
      email: decoded.email,
      role: decoded.role,
    } as AuthenticatedUser;
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
}
