/** Emoji glyphs for card/upgrade icons, keyed by data `icon` fields. */

const ICONS: Record<string, string> = {
  // Buildings
  keep: '🏰', farm: '🌾', lumber: '🪓', mine: '⛏️', quarry: '🪨', storehouse: '🏚️',
  house: '🏠', depot: '📦', market: '⚖️', yard: '🏗️', barracks: '⚔️', range: '🎯',
  stable: '🐎', workshop: '🛠️', forge: '🔥', blacksmith: '⚒️', academy: '📜',
  woodWall: '🪵', stoneWall: '🧱', gate: '🚪', tower: '🗼', ballistaTower: '🏹',
  fortTower: '🏯', repair: '🔧', bell: '🔔', guildHall: '🏛️', bastion: '🛡️',
  cathedral: '⛪', royalStable: '🐴',
  // Units
  worker: '👷', cart: '🛒', mason: '🧱', coin: '💰', spear: '🔱', sword: '🗡️',
  shield: '🛡️', longsword: '⚔️', halberd: '🪓', footman: '💂', champion: '🦁',
  banner: '🚩', bow: '🏹', crossbow: '🎯', longbow: '🏹', pavise: '🛡️',
  arbalest: '🎯', marksman: '🎯', scout: '🐎', horseman: '🐎', knight: '♞',
  lancer: '🐎', paladin: '✨', bannerKnight: '🚩', ram: '🐏', catapult: '🪨',
  trebuchet: '🏗️', siegeTower: '🗼', ballista: '🏹', bombard: '💣',
  // Abilities
  rally: '📯', arrowRain: '🌧️', decree: '📜', trowel: '🧰', charge: '💨',
  holdLine: '🛡️', standard: '✨', castleDoctrine: '🏰',
  // Upgrades
  tier2: '🏰', tier3: '🏯', tier4: '👑', axe: '🪓', pick: '⛏️', gold: '🪙',
  wall: '🧱', hammer: '🔨', arrow: '➶', horseArmor: '🐴', lance: '🔱',
  boots: '👢', formation: '📐', patrol: '👁️', gears: '⚙️', flank: '↪️',
};

export function icon(key: string): string {
  return ICONS[key] ?? '❔';
}

export function registerIcons(defs: Record<string, string>): void {
  Object.assign(ICONS, defs);
}
