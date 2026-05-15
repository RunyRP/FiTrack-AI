import React from 'react';

interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const WeightLossIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);

export const RecompIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill={color} style={style}>
    <polygon points="27.6,20.6 24,24.2 24,4 22,4 22,24.2 18.4,20.6 17,22 23,28 29,22 "/>
    <polygon points="9,4 3,10 4.4,11.4 8,7.8 8,28 10,28 10,7.8 13.6,11.4 15,10 "/>
  </svg>
);

export const MuscleGainIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={style}>
    <path d="M21.37 36C22.82 30.75 27.89 27 33.73 27.62C39.29 28.21 43.71 32.9 43.99 38.48C44.06 39.95 43.86 41.36 43.43 42.67C43.17 43.47 42.39 44 41.54 44H11.7584C6.71004 44 2.92371 39.3814 3.91377 34.4311L9.99994 4H21.9999L25.9999 11L17.43 17.13L14.9999 14" fill={color}/>
    <path d="M21.37 36C22.82 30.75 27.89 27 33.73 27.62C39.29 28.21 43.71 32.9 43.99 38.48C44.06 39.95 43.86 41.36 43.43 42.67C43.17 43.47 42.39 44 41.54 44H11.7584C6.71004 44 2.92371 39.3814 3.91377 34.4311L9.99994 4H21.9999L25.9999 11L17.43 17.13L14.9999 14" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.4395 17.1299L21.9995 33.9999" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MaintenanceIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
    <path d="M12,20.75a.87.87,0,0,1-.28-.05A14.27,14.27,0,0,1,3.29,6.43a.74.74,0,0,1,.61-.69,27.12,27.12,0,0,0,7.79-2.42.75.75,0,0,1,.62,0A27.12,27.12,0,0,0,20.1,5.74a.74.74,0,0,1,.61.69A14.27,14.27,0,0,1,12.28,20.7.87.87,0,0,1,12,20.75ZM4.76,7.11A12.47,12.47,0,0,0,12,19.18,12.47,12.47,0,0,0,19.24,7.11,27.56,27.56,0,0,1,12,4.82,27.56,27.56,0,0,1,4.76,7.11Z"/>
  </svg>
);

export const CoachIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8" y2="16" />
    <line x1="16" y1="16" x2="16" y2="16" />
  </svg>
);

export const SuccessIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const ErrorIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

export const EmailIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    <rect x="2" y="6" width="20" height="12" rx="2" />
  </svg>
);

export const SyncIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

export const SweepIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="m3 21 18-18" />
    <path d="m15 18 3 3" />
    <path d="m5 8 3-3" />
    <path d="M12 12 8 16" />
    <path d="m16 8-4 4" />
  </svg>
);

export const DropIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5L12 2 8 9.5c-2 1.6-3 3.5-3 5.5a7 7 0 0 0 7 7z" />
  </svg>
);

export const GlassIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M5 2h14" />
    <path d="M17.29 22H6.71C6.04 22 5.5 21.46 5.5 20.79L5 2" />
    <path d="M19 2l-.5 18.79c0 .67-.54 1.21-1.21 1.21H6.71" />
  </svg>
);

export const BottleIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M8 2h8v2H8z" />
    <path d="M10 4v3c0 .6-.4 1-1 1H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-2c-.6 0-1-.4-1-1V4" />
  </svg>
);

export const PlusIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const TrashIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
    <path d="M20 6a1 1 0 0 1 .117 1.993l-.117 .007h-.081l-.919 11a3 3 0 0 1 -2.824 2.995l-.176 .005h-8c-1.598 0 -2.904 -1.249 -2.992 -2.75l-.005 -.167l-.923 -11.083h-.08a1 1 0 0 1 -.117 -1.993l.117 -.007zm-10 4a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0 -1 -1m4 0a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0 -1 -1" />
    <path d="M14 2a2 2 0 0 1 2 2a1 1 0 0 1 -1.993 .117l-.007 -.117h-4l-.007 .117a1 1 0 0 1 -1.993 -.117a2 2 0 0 1 1.85 -1.995l.15 -.005z" />
  </svg>
);

export const CameraIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

export const SearchIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const ArrowRightIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const FireIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color} style={style}>
    <path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16m0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5-.179 1-.25 2 1 3 .625.5 1 1.364 1 2.25C11 14 9.657 15 8 15"/>
  </svg>
);

export const FootprintsIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
    <path d="M4 18.0001H9.5V19.2501C9.5 20.7688 8.26878 22.0001 6.75 22.0001C5.23122 22.0001 4 20.7688 4 19.2501V18.0001ZM8 6.12067C10 6.12067 11 9.00006 11 11.0001C11 12.0001 10.5 13.0001 10 14.5001L9.5 16.0001H4C4 15.0001 3.5 13.5001 3.5 11.0001C3.5 8.50006 5.49783 6.12067 8 6.12067ZM20.054 14.0984L19.8369 15.3294C19.5732 16.8251 18.1468 17.8238 16.6511 17.5601C15.1554 17.2964 14.1567 15.87 14.4205 14.3743L14.6375 13.1433L20.054 14.0984ZM18.1776 1.70488C20.6417 2.13938 22.196 4.82954 21.7619 7.29156C21.3278 9.75358 20.5749 11.144 20.4013 12.1288L14.9848 11.1737L14.7529 9.60967C14.5209 8.04564 14.2022 6.974 14.3758 5.9892C14.7231 4.01958 16.2079 1.35759 18.1776 1.70488Z"/>
  </svg>
);

