'use client';

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const GlassShieldIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="shieldGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38BDF8" />
        <stop offset="0.5" stopColor="#6366F1" />
        <stop offset="1" stopColor="#0EA5E9" />
      </linearGradient>
      <linearGradient id="shieldGlow" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFFFFF" stopOpacity="0.4" />
        <stop offset="0.6" stopColor="#38BDF8" stopOpacity="0.1" />
        <stop offset="1" stopColor="#0284C7" stopOpacity="0.25" />
      </linearGradient>
      <linearGradient id="coreCheck" x1="7" y1="12" x2="17" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E0F2FE" />
        <stop offset="1" stopColor="#38BDF8" />
      </linearGradient>
    </defs>
    {/* Outer Defense Shell */}
    <path
      d="M12 2.5L20 6.2V11.5C20 16.5 16.6 20.8 12 22C7.4 20.8 4 16.5 4 11.5V6.2L12 2.5Z"
      fill="url(#shieldGlow)"
      stroke="url(#shieldGrad)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Inner Specular Bevel */}
    <path
      d="M12 4.5L18 7.5V11.5C18 15.3 15.4 18.8 12 19.8C8.6 18.8 6 15.3 6 11.5V7.5L12 4.5Z"
      stroke="rgba(255,255,255,0.25)"
      strokeWidth="1"
      strokeDasharray="2 2"
    />
    {/* Cryptographic Core Emblem */}
    <path
      d="M8.5 12L10.8 14.3L15.5 9.6"
      stroke="url(#coreCheck)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Top specular highlight point */}
    <circle cx="12" cy="4" r="1" fill="#FFFFFF" opacity="0.9" />
  </svg>
);

export const LiquidGlobeIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="globeGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#06B6D4" />
        <stop offset="1" stopColor="#3B82F6" />
      </linearGradient>
      <radialGradient id="globeFill" cx="50%" cy="30%" r="70%">
        <stop stopColor="#38BDF8" stopOpacity="0.25" />
        <stop offset="1" stopColor="#0B132B" stopOpacity="0.85" />
      </radialGradient>
    </defs>
    <circle cx="12" cy="12" r="9.5" fill="url(#globeFill)" stroke="url(#globeGrad)" strokeWidth="1.5" />
    <ellipse cx="12" cy="12" rx="4.5" ry="9.5" stroke="rgba(56, 189, 248, 0.6)" strokeWidth="1.2" />
    <line x1="2.5" y1="12" x2="21.5" y2="12" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.2" />
    <path d="M4.5 7.5H19.5" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1" />
    <path d="M4.5 16.5H19.5" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1" />
    <circle cx="14" cy="9" r="1.5" fill="#38BDF8" />
  </svg>
);

export const CrystalKeyIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="keyGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="0.5" stopColor="#EC4899" />
        <stop offset="1" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
    <circle cx="7.5" cy="12" r="5" fill="rgba(245, 158, 11, 0.15)" stroke="url(#keyGrad)" strokeWidth="1.5" />
    <circle cx="7.5" cy="12" r="2" fill="#FBBF24" opacity="0.8" />
    <path
      d="M12.5 12H21V16H18V13.5H15.5V16H13"
      stroke="url(#keyGrad)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M6 10C6.5 9 8 9 8.5 9" stroke="#FFF" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

export const PulseRadarIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="pulseGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1" strokeDasharray="3 3" />
    <circle cx="12" cy="12" r="6.5" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="1.2" />
    <circle cx="12" cy="12" r="3" fill="#10B981" />
    <path d="M12 2V6" stroke="url(#pulseGrad)" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 18V22" stroke="url(#pulseGrad)" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M2 12H6" stroke="url(#pulseGrad)" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M18 12H22" stroke="url(#pulseGrad)" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="15.5" cy="8.5" r="1" fill="#6EE7B7" />
  </svg>
);

export const DefenseMatrixIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="defGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F43F5E" />
        <stop offset="1" stopColor="#FB7185" />
      </linearGradient>
    </defs>
    <polygon
      points="12 2 21 7 21 17 12 22 3 17 3 7"
      fill="rgba(244, 63, 94, 0.12)"
      stroke="url(#defGrad)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M12 6V12L17 15" stroke="#FDA4AF" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="12" r="2" fill="#F43F5E" />
  </svg>
);

export const QuantumCpuIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="cpuGrad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#818CF8" />
        <stop offset="1" stopColor="#C084FC" />
      </linearGradient>
    </defs>
    <rect x="5" y="5" width="14" height="14" rx="3" fill="rgba(129, 140, 248, 0.15)" stroke="url(#cpuGrad)" strokeWidth="1.5" />
    <rect x="9" y="9" width="6" height="6" rx="1" fill="#818CF8" opacity="0.6" stroke="#FFF" strokeWidth="1" />
    <path d="M9 2V5M15 2V5M9 19V22M15 19V22M2 9H5M2 15H5M19 9H22M19 15H22" stroke="url(#cpuGrad)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const GlassPlayerIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="playGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38BDF8" />
        <stop offset="1" stopColor="#2563EB" />
      </linearGradient>
      <radialGradient id="playDisc" cx="50%" cy="30%" r="70%">
        <stop stopColor="#FFFFFF" stopOpacity="0.3" />
        <stop offset="1" stopColor="#0369A1" stopOpacity="0.4" />
      </radialGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#playDisc)" stroke="url(#playGrad)" strokeWidth="1.5" />
    <path
      d="M10 8.5L16.5 12L10 15.5V8.5Z"
      fill="#FFFFFF"
      stroke="#38BDF8"
      strokeWidth="0.75"
      strokeLinejoin="round"
    />
    <path d="M6 7C8 5 16 5 18 7" stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

export const LiquidLockIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="lockGrad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38BDF8" />
        <stop offset="1" stopColor="#6366F1" />
      </linearGradient>
    </defs>
    <rect x="4.5" y="10" width="15" height="11.5" rx="3" fill="rgba(56, 189, 248, 0.15)" stroke="url(#lockGrad)" strokeWidth="1.5" />
    <path
      d="M7.5 10V6.5C7.5 4.01472 9.51472 2 12 2C14.4853 2 16.5 4.01472 16.5 6.5V10"
      stroke="url(#lockGrad)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="12" cy="15" r="1.5" fill="#E0F2FE" />
    <path d="M12 16.5V18.5" stroke="#E0F2FE" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
