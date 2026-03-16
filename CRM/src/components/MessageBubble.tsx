import type { ReactNode } from 'react';
import { BubbleCursor, type BubbleCursorPosition } from './BubbleCursor';

export interface MessageBubbleProps {
  backgroundColor: string;
  cursorPosition?: BubbleCursorPosition;
  cursorColor?: string;
  children: ReactNode;
  className?: string;
}


export function MessageBubble({
  backgroundColor,
  cursorPosition = 'right',
  cursorColor,
  children,
  className = '',
}: MessageBubbleProps) {
  return (
    <div
      className={`message-bubble ${className}`.trim()}
      style={{ background: backgroundColor }}
    >
      <BubbleCursor position={cursorPosition} color={cursorColor ?? backgroundColor} />
      <span className="message-bubble-content">{children}</span>
    </div>
  );
}
