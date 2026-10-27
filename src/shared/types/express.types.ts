import type { AuthenticatedUser } from "./authenticatedUser.js";
import type { Request } from "express";

declare module "express" {
  interface Request {
    user?: AuthenticatedUser;
  }
}
