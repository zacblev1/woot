# Game Integration Approach

## Selected Mario Game
**Repository:** [meth-meth-method/super-mario](https://github.com/meth-meth-method/super-mario)
- **Stars:** 671 ⭐
- **License:** MIT (based on repo analysis)
- **Technology:** Vanilla JavaScript with HTML5 Canvas
- **Features:** Well-documented tutorial series, full game engine implementation
- **Status:** Stable codebase (last updated 2020, but functional and complete)

## Standard Game Integration Pattern

Based on existing arcade games (Tron, Pac-Man, Basketball) in the codebase:

### 1. Component Structure
```
components/
├── games/
│   ├── tron.tsx           # Existing
│   ├── pacman.tsx         # Existing
│   ├── basketball.tsx     # Existing
│   └── mario.tsx          # New game goes here
```

### 2. Integration Steps

#### Step 1: Create Game Component
- Create new component in `components/games/[game-name].tsx`
- Implement game using Canvas or React-based approach
- Add TypeScript types for game state
- Include cleanup logic in useEffect for unmounting

#### Step 2: Add Lazy Loading to Terminal
In `components/terminal.tsx`:
```typescript
// Add dynamic import
const MarioGame = dynamic(() => import('./games/mario'), {
  ssr: false,
  loading: () => <div>Loading Mario...</div>
});

// Add command handler
case 'mario':
case 'play mario':
  setActiveGame('mario');
  break;

// Add to game rendering logic
{activeGame === 'mario' && (
  <MarioGame
    onExit={handleGameExit}
    onGameOver={handleMarioGameOver}
  />
)}
```

#### Step 3: Add Database Support (Optional)
If high scores are needed:

1. Update `lib/db/schema.ts` to ensure `gameType` enum includes new game:
```typescript
gameType: text('game_type', {
  enum: ['tron', 'pacman', 'basketball', 'mario']
}).notNull(),
```

2. Create API route handler in `app/api/scores/route.ts` (already supports generic game types)

3. Add high score submission in game component:
```typescript
const submitScore = async (score: number, initials: string) => {
  await fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameType: 'mario',
      initials,
      score,
      level: currentLevel
    })
  });
};
```

#### Step 4: Update Help Command
In `components/terminal.tsx`, add to help text:
```typescript
Available Commands:
...
mario, play mario    - Play Super Mario platformer
```

#### Step 5: Add to Data Files (Optional)
If tracking in collections, add to relevant JSON in `/data/` directory.

### 3. Key Principles

- **Lazy Loading:** Always use Next.js dynamic imports with `ssr: false` for games
- **Canvas Games:** Most arcade games use HTML5 Canvas - wrap in React component with refs
- **Error Handling:** Games should gracefully handle database unavailability
- **Cleanup:** Always cleanup event listeners, intervals, and canvas contexts on unmount
- **Theming:** Games should respect terminal theme if possible (read from parent component)
- **Exit Handler:** All games must provide an exit/quit mechanism (usually ESC key)

### 4. Testing Checklist

- [ ] Game loads without errors
- [ ] Game is playable with keyboard controls
- [ ] Exit mechanism works (returns to terminal)
- [ ] High scores submit successfully (if applicable)
- [ ] Game cleans up resources on unmount (no memory leaks)
- [ ] Works across different browsers
- [ ] Mobile experience considered (touch controls or messaging)

### 5. File Modifications Summary

For each new game integration:
1. **New file:** `components/games/[game-name].tsx`
2. **Modified:** `components/terminal.tsx` (add command + lazy load)
3. **Modified:** `lib/db/schema.ts` (if adding high scores)
4. **Optional:** Update `data/*.json` if tracking in collections

### 6. Performance Considerations

- Games are lazy-loaded to reduce initial bundle size
- Canvas operations should use requestAnimationFrame
- Event listeners should be cleaned up properly
- Consider adding loading states for better UX

## Example Game Component Template

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';

interface GameProps {
  onExit: () => void;
  onGameOver?: (score: number) => void;
}

export default function NewGame({ onExit, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Game initialization logic
    const gameLoop = () => {
      // Game update and render logic
      requestAnimationFrame(gameLoop);
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
        return;
      }
      // Handle game controls
    };

    window.addEventListener('keydown', handleKeyPress);
    gameLoop();

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      // Cancel animation frames, clear intervals, etc.
    };
  }, [onExit]);

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-green-500"
      />
      <div className="text-green-500 mt-2">
        Score: {score} | Press ESC to exit
      </div>
    </div>
  );
}
```

---

**Date Created:** 2026-02-02
**Last Updated:** 2026-02-02
**For Project:** woot (Personal Portfolio with Terminal Interface)
