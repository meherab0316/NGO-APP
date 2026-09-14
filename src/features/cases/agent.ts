import { getValidAccessToken } from "../../lib/blocks/auth";
import { blocksConfig } from "../../lib/blocks/config";

// Blocks Agents integration (https://agents.seliseblocks.com).
// The agent contributes a Bangla advisory paragraph for the coordinator/
// officer; the structured JSON summary stays with the deterministic parser
// (ai.ts) so the case record's shape never depends on LLM output.
//
// All values below are client-safe public ids - no secrets.

const AGENTS_URL = "https://agents.seliseblocks.com";
const AGENT_ID = "63ea096b-8dcf-4bbc-9bfb-81da14bbe807";
const AGENTS_PROJECT_KEY = "410c5e79-7f80-4cf8-b96b-2df6fe4d94f3";

export async function agentAdvisory(rawNote: string): Promise<string | null> {
  try {
    const token = await getValidAccessToken();
    if (!token) return null;
    const res = await fetch(`${AGENTS_URL}/api/ai-agent/query-lmt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Blocks-Key": blocksConfig.xBlocksKey,
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        agent_id: AGENT_ID,
        project_key: AGENTS_PROJECT_KEY,
        query: `A field officer recorded this household note: "${rawNote}". In Bangla, give the coordinator a short (max 120 words) advisory: what to verify and decide. No greetings.`
      })
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { response?: string };
    return data.response?.trim() || null;
  } catch {
    return null;
  }
}
