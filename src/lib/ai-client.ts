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

  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

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
    throw new Error(`AI service ${path} failed: ${res.status}`);
  }

  return (await res.json()) as T;
}
