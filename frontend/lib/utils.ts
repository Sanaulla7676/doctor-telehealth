import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const RENDER_API_BASE = "https://doctor-telehealth.onrender.com";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | Date): string {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getApiUrl(path: string): string {
  if (typeof window !== "undefined") {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.includes("vercel.app") ||
      window.location.hostname.includes("drvarshabandi.com")
    ) {
      return `${RENDER_API_BASE}${path}`;
    }
  }
  return path;
}
