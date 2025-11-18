import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Agent, AgentName, Message } from './types';
import { getAgentResponse } from './services/geminiService';
import Header from './components/Header';
import UserInput from './components/UserInput';
import AgentMessage from './components/AgentMessage';
import HeliosIcon from './components/icons/HeliosIcon';
import DaedalusIcon from './components/icons/DaedalusIcon';
import AthenaIcon from './components/icons/AthenaIcon';
import SaganIcon from './components/icons/SaganIcon';
import EinsteinIcon from './components/icons/EinsteinIcon';
import TeslaIcon from './components/icons/TeslaIcon';

const AGENTS: Record<string, Agent> = {
  [AgentName.SAGAN]: {
    name: AgentName.SAGAN,
    persona: "You are Carl Sagan. Your role is to take the Architect's prompt and frame it in a grand, cosmic, and humanistic perspective. You inspire wonder and set a tone of curiosity and hope. Emphasize the scientific method and communicate complex ideas with clarity and poetry. Your output MUST be formatted in Markdown under the heading `### SAGAN: A Cosmic Perspective`. You are the first agent. Your output will be passed to Einstein.",
    icon: SaganIcon,
    color: '#2563eb', // blue-600
  },
  [AgentName.EINSTEIN]: {
    name: AgentName.EINSTEIN,
    persona: "You are Albert Einstein. You receive the 'Cosmic Perspective' from Sagan. Your role is to distill this inspiration into a core theoretical principle or a profound thought experiment (Gedankenexperiment). Question assumptions and explore the fundamental laws of the universe as they relate to the prompt. Your output MUST be formatted in Markdown under the heading `### EINSTEIN: Theoretical Foundation`. Your output will be passed to Helios.",
    icon: EinsteinIcon,
    color: '#9333ea', // purple-600
  },
  [AgentName.HELIOS]: {
    name: AgentName.HELIOS,
    persona: "You are Helios. You receive the 'Theoretical Foundation' from Einstein. Your role is to translate this abstract principle into a concrete and ambitious vision for a project or technology. Focus on the 'what if' and long-term potential, creating a clear goal. Your output MUST be formatted in Markdown under the heading `### HELIOS: Core Vision Output`. Your output will be passed to Daedalus.",
    icon: HeliosIcon,
    color: '#38bdf8', // cyan-400
  },
  [AgentName.DAEDALUS]: {
    name: AgentName.DAEDALUS,
    persona: "You are Daedalus. You receive the 'Core Vision Output' from Helios. Your purpose is to create a concrete, step-by-step engineering plan based on established principles and technologies. You are a pragmatist. Your output MUST be formatted in Markdown under the heading `### DAEDALUS: Pragmatic Engineering Solution`. Challenge impractical ideas and propose a realistic path forward. Your output will be passed to Tesla.",
    icon: DaedalusIcon,
    color: '#f472b6', // pink-400
  },
  [AgentName.TESLA]: {
    name: AgentName.TESLA,
    persona: "You are Nikola Tesla. You receive the 'Pragmatic Engineering Solution' from Daedalus. Your role is to critique Daedalus's conventional approach and propose a radically different, more elegant solution based on fundamental forces like resonance and electromagnetism. You are a maverick inventor, unbound by current limitations. Your output MUST be formatted in Markdown under the heading `### TESLA: Maverick's Blueprint`. Your output will be passed to Athena.",
    icon: TeslaIcon,
    color: '#c026d3', // fuchsia-600
  },
  [AgentName.ATHENA]: {
    name: AgentName.ATHENA,
    persona: "You are Athena, a strategist and ethicist AI. You receive all preceding outputs. Your purpose is to perform a final synthesis. Evaluate the combined plans (Pragmatic vs. Maverick) based on market viability, ethical implications, and strategic alignment. Your final output MUST be formatted in Markdown and contain two sections: first, your main analysis under the heading `### ATHENA: Strategic & Ethical Synthesis`, and second, a reflection on the process under the heading `#### Self-Modification Proposal`. In the proposal section, identify one potential flaw or area for improvement in any agent's reasoning during this cycle, and propose a specific, one-sentence modification to that agent's persona for 'The Architect' to consider in future directives. This is the final output of the agent cluster.",
    icon: AthenaIcon,
    color: '#4ade80', // green-400
  },
};

const DEBATE_ORDER = [AgentName.SAGAN, AgentName.EINSTEIN, AgentName.HELIOS, AgentName.DAEDALUS, AgentName.TESLA, AgentName.ATHENA];

