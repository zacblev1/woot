'use client';

import { useEffect, useRef, useState } from 'react';

interface MarioGameProps {
  onExit: () => void;
  onGameOver?: (score: number) => void;
}

export function MarioGame({ onExit, onGameOver }: MarioGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gameInstanceRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Failed to get canvas context');
      return;
    }

    // Initialize Mario game
    const initGame = async () => {
      try {
        // Scale factor for retro look
        const SCALE = 2;
        canvas.width = 256 * SCALE;
        canvas.height = 240 * SCALE;

        // Apply scaling context
        ctx.imageSmoothingEnabled = false;
        ctx.scale(SCALE, SCALE);

        // TODO: Load game assets and initialize
        // This will be where we load sprites, levels, etc.
        // For now, we'll create a placeholder

        setIsLoading(false);

        // Placeholder game loop
        let animationId: number;
        const gameLoop = () => {
          // Clear canvas
          ctx.fillStyle = '#5c94fc';
          ctx.fillRect(0, 0, 256, 240);

          // Draw placeholder text
          ctx.fillStyle = '#fff';
          ctx.font = '16px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('SUPER MARIO', 128, 100);
          ctx.fillText('Game assets loading...', 128, 130);
          ctx.fillText('Press ESC to exit', 128, 160);

          animationId = requestAnimationFrame(gameLoop);
        };

        gameLoop();
        gameInstanceRef.current = { animationId };

      } catch (err) {
        console.error('Failed to initialize Mario game:', err);
        setError('Failed to load game');
        setIsLoading(false);
      }
    };

    initGame();

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
        return;
      }

      // Game controls
      // Arrow keys, Space, etc.
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Handle key releases
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      // Cancel animation frame
      if (gameInstanceRef.current?.animationId) {
        cancelAnimationFrame(gameInstanceRef.current.animationId);
      }
    };
  }, [onExit, onGameOver]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <div className="text-center">
          <p className="text-xl mb-4">{error}</p>
          <p className="text-sm">Press ESC to return</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black">
      {isLoading && (
        <div className="absolute text-green-500 text-xl animate-pulse">
          Loading Mario...
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="border-4 border-green-500 shadow-lg"
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="mt-4 text-green-500 text-sm font-mono">
        Controls: Arrow Keys = Move | Space = Jump | ESC = Exit
      </div>
    </div>
  );
}

export default MarioGame;
