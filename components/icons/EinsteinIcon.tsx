
import React from 'react';

const EinsteinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <ellipse cx="12" cy="12" rx="10" ry="4" />
    <ellipse cx="12" cy="12" rx="4" ry="10" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="4" ry="10" transform="rotate(-60 12 12)" />
  </svg>
);

export default EinsteinIcon;