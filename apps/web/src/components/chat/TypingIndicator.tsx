"use client";

interface TypingIndicatorProps {
  /** Display names of users who are typing */
  typingNames: string[];
}

export function TypingIndicator({ typingNames }: TypingIndicatorProps) {
  if (typingNames.length === 0) return null;

  let text: React.ReactNode;
  if (typingNames.length === 1) {
    text = <><strong>{typingNames[0]}</strong> is typing</>;
  } else if (typingNames.length === 2) {
    text = <><strong>{typingNames[0]}</strong> and <strong>{typingNames[1]}</strong> are typing</>;
  } else {
    text = <><strong>{typingNames[0]}</strong> and {typingNames.length - 1} others are typing</>;
  }

  return (
    <div className="pt-typing-indicator">
      <div className="pt-typing">
        <div className="pt-typing-dot" />
        <div className="pt-typing-dot" />
        <div className="pt-typing-dot" />
      </div>
      <span className="pt-typing-text">{text}</span>
    </div>
  );
}