export const ScaleIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M16.5 5H20.4C20.7314 5 21 5.26863 21 5.6V20.4C21 20.7314 20.7314 21 20.4 21H3.6C3.26863 21 3 20.7314 3 20.4V5.6C3 5.26863 3.26863 5 3.6 5H7.5" />
    <path d="M16.2785 6.3288L16.4836 5.09864C16.4944 5.03333 16.4944 4.96667 16.4836 4.90136L16.2785 3.6712C16.1178 2.70683 15.2834 2 14.3057 2H9.69425C8.71658 2 7.8822 2.70683 7.72147 3.6712L7.51644 4.90136C7.50556 4.96667 7.50556 5.03333 7.51644 5.09864L7.72147 6.3288C7.8822 7.29317 8.71658 8 9.69425 8H14.3057C15.2834 8 16.1178 7.29317 16.2785 6.3288Z" />
    <path d="M12 8L11 5.5" />
  </svg>
);

export const DumbbellIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M7.4 7H4.6C4.26863 7 4 7.26863 4 7.6V16.4C4 16.7314 4.26863 17 4.6 17H7.4C7.73137 17 8 16.7314 8 16.4V7.6C8 7.26863 7.73137 7 7.4 7Z" />
    <path d="M19.4 7H16.6C16.2686 7 16 7.26863 16 7.6V16.4C16 16.7314 16.2686 17 16.6 17H19.4C19.7314 17 20 16.7314 20 16.4V7.6C20 7.26863 19.7314 7 19.4 7Z" />
    <path d="M1 14.4V9.6C1 9.26863 1.26863 9 1.6 9H3.4C3.73137 9 4 9.26863 4 9.6V14.4C4 14.7314 3.73137 15 3.4 15H1.6C1.26863 15 1 14.7314 1 14.4Z" />
    <path d="M23 14.4V9.6C23 9.26863 22.7314 9 22.4 9H20.6C20.2686 9 20 9.26863 20 9.6V14.4C20 14.7314 20.2686 15 20.6 15H22.4C22.7314 15 23 14.7314 23 14.4Z" />
    <path d="M8 12H16" />
  </svg>
);

export const AppleIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
    <path d="M10 2c1 .5 2 2 2 5" />
  </svg>
);

export const LayoutIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);

export const SaveIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M6 4h10l4 4v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2" />
    <path d="M10 14a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M14 4l0 4l-6 0l0 -4" />
  </svg>
);

export const CancelIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M18 6l-12 12" />
    <path d="M6 6l12 12" />
  </svg>
);

export const ResetIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={color} style={style}>
    <path d="M17 9.25a.75.75 0 0 1-1.5 0 3 3 0 0 0-3-3h-6.566l1.123 1.248a.75.75 0 1 1-1.114 1.004l-2.25-2.5a.75.75 0 0 1 .027-1.032l2.25-2.25a.75.75 0 0 1 1.06 1.06l-.97.97h6.44a4.5 4.5 0 0 1 4.5 4.5Z"/>
    <path d="M3 10.75a.75.75 0 0 1 1.5 0 3 3 0 0 0 3 3h6.566l-1.123-1.248a.75.75 0 1 1 1.114-1.004l2.25 2.5a.75.75 0 0 1-.027 1.032l-2.25 2.25a.75.75 0 1 1-1.06-1.06l.97-.97h-6.44a4.5 4.5 0 0 1-4.5-4.5Z"/>
  </svg>
);

export const SavedIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={color} style={style}>
    <polygon points="15.3,5.3 8.5,12.1 5.7,9.3 4.3,10.7 8.5,14.9 16.7,6.7 "/>
  </svg>
);

export const ConnectedIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={color} viewBox="0 0 16 16" style={style}>
    <path fillRule="evenodd" clipRule="evenodd" d="M4.866 5.78s.02 1.675.02 3.125.78 2.229 2.23 2.229h1.75c1.449 0 2.258-.8 2.258-2.25l-.02-3.123-6.238.02ZM3.625 8.876a3.501 3.501 0 0 0 2.625 3.39v1.86c0 .483.392.875.875.875h1.75a.875.875 0 0 0 .875-.875v-1.86a3.501 3.501 0 0 0 2.625-3.39v-3.5A.875.875 0 0 0 11.5 4.5H11V1.625a.625.625 0 1 0-1.25 0V4.5h-3.5V1.625a.625.625 0 1 0-1.25 0V4.5h-.5a.875.875 0 0 0-.875.875v3.5Zm3.886 3.505.994-.005-.005 1.369-.994.005.005-1.369Z" />
  </svg>
);

export const UserIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const CalculatorIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="16" y1="14" x2="16" y2="18" />
    <path d="M16 10h.01" />
    <path d="M12 10h.01" />
    <path d="M8 10h.01" />
    <path d="M12 14h.01" />
    <path d="M8 14h.01" />
    <path d="M12 18h.01" />
    <path d="M8 18h.01" />
  </svg>
);

export const CoffeeIcon = ({ size = 24, color = "currentColor", style }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M17 12H4v4a4 4 0 004 4h5a4 4 0 004-4v-4zm0 0h2a2 2 0 012 2v1a2 2 0 01-2 2h-2m-4-8s1-1 .5-2l-1-2C12 4 13 3 13 3M8.64 9s1-1 .5-2l-1-2c-.5-1 .5-2 .5-2" />
  </svg>
);


