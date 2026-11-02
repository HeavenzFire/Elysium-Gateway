import { Message } from "../types";

export const getAgentResponse = async (
  history: Message[],
  systemInstruction: string,
  agentPrompt: string
): Promise<string> => {
  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ history, systemInstruction, agentPrompt }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = typeof result.error === "string" ? result.error : "provider_request_failed";
      throw new Error(reason);
    }
    return typeof result.text === "string" ? result.text : "";
  } catch (error) {
    console.error("Elysium Gateway request failed:", error);
    return "The local gateway could not complete this request. Check that the server is running and GEMINI_API_KEY is configured on the server.";
  }
};
