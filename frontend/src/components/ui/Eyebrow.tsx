// frontend/src/components/ui/Eyebrow.tsx
import React from 'react';

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

export function Eyebrow({ children, className = '' }: EyebrowProps) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}
