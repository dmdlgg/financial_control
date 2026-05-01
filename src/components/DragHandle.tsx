import React from 'react';

interface DragHandleProps {
  className?: string;
}

export const DragHandle: React.FC<DragHandleProps> = ({ className }) => (
  <span className={className} style={{ cursor: 'grab', padding: '0 10px 0 2px', userSelect: 'none', display: 'flex', alignItems: 'center' }} title="Arraste para reordenar">
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="5" cy="6" r="1.3" fill="#94a3b8"/><circle cx="5" cy="10" r="1.3" fill="#94a3b8"/><circle cx="5" cy="14" r="1.3" fill="#94a3b8"/><circle cx="10" cy="6" r="1.3" fill="#94a3b8"/><circle cx="10" cy="10" r="1.3" fill="#94a3b8"/><circle cx="10" cy="14" r="1.3" fill="#94a3b8"/><circle cx="15" cy="6" r="1.3" fill="#94a3b8"/><circle cx="15" cy="10" r="1.3" fill="#94a3b8"/><circle cx="15" cy="14" r="1.3" fill="#94a3b8"/></svg>
  </span>
);
