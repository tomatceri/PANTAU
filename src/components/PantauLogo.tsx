import React from 'react';

interface PantauLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PantauLogoMark: React.FC<PantauLogoProps> = ({ size = 'md', className = '' }) => {
  const dimensions =
    size === 'sm'
      ? 'w-8 h-8 rounded-xl'
      : size === 'lg'
      ? 'w-12 h-12 rounded-2xl'
      : 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl';

  const svgSize =
    size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-7 h-7' : 'w-6 h-6';

  return (
    <div
      className={`relative ${dimensions} bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-950/20 ring-1 ring-inset ring-white/20 overflow-hidden shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Subtle architectural top-right light reflection */}
      <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-cyan-400/25 blur-xs pointer-events-none" />

      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${svgSize} relative z-10`}
      >
        <defs>
          <linearGradient id="pantauStemGrad" x1="8" y1="6" x2="15" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#BAE6FD" />
          </linearGradient>
          <linearGradient id="pantauLoopGrad" x1="13" y1="7" x2="29" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="55%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E0F2FE" />
          </linearGradient>
        </defs>

        {/* Architectural vertical pillar of "P" with 45-degree precision bevel foot */}
        <path
          d="M8.5 8.5C8.5 7.39543 9.39543 6.5 10.5 6.5H14.2V26.6L9.8 29.4C9.14 29.82 8.5 29.34 8.5 28.56V8.5Z"
          fill="url(#pantauStemGrad)"
        />

        {/* Dynamic ribbon bowl of "P" */}
        <path
          d="M14.2 6.5H21.2C25.78 6.5 29 9.52 29 14.0C29 18.48 25.78 21.5 21.2 21.5H16.2L18.4 17.1H21.0C23.15 17.1 24.45 15.88 24.45 14.0C24.45 12.12 23.15 10.9 21.0 10.9H14.2V6.5Z"
          fill="url(#pantauLoopGrad)"
        />

        {/* Precision tracking/radar focal node inside the counter of P */}
        <circle cx="19.8" cy="14" r="2.1" fill="#22D3EE" />
      </svg>
    </div>
  );
};
