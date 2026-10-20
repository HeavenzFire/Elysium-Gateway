import { Message } from "../types";

type AgentResponse = { ok?: boolean; text?: string; error?: string };

export const getAgentResponse = async (
  history: Message[],
  systemInstruction: string,
  agentPrompt: string
): Promise<string> => {
  try {
    const response = await fetch('/api/agent-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, systemInstruction, agentPrompt }),
    });
    const data = await response.json().catch(() => ({} as AgentResponse)) as AgentResponse;
    if (!response.ok || data.ok !== true || typeof data.text !== 'string') {
      console.error('Elysium Gateway provider proxy failed with HTTP ' + response.status);
      return 'An error occurred while communicating with the AI. Please check the server configuration.';
    }
    return data.text;
  } catch {
    console.error('Elysium Gateway provider proxy is unavailable.');
    return 'An error occurred while communicating with the AI. Please check the server configuration.';
  }
};
