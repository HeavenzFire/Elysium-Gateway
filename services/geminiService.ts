import { GoogleGenAI, Content } from "@google/genai";
import { Message, AgentName } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const modelConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
};

// Converts our app's message format to Gemini's content format
const buildHistory = (messages: Message[]): Content[] => {
  return messages.map((msg) => ({
    role: msg.sender === AgentName.USER ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));
};

export const getAgentResponse = async (
  history: Message[],
  systemInstruction: string,
  agentPrompt: string
): Promise<string> => {
  try {
    const fullHistory = buildHistory(history);
    
    // Add the specific prompt for this agent's turn
    const contents = [...fullHistory, { role: 'user', parts: [{ text: agentPrompt }] }];
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        ...modelConfig,
        systemInstruction: systemInstruction,
      },
    });
    
    return response.text;
  } catch (error) {
    console.error("Error getting response from Gemini API:", error);
    return "An error occurred while communicating with the AI. Please check the console.";
  }
};