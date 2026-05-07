/**
 * Server-to-server calls to the AI microservice.
 * Never log request/response bodies — they may contain PHI-adjacent context.
 */
export async function callAiService<T>(
  path: string,
  payload: unknown
): Promise<T> {
  const baseUrl = process.env.AI_SERVICE_URL;
  const apiKey = process.env.INTERNAL_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("AI service env vars not set");
  }

  const origin = baseUrl.replace(/\/$/, "");
  const url = `${origin}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-key": apiKey,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    let bodyPreview = "";
    try {
      const t = await res.text();
      bodyPreview = t.replace(/\s+/g, " ").trim().slice(0, 120);
    } catch {
      /* ignore */
    }

    let hint = "";
    if (res.status === 404) {
      hint =
        " This URL often means AI_SERVICE_URL is not your FastAPI service: on Railway, the project slug alone can show a placeholder (GET /health returns plain text \"OK\" instead of JSON {\"status\":\"ok\",...}). Open Railway → your Python service → Settings → Networking and set AI_SERVICE_URL to that service’s public URL.";
    }

    const detail =
      bodyPreview.length > 0 ? ` Response: ${bodyPreview}` : "";
    throw new Error(
      `AI service ${path} failed: ${res.status} (${url})${detail}.${hint}`
    );
  }

  return (await res.json()) as T;
}
