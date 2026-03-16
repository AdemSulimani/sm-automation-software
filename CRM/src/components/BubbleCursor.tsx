import { Send } from 'lucide-react';

export type BubbleCursorPosition = 'left' | 'right';

export interface BubbleCursorProps {
  position: BubbleCursorPosition;
  color: string;
  className?: string;
}


export function BubbleCursor({ position, color, className = '' }: BubbleCursorProps) {
  return (
    <span
      className={`message-bubble-cursor message-bubble-cursor--${position} ${className}`.trim()}
      aria-hidden
    >
      <Send
        size={18}
        strokeWidth={2.5}
        stroke={color}
        fill={color}
        aria-hidden
      />
    </span>
  );
}
