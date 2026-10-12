import React from 'react';
import StatusBadgeIcon from './StatusBadgeIcon';
import { useTheme } from '../../store/theme';

const Badge = ({ status, children, className = '' }) => {
  const { tStatus } = useTheme();
  const getStatusClass = () => {
    switch (status?.toUpperCase()) {
      case 'ONLINE': return 'bg-[rgba(0,242,254,0.1)] text-[#00d4ff] border-[rgba(0,242,254,0.2)]';
      case 'CRITICAL': return 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border-[rgba(245,158,11,0.2)]';
      case 'OFFLINE': return 'bg-[rgba(255,71,87,0.1)] text-[#ff4757] border-[rgba(255,71,87,0.2)]';
      default: return '';
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-[6px] text-[10px] font-extrabold tracking-wider uppercase border ${getStatusClass()} ${className}`}>
      {status === 'ONLINE' && <span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]" />}
      {children || tStatus(status)}
      <StatusBadgeIcon status={status} />
    </span>
  );
};

export default Badge;
