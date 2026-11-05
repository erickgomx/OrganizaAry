import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Valida que links externos utilizam estritamente o protocolo http ou https,
 * prevenindo vetores de XSS via javascript:, data: ou outros esquemas maliciosos.
 */
export function sanitizeExternalUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

