# Roadmap — Dom Pixel Art Portfolio (Future Phases)

## Phase 2: Cozy Multiplayer / Co-Presence Exhibition
*(Requested & saved on 2026-11-24 for post-art-migration rollout)*

### Concept
Allow multiple visitors exploring Dom's studio house at the same time to see each other's customized `16×32` avatars walking around, inspecting artworks, and sharing lightweight positive interactions without clutter or chat moderation risk.

### Planned Scope
1. **Cozy Presence Layer**:
   - Sync visitor position `(x, y)`, direction (`Facing8`), animation state (`idle | walk | run | interact | jump`), and `CharacterAppearance` JSON via WebSocket (**Supabase Realtime Broadcast/Presence** or **PartyKit / Cloudflare Durable Objects**).
   - Smooth client-side interpolation (~100ms broadcast tick) so movement feels fluid at 60fps.
2. **Safe Pixel Interactions**:
   - Floating pixel emotes above avatars: 👋 Wave, ❤️ Heart, ✨ Sparkle, ☕ Coffee.
   - Subtle indicator when another visitor is currently inspecting a specific artwork frame.
   - Optional moderated **Exhibition Guestbook** (stored in DB) for lasting visitor notes.
3. **Capacity & Resilience**:
   - **Auto-Room Sharding**: Cap each cozy house instance at **15–20 visitors per room** so artworks remain clearly visible; overflow automatically creates Room #2, #3... with an invite-to-room link.
   - **Free-Tier Target**: ~100–200 concurrent visitors across rooms at \$0/mo (upgradeable to 500–2,000+ concurrent during viral spikes for \$5–\$25/mo).
   - **Mandatory Graceful Fallback**: If the realtime relay reaches quota or disconnects, seamlessly fall back to solo exhibition mode so the portfolio never breaks.

## Phase 3: Saigon Town Expansion (`portal-town`)
- Unlock the East Yard gate (`portal-town`) leading into a playable Saigon neighborhood street map with seasonal festival squares (Tết flower street, Trung Thu lantern alley).
