
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center p-4 border-b border-cyan-500/20 shadow-lg shadow-cyan-500/10 bg-gray-900/50 backdrop-blur-sm">
      <h1 className="text-3xl md:text-4xl font-bold text-cyan-400 tracking-wider">
        Elysium Gateway
      </h1>
      <p className="text-sm md:text-base text-gray-400 mt-1">
        Autonomous R&D Agent Debate
      </p>
    </header>
  );
};

export default Header;
