'use client';

import { useEffect, useRef } from 'react';

interface MarioGameProps {
  onExit: () => void;
  onGameOver?: (score: number) => void;
}

export function MarioGame({ onExit }: MarioGameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Listen for messages from the iframe (e.g., ESC key to exit)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'mario-exit') {
        onExit();
      }
    };

    window.addEventListener('message', handleMessage);

    // Also listen for ESC key in parent window as backup
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus the iframe when loaded
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.onload = () => {
        iframe.contentWindow?.focus();
      };
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onExit]);

  return (
    <div className="flex items-center justify-center h-full w-full bg-black">
      <iframe
        ref={iframeRef}
        src="/mario/index.html"
        className="w-full h-full border-0"
        title="Super Mario Game"
        allow="autoplay"
      />
    </div>
  );
}

export default MarioGame;
