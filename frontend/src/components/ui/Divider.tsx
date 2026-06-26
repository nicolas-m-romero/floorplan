// frontend/src/components/ui/Divider.tsx
interface DividerProps {
  strong?: boolean;
  className?: string;
}

export function Divider({ strong = false, className = '' }: DividerProps) {
  return (
    <hr className={`divider ${strong ? 'divider--strong' : ''} ${className}`} />
  );
}
