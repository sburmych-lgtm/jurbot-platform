import type { Request } from 'express';

/** Safely extract a route param, asserting it exists (Express guarantees it for matched routes). */
export function param(req: Request, name: string): string {
  return req.params[name] as string;
}
