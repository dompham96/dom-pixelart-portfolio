# Dom Pixel Art — "Tiny Dot" Interactive Exhibition Portfolio

> *"Tiny dot... touch the story"* — Interactive 2D top-down pixel art studio & exhibition gallery by **Dom (Phú Sỹ)**.

## Features
- **Game-like Start Screen (`TitleScreen`)**: Live animated miniature night preview of Dom's studio with `[START GAME]` and `[QUICK GALLERY]`.
- **2D Top-Down House Minigame (`GameEngine`)**: Explore Dom's front yard & exhibition studio, inspect 8 framed series, chat with NPCs (**Mèo Ink**, **Dom**, **Rắn Ăn Tásk**), check the Postcard Merch counter & Contact Mailbox.
  - **Desktop**: `WASD` / Arrow keys + `E` / `Space` / Click-to-walk.
  - **Mobile**: Tap-to-walk (BFS grid pathfinding) + Tap directly on frames/NPCs + toggleable Virtual D-Pad.
- **Quick Gallery & Exhibition Lightbox**: Category filters, nearest-neighbor `image-rendering: pixelated` zoom (`Fit / 2x / 3x`), bilingual **VI / EN** stories, YouTube animation links (*Sai Gon Tales*), and linked A5 Postcard Merchandise.
- **Seasonal Theme System**: Switchable atmosphere (`Cozy Night`, `Trung Thu`, `Mùa Tết`) with particles, seasonal props, and NPC dialogue overrides.
- **Cozy Chiptune/Lofi Web Audio Synth**: Zero-KB procedural BGM & SFX with mute/unmute toggle.

## Quick Commands
```bash
npm install
npm run dev           # Local development server
npm run validate-data # Validate artworks, merch, map & season JSON schemas
npm run typecheck     # Strict TypeScript check
npm run test          # Vitest unit tests
npm run check         # Full CI pipeline (validate + typecheck + test + build)
```

## Multi-Agent Maintenance Workflow
See [`agents/WORKFLOW.md`](./agents/WORKFLOW.md) for the 4-agent workflow connected to Google Drive `Dom web/`.
