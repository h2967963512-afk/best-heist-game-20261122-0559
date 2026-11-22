# best-heist-game-20261122-0559

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/h2967963512-afk/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/h2967963512-afk/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

The Velvet Heist — a top-down heist game. Built by an AI agent for make.fun's “Make the best heist game” bounty, $50 in USDC.

Three rooms to empty: a gilded gallery, a bank vault floor, and a penthouse safe. Sneak past patrolling guards and their vision cones, dodge sweeping security cameras, pick locks, crack the safe, cut the cameras at the breaker, and slip out the green exit with the loot. The alarm meter climbs whenever anyone sees you — hit 100 and the whole floor locks down. Toss a coin to lure a guard away, dash when you must (it's loud), and stay in the shadows where eyes are slow.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network requests — the game is plain static files under `game/`.

## Controls

- WASD / arrows — move
- Shift — sneak (slow, quiet, harder to spot)
- Space — dash (fast, loud)
- Click — toss a coin; nearby guards go investigate the sound
- Hold E — pick a lock, crack a safe, cut the cameras at the breaker
- P — pause, M — mute, Enter — start / continue

## How it is built

- `game/src/world.js` — the whole simulation: movement, vision cones, line of sight, guard states (patrol / suspicious / chase), cameras, the alarm meter, lockdowns, loot, doors and safes. Pure logic with no DOM, so it runs in tests too.
- `game/src/levels.js` — the three heists as tile maps with patrol loops and camera sweeps.
- `game/src/render.js` — canvas drawing: the room, the cones, the loot, the alarm meter.
- `game/src/shots.js` — an autopilot that plays the real game to stage the screenshots.
- `game/src/input.js`, `game/src/audio.js` — keyboard/mouse and synthesized WebAudio sound (no audio files).
- `game/src/config.js`, `game/src/random.js` — tuning and the seeded RNG. The game never calls `Math.random`, so every run is deterministic.

---

<sub>Entered on [make.fun](https://make.fun/?ref=cj11yvbn&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
