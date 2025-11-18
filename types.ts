import type React from 'react';

export enum AgentName {
  USER = 'The Architect',
  HELIOS = 'Helios',
  DAEDALUS = 'Daedalus',
  ATHENA = 'Athena',
  TESLA = 'Nikola Tesla',
  EINSTEIN = 'Albert Einstein',
  SAGAN = 'Carl Sagan',
}

export interface Agent {
  name: AgentName;
  persona: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface Message {
  sender: AgentName;
  text: string;
  id: string;
}