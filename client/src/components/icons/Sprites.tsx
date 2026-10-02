import React from 'react';

export interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export const SpriteDbIcon: React.FC<IconProps> = ({ className = '', size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <ellipse cx="12" cy="6" rx="8" ry="3" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M4 6V12C4 13.66 7.58 15 12 15C16.42 15 20 13.66 20 12V6" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M4 12V18C4 19.66 7.58 21 12 21C16.42 21 20 19.66 20 18V12" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="16" cy="18" r="1.5" fill={color} />
  </svg>
);

export const SpriteTableIcon: React.FC<IconProps> = ({ className = '', size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="4" width="18" height="16" rx="4" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2.5" />
    <line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <line x1="10" y1="10" x2="10" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const SpritePlayIcon: React.FC<IconProps> = ({ className = '', size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M7 4.5V19.5L19 12L7 4.5Z"
      fill={color}
      stroke={color}
      strokeWidth="2.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

export const SpriteSparkleIcon: React.FC<IconProps> = ({ className = '', size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z"
      fill={color}
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="19" cy="5" r="1.5" fill={color} />
    <circle cx="5" cy="18" r="1" fill={color} />
  </svg>
);

export const SpriteCodeIcon: React.FC<IconProps> = ({ className = '', size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M8 7L3 12L8 17" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 7L21 12L16 17" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.5 5L10.5 19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const SpriteLinkIcon: React.FC<IconProps> = ({ className = '', size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M10 13C10.46 13.54 11.03 14 11.69 14.33C12.35 14.65 13.08 14.81 13.81 14.8C14.54 14.78 15.26 14.59 15.9 14.23C16.54 13.87 17.08 13.37 17.48 12.76L19.48 9.76C20.21 8.66 20.35 7.28 19.86 6.05C19.37 4.82 18.3 3.91 17 3.59C15.7 3.27 14.33 3.58 13.3 4.43L11.8 5.68"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M14 11C13.54 10.46 12.97 10 12.31 9.67C11.65 9.35 10.92 9.19 10.19 9.2C9.46 9.22 8.74 9.41 8.1 9.77C7.46 10.13 6.92 10.63 6.52 11.24L4.52 14.24C3.79 15.34 3.65 16.72 4.14 17.95C4.63 19.18 5.7 20.09 7 20.41C8.3 20.73 9.67 20.42 10.7 19.57L12.2 18.32"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export const SpriteGridIcon: React.FC<IconProps> = ({ className = '', size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="7" height="7" rx="2" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2.5" />
    <rect x="14" y="3" width="7" height="7" rx="2" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2.5" />
    <rect x="3" y="14" width="7" height="7" rx="2" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2.5" />
    <rect x="14" y="14" width="7" height="7" rx="2" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2.5" />
  </svg>
);

export const SpriteKeyIcon: React.FC<IconProps> = ({ className = '', size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="8" cy="14" r="5" stroke={color} strokeWidth="2.5" />
    <path d="M12 10L20 2M16 6L18 8M19 3L21 5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SpritePlusIcon: React.FC<IconProps> = ({ className = '', size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 5V19M5 12H19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const SpriteTrashIcon: React.FC<IconProps> = ({ className = '', size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 7H20M10 11V17M14 11V17M5 7L6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19L19 7M9 7V4C9 3.45 9.45 3 10 3H14C14.55 3 15 3.45 15 4V7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SpriteCheckIcon: React.FC<IconProps> = ({ className = '', size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 12L9 17L20 6" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SpriteWarningIcon: React.FC<IconProps> = ({ className = '', size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 3L22 20H2L12 3Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M12 9V14M12 17H12.01" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const SpriteCopyIcon: React.FC<IconProps> = ({ className = '', size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="8" y="8" width="12" height="12" rx="3" stroke={color} strokeWidth="2.5" />
    <path d="M16 8V5C16 3.9 15.1 3 14 3H5C3.9 3 3 3.9 3 5V14C3 15.1 3.9 16 5 16H8" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const SpriteFilterIcon: React.FC<IconProps> = ({ className = '', size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 4H21L14 12.5V19L10 21V12.5L3 4Z" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SpriteRobotAvatar: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <rect x="6" y="8" width="20" height="18" rx="6" fill="#4ECDC4" stroke="#1E293B" strokeWidth="2.5" />
    <circle cx="11" cy="16" r="2.5" fill="#1E293B" />
    <circle cx="21" cy="16" r="2.5" fill="#1E293B" />
    <path d="M13 21C14 22 18 22 19 21" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
    <line x1="16" y1="3" x2="16" y2="8" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="16" cy="3" r="2" fill="#FF6B6B" stroke="#1E293B" strokeWidth="1.5" />
  </svg>
);
