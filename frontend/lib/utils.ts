import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
  if (typeof window !== 'undefined') {
    // If running on local dev server or custom Vercel domains, point to Render production backend
    if (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.hostname.includes('vercel.app')
    ) {
      return `https://doctor-telehealth.onrender.com${path}`;
    }
  }
  return path;
}
