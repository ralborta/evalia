const ELEVEN_BASE = "https://api.elevenlabs.io/v1";

export async function getSignedConversationUrl(agentId: string): Promise<string> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY no configurada");

  const url = new URL(`${ELEVEN_BASE}/convai/conversation/get-signed-url`);
  url.searchParams.set("agent_id", agentId);
  url.searchParams.set("include_conversation_id", "true");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "xi-api-key": key },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs signed URL error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { signed_url?: string };
  if (!data.signed_url) throw new Error("Respuesta ElevenLabs sin signed_url");
  return data.signed_url;
}
