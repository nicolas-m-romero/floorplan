// frontend/src/components/ui/Badge.tsx
import React from 'react';

type BadgeVariant = 'accent' | 'muted' | 'success' | 'error' | 'warning';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'muted', children, className = '' }: BadgeProps) {
  return (
    <span className={`badge badge--${variant} ${className}`}>
      {children}
    </span>
  );
}