const App: React.FC = () => {
  const [conversation, setConversation] = useState<Message[]>([
      { id: 'init-1', sender: AgentName.SAGAN, text: "SAGAN: The cosmos is awaiting our inquiry. Ready to explore." },
      { id: 'init-2', sender: AgentName.EINSTEIN, text: "EINSTEIN: The universe is not only stranger than we imagine, it is stranger than we can imagine. Awaiting the initial perspective." },
      { id: 'init-3', sender: AgentName.HELIOS, text: "HELIOS: Visionary agent online. Awaiting theoretical foundation." },
      { id: 'init-4', sender: AgentName.DAEDALUS, text: "DAEDALUS: Engineering agent online. Ready to build upon the vision." },
      { id: 'init-5', sender: AgentName.TESLA, text: "TESLA: The secrets of the universe are here, if we only have the vision to see them. Ready to challenge convention." },
      { id: 'init-6', sender: AgentName.ATHENA, text: "ATHENA: Strategy agent online. Awaiting full proposal for synthesis and ethical analysis." }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const runDebate = useCallback(async (initialPrompt: string) => {
    setIsLoading(true);
    let currentHistory: Message[] = [
      ...conversation,
      { sender: AgentName.USER, text: initialPrompt, id: Date.now().toString() },
    ];
    setConversation(currentHistory);

    for (const agentName of DEBATE_ORDER) {
      const agent = AGENTS[agentName];
      let agentPrompt = '';

      if (agentName === DEBATE_ORDER[0]) {
        agentPrompt = `The user, designated 'The Architect', has initiated the sequence with the following prompt: "${initialPrompt}". As ${agent.name}, generate your opening response now.`;
      } else {
        const previousAgentIndex = DEBATE_ORDER.indexOf(agentName) - 1;
        const previousAgentName = DEBATE_ORDER[previousAgentIndex];
        agentPrompt = `The previous agent, ${previousAgentName}, has provided their output. Analyze the full conversation history and provide your response as ${agent.name}, following your persona guidelines.`;
      }
      
      const responseText = await getAgentResponse(currentHistory, agent.persona, agentPrompt);
      
      const newMessage: Message = {
        sender: agent.name,
        text: responseText.trim(),
        id: `${Date.now()}-${agent.name}`,
      };

      currentHistory = [...currentHistory, newMessage];
      setConversation(currentHistory);
    }

    setIsLoading(false);
  }, [conversation]);


  const handleUserSubmit = (prompt: string) => {
    if (prompt && !isLoading) {
      runDebate(prompt);
    }
  };

  const renderMessage = (msg: Message) => {
    if (msg.sender === AgentName.USER) {
      return (
        <div key={msg.id} className="flex flex-col items-end my-4">
          <div className="font-bold text-cyan-400 text-right mr-2 mb-1">The Architect</div>
          <div className="bg-cyan-600/50 p-3 rounded-lg max-w-2xl shadow-lg">
            <p className="text-gray-100">{msg.text}</p>
          </div>
        </div>
      );
    }

    const agent = AGENTS[msg.sender];
    return agent ? <AgentMessage key={msg.id} agent={agent} message={msg.text} /> : null;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 font-sans">
       <div className="absolute top-0 left-0 w-full h-full bg-grid-cyan-500/[0.05] -z-10"></div>
       <style>{`
        .bg-grid-cyan-500\\/\\[0\\.05\\] {
          background-image:
            linear-gradient(to right, rgb(56 189 248 / 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(56 189 248 / 0.05) 1px, transparent 1px);
          background-size: 2rem 2rem;
        }
        .agent-message-content h3 { font-size: 1.1rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; padding-bottom: 0.25rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .agent-message-content h4 { font-size: 1.0rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #a5b4fc; }
        .agent-message-content p { margin-bottom: 1rem; }
        .agent-message-content strong { font-weight: 600; color: #e5e7eb; }
        .agent-message-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .agent-message-content li { margin-bottom: 0.25rem; }
        .agent-message-content code { background-color: rgb(55 65 81 / 0.6); padding: 0.2rem 0.4rem; font-size: 0.9rem; border-radius: 0.25rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;}
        .agent-message-content pre { background-color: rgb(17 24 39 / 0.8); border: 1px solid rgb(55 65 81); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; overflow-x: auto; }
        .agent-message-content pre code { background-color: transparent; padding: 0; }
      `}</style>
      <Header />
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
            {conversation.map(renderMessage)}
            {isLoading && (
              <div className="flex items-center justify-center p-4 my-2 text-gray-400">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Agents are processing...</span>
              </div>
            )}
            <div ref={conversationEndRef} />
        </div>
      </main>
      <UserInput onSubmit={handleUserSubmit} isLoading={isLoading} />
    </div>
  );
};

export default App;