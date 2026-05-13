import { useRef, useEffect, useState } from 'react';

interface AutoFitTextProps {
  text: string;
  maxFontSize?: number;
  minFontSize?: number;
  className?: string;
  containerRef: React.RefObject<HTMLDivElement>;
}

const AutoFitText = ({ text, maxFontSize = 18, minFontSize = 11, className = '', containerRef }: AutoFitTextProps) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    let size = maxFontSize;
    textEl.style.fontSize = `${size}px`;
    textEl.style.lineHeight = `${size * 1.6}px`;

    // Check if text overflows the container
    const checkOverflow = () => {
      if (!container || !textEl) return false;
      return textEl.scrollHeight > container.clientHeight;
    };

    while (checkOverflow() && size > minFontSize) {
      size -= 0.5;
      textEl.style.fontSize = `${size}px`;
      textEl.style.lineHeight = `${size * 1.55}px`;
    }

    setFontSize(size);
  }, [text, maxFontSize, minFontSize, containerRef]);

  return (
    <p
      ref={textRef}
      className={`font-medium text-center text-foreground ${className}`}
      style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.55}px` }}
    >
      {text}
    </p>
  );
};

export default AutoFitText;
