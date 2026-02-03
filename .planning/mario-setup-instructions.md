# Mario Game Setup Instructions

## Current Status

✅ Component structure created (`components/games/mario.tsx`)
✅ Terminal integration complete (commands, lazy loading, UI)
✅ Database schema supports Mario high scores
⏳ Game assets need to be added
⏳ Game logic needs to be implemented

## Next Steps to Complete Integration

### 1. Get Game Assets

Clone or download the super-mario repository:
```bash
cd /tmp
git clone https://github.com/meth-meth-method/super-mario.git
```

### 2. Copy Assets to Project

Copy the following directories from the super-mario repo to your project:

```bash
# From super-mario/public/ to woot/public/mario/
cp -r /tmp/super-mario/public/img public/mario/
cp -r /tmp/super-mario/public/audio public/mario/
cp -r /tmp/super-mario/public/levels public/mario/
cp -r /tmp/super-mario/public/sprites public/mario/
cp -r /tmp/super-mario/public/sounds public/mario/
cp -r /tmp/super-mario/public/music public/mario/
```

### 3. Implement Game Logic

The placeholder in `components/games/mario.tsx` needs to be replaced with actual game logic. You have two options:

#### Option A: Adapt Vanilla JS Game Engine (Recommended)

1. Copy the game engine files from `/tmp/super-mario/public/js/`
2. Convert ES6 modules to work in React context
3. Adapt the asset loading paths to `/mario/` prefix
4. Initialize game in the React component's useEffect

Key files needed:
- `Timer.js` - Game loop
- `Entity.js` - Game entities
- `Level.js` - Level management
- `SpriteSheet.js` - Sprite rendering
- `Camera.js` - Viewport system
- `loaders/*` - Asset loaders
- `entities/*` - Mario, enemies, etc.
- `traits/*` - Behavior system

#### Option B: Find a React-Compatible Mario Game

Search for a Mario clone already built with React/Canvas that's easier to integrate.

### 4. Update Component Implementation

Replace the placeholder game loop in `components/games/mario.tsx` with:

- Asset loading system
- Sprite rendering
- Physics and collision detection
- Entity management (Mario, Goombas, Koopas, etc.)
- Level loading and rendering
- Input handling (arrow keys, space for jump)
- Score tracking
- High score submission

### 5. Add High Score Integration (Optional)

Once the game is working, add high score submission:

```typescript
const submitScore = async (score: number, initials: string) => {
  try {
    const response = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameType: 'mario',
        initials,
        score,
        level: currentLevel
      })
    });

    if (response.ok) {
      console.log('Score submitted!');
    }
  } catch (error) {
    console.error('Failed to submit score:', error);
  }
};
```

### 6. Test the Integration

```bash
npm run dev
```

Navigate to the terminal and type:
```
game mario
```

Verify:
- [ ] Game loads without errors
- [ ] Graphics render correctly
- [ ] Controls work (arrow keys, space)
- [ ] ESC key exits the game
- [ ] Returns to terminal properly
- [ ] High scores submit (if implemented)

## Technical Notes

### Asset Path Configuration

All assets should be loaded with the `/mario/` prefix:
- Images: `/mario/img/sprites.png`
- Audio: `/mario/audio/...`
- Levels: `/mario/levels/1-1.json`
- Sprites: `/mario/sprites/...`

### Canvas Setup

The component uses:
- 256×240 native resolution (NES resolution)
- 2x scaling for better visibility
- `imageSmoothingEnabled = false` for pixel-perfect rendering
- `imageRendering: 'pixelated'` CSS style

### Controls

Standard platformer controls:
- **Arrow Keys**: Move left/right
- **Space**: Jump
- **ESC**: Exit to terminal

### Performance Considerations

- Game loop uses `requestAnimationFrame` for smooth 60 FPS
- Assets should be preloaded before starting game loop
- Sprite batching for efficient rendering
- Collision detection optimized with spatial partitioning

## Resources

- **Original Repo**: https://github.com/meth-meth-method/super-mario (671 stars)
- **Tutorial Series**: [Meth Meth Method on YouTube](https://www.youtube.com/c/MethMethMethod)
- **Documentation**: See integration approach in `.planning/game-integration-approach.md`

## Alternative: Quick Test with Simplified Version

For a quick working demo, you could implement a simplified Mario game:
1. Simple sprite rendering
2. Basic jumping physics
3. Platform collision
4. One test level

This would prove the integration works before investing time in the full game engine.

---

**Created**: 2026-02-02
**Status**: Ready for asset addition and implementation
