// The three heists. Each level is a 32x18 tile map (tile = 40px, 1280x720):
//
//   #  wall (blocks movement and sight)
//   .  floor
//   s  shadow floor (dark: detection fills much slower here)
//   D  locked door (solid until the thief holds E beside it to pick the lock)
//   P  the thief's entry point
//   X  the exit (locked until the loot quota is met)
//   L  painting, value 150        O  gold, value 200
//   J  gem, value 300             W  diamond, value 800
//   S  safe, value 500 (hold E to crack it)
//   B  breaker (E cuts every camera for 10 seconds)
//
// Guards and cameras are placed in the level objects below, with tile
// coordinates; their patrol loops and sweep arcs are part of the design.

import { LOOT } from './config.js';

const L1_MAP = [
  '################################',
  '#..L....#........#......L......#',
  '#.......#........#.............#',
  '#..P....#...s....#...sB...s....#',
  '#.......D........D.............#',
  '#.......#........#.......L.....#',
  '#..s....#...L....#.............#',
  '#.......#........#......s......#',
  '###.######...D......####.#######',
  '#..........s..........s.......X#',
  '#...s......#......s....#.......#',
  '#..........#...........#.......#',
  '#....L.....D.....s.....D...L...#',
  '#..........#...........#.......#',
  '#...s......#....s......#...s...#',
  '#..........#...........#.......#',
  '#......O...#......J....#.......#',
  '################################',
];

const L2_MAP = [
  '################################',
  '#..L....#......S.....#....L....#',
  '#.......#............#.........#',
  '#..P....#....s...s...#....s....#',
  '#.......D......s.....D.........#',
  '#.......#............#....O....#',
  '#...s...#....L.......#.........#',
  '#.......#............#....s....#',
  '###.######..D.....D....##.######',
  '#.........s.......s...........X#',
  '#....s....#.....s.....#........#',
  '#.........#...........#....B...#',
  '#....O....D....s......D....J...#',
  '#.........#...........#........#',
  '#....s....#....s......#...s....#',
  '#.........#...........#........#',
  '#.....L...#.....O.....#....L...#',
  '################################',
];

const L3_MAP = [
  '################################',
  '#...L...#.....J......#.....L...#',
  '#.......#............#.........#',
  '#..P....#...s....s...#....s....#',
  '#.......D......s.....D.........#',
  '#.......#............#....O....#',
  '#...s...#....L.......#..W.s....#',
  '#.......#............#.........#',
  '###.######..D.....D....##.######',
  '#.........s.......s...........X#',
  '#....s....#.....s.....#........#',
  '#.........#...........#....B...#',
  '#....O....D....s......D....J...#',
  '#.........#...........#........#',
  '#....s....#....s......#...s....#',
  '#.........#...........#........#',
  '#.....S...#.....O.....#....L...#',
  '################################',
];

export const LEVELS = [
  {
    name: 'The Gilded Gallery',
    sub: 'A quiet museum after dark. Lift the paintings, mind the patrols.',
    map: L1_MAP,
    par: 75,
    seed: 101,
    guards: [
      { waypoints: [[2, 2], [6, 2], [6, 6], [2, 6]] },
      { waypoints: [[2, 11], [9, 11], [9, 15], [2, 15]] },
    ],
    cameras: [
      { c: 28, r: 4, base: Math.PI, sweep: 0.7, period: 5 },
    ],
  },
  {
    name: 'The Vault Floor',
    sub: 'A bank vault floor. Crack the safe, cut the cameras, get out rich.',
    map: L2_MAP,
    par: 100,
    seed: 202,
    guards: [
      { waypoints: [[2, 2], [6, 2], [6, 6], [2, 6]] },
      { waypoints: [[23, 2], [28, 2], [28, 6], [23, 6]] },
      { waypoints: [[2, 11], [9, 11], [9, 15], [2, 15]] },
    ],
    cameras: [
      { c: 28, r: 4, base: Math.PI, sweep: 0.7, period: 5 },
      { c: 28, r: 13, base: Math.PI, sweep: 0.8, period: 6 },
    ],
  },
  {
    name: 'The Penthouse Safe',
    sub: 'One diamond, one safe, three cameras. The big one. Do not get seen.',
    map: L3_MAP,
    par: 120,
    seed: 303,
    guards: [
      { waypoints: [[2, 2], [6, 2], [6, 6], [2, 6]] },
      { waypoints: [[23, 2], [28, 2], [28, 6], [23, 6]] },
      { waypoints: [[25, 11], [29, 11], [29, 15], [25, 15]] },
    ],
    cameras: [
      { c: 28, r: 4, base: Math.PI, sweep: 0.7, period: 5 },
      { c: 28, r: 13, base: Math.PI, sweep: 0.8, period: 6 },
      { c: 6, r: 10, base: 0, sweep: 0.8, period: 6 },
    ],
  },
];

/** Loot value by map letter. */
export const LOOT_VALUE = {
  L: LOOT.painting,
  O: LOOT.gold,
  J: LOOT.gem,
  W: LOOT.diamond,
  S: LOOT.safe,
};

/** Human name by map letter, for the HUD and the loot log. */
export const LOOT_NAME = {
  L: 'Painting',
  O: 'Gold bars',
  J: 'Gem',
  W: 'The Star Diamond',
  S: 'Safe contents',
};
