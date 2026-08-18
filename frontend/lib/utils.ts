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

// Defensive compatibility layer for the React dashboard.
// The patient/appointment APIs are authoritative on Render. If an optional
// blog GET is temporarily unavailable during a backend deploy, do not let
// that one module prevent patient data from rendering.
if (typeof window !== "undefined") {
  const win = window as Window & { __homeopathwayFetchPatched?: boolean };
  if (!win.__homeopathwayFetchPatched) {
    const nativeFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const method = (init?.method || "GET").toUpperCase();
      const url = typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : String(input);

      const response = await nativeFetch(input, init);

      if (
        method === "GET" &&
        url.includes("/api/doctor/blogs") &&
        response.status === 404
      ) {
        return new Response(
          JSON.stringify({ success: true, blogs: [] }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-Homeopathway-Api-Fallback": "blog-service-unavailable",
            },
          }
        );
      }

      return response;
    };

    win.__homeopathwayFetchPatched = true;
  }
}
