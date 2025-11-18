import React from 'react';
import type { Agent } from '../types';

declare global {
  interface Window {
    marked: any;
  }
}

interface AgentMessageProps {
  agent: Agent;
  message: string;
}

const AgentMessage: React.FC<AgentMessageProps> = ({ agent, message }) => {
  const Icon = agent.icon;
  const rawMarkup = window.marked ? window.marked.parse(message) : message;

  return (
    <div className="flex items-start gap-4 p-4 my-2">
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg`} style={{ backgroundColor: agent.color, color: '#fff' }}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-lg" style={{ color: agent.color }}>
          {agent.name}
        </p>
        <div
          className="text-gray-200 leading-relaxed agent-message-content"
          dangerouslySetInnerHTML={{ __html: rawMarkup }}
        />
      </div>
    </div>
  );
};

export default AgentMessage;