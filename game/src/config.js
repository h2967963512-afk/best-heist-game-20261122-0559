// Every tuning number and colour for The Velvet Heist, in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 165,
  sneakSpeed: 95,
  dashSpeed: 420,
  dashTime: 0.16,
  dashCooldown: 1.1,
  /** Each carried loot item slows the thief by this much, down to the floor. */
  weightPerLoot: 0.045,
  minSpeedFactor: 0.72,
  /** Seconds of holding E to pick a locked door. */
  lockpickTime: 1.2,
  /** Seconds of holding E to crack a safe. */
  safeTime: 2.5,
};

export const LIVES = 3;
export const COINS = 3;

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  suspiciousSpeed: 95,
  chaseSpeed: 148,
  viewRange: 300,
  /** Half-angle of a guard's vision cone, in radians. */
  viewHalfAngle: 0.62,
  /** Detection fills at this rate per second when the thief is dead centre of a cone at close range. */
  detectRate: 1.15,
  /** Below this detection a guard stays calm; above it he grows suspicious. */
  suspectAt: 0.45,
  /** Seconds a suspicious guard stares at the last seen spot before giving up. */
  investigateTime: 2.4,
  /** Seconds a chasing guard keeps the chase after losing sight. */
  chaseMemory: 2.0,
  /** Catching distance, centre to centre. */
  catchRange: 26,
};

export const CAMERA = {
  viewRange: 250,
  viewHalfAngle: 0.5,
  /** Alarm points per second while a camera watches the thief. */
  alarmRate: 26,
  /** Seconds a breaker cut keeps every camera dark. */
  blackoutTime: 10,
  /** Seconds before the breaker can be cut again. */
  breakerCooldown: 18,
};

export const ALARM = {
  max: 100,
  /** Points per second while any guard is chasing or has eyes on the thief. */
  riseRate: 11,
  /** Points per second the alarm cools off while nobody sees the thief. */
  fallRate: 5,
  /** Alarm level that triggers a lockdown. */
  lockdownAt: 100,
  /** Seconds a lockdown lasts; survive it and the alarm drops to this. */
  lockdownTime: 10,
  lockdownReset: 40,
};

export const LOOT = {
  /** Fraction of a level's loot value the thief must carry before the exit opens. */
  quotaFraction: 0.6,
  painting: 150,
  gold: 200,
  gem: 300,
  safe: 500,
  diamond: 800,
};

export const SCORE = {
  clearBonus: 500,
  timeBonusMax: 300,
  ghostBonus: 200,
  /** Points lost from the time bonus per second over par. */
  timePenaltyPerSecond: 4,
};

export const PALETTE = {
  backdrop: '#0d0f16',
  floor: '#232838',
  floorAlt: '#202434',
  shadowFloor: '#151a2c',
  wall: '#3a4157',
  wallTop: '#4a526e',
  door: '#8a6d3b',
  doorOpen: '#5d4a26',
  exit: '#2ecc71',
  exitLocked: '#7a2e2e',
  player: '#f2c94c',
  playerSneak: '#d9a521',
  guard: '#e5534b',
  guardCone: 'rgba(229, 83, 75, 0.20)',
  guardConeSus: 'rgba(242, 153, 74, 0.28)',
  guardConeChase: 'rgba(229, 83, 75, 0.38)',
  camera: '#9b59b6',
  cameraCone: 'rgba(155, 89, 182, 0.20)',
  lootPainting: '#e67e22',
  lootGold: '#f2c94c',
  lootGem: '#4fc3f7',
  lootSafe: '#95a5a6',
  lootDiamond: '#7ef0e0',
  coin: '#f7dc6f',
  alarmLow: '#2ecc71',
  alarmMid: '#f2994a',
  alarmHigh: '#e5534b',
  panel: 'rgba(16, 19, 30, 0.92)',
  panelEdge: '#3a4157',
  text: '#eef1f5',
  muted: '#8b93a3',
  gold: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'velvet-heist.best';
