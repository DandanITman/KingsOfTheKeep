/** Inline SVG icons for card, upgrade, and HUD glyphs. */

const GOLD = '#e8d9a8';
const BRONZE = '#b08d4f';
const RED = '#c23b2e';
const STEEL = '#3d6f9a';
const ARCANE = '#7ec8a9';
const INK = '#2a2018';

function attrs(extra = ''): string {
  return extra ? ` ${extra}` : '';
}

function svg(body: string): string {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
}

function svgBody(markup: string): string {
  return markup.replace(/^<svg[^>]*>|<\/svg>$/g, '');
}

function group(markup: string, transform: string): string {
  return `<g transform="${transform}">${svgBody(markup)}</g>`;
}

function path(d: string, fill = GOLD, extra = ''): string {
  return `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"${attrs(extra)}/>`;
}

function line(d: string, extra = ''): string {
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"${attrs(extra)}/>`;
}

function rect(x: number, y: number, width: number, height: number, fill = GOLD, extra = ''): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${INK}" stroke-width="1"${attrs(extra)}/>`;
}

function circle(cx: number, cy: number, r: number, fill = GOLD, extra = ''): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="1"${attrs(extra)}/>`;
}

function polygon(points: string, fill = GOLD, extra = ''): string {
  return `<polygon points="${points}" fill="${fill}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"${attrs(extra)}/>`;
}

function shield(mark = '', accent = BRONZE): string {
  return svg(
    path('M12 3 19 6v5c0 4.7-2.8 8.3-7 10-4.2-1.7-7-5.3-7-10V6l7-3Z') +
      path('M12 5v13.4c2.7-1.5 4.5-4 4.6-7.5V7.4L12 5Z', accent) +
      mark,
  );
}

function sword(angle = 0, fill = GOLD): string {
  const blade = path('M12 3 14.1 5.5 12.8 15.2H11.2L9.9 5.5 12 3Z', fill);
  const guard = rect(8, 14.6, 8, 1.8, BRONZE, 'rx="0.8"');
  const grip = rect(11, 16, 2, 4.2, STEEL, 'rx="0.7"');
  const pommel = circle(12, 21, 1.2, BRONZE);
  return angle === 0
    ? svg(blade + guard + grip + pommel)
    : svg(`<g transform="rotate(${angle} 12 12)">${blade + guard + grip + pommel}</g>`);
}

function horseHead(accent = BRONZE, detail = ''): string {
  return svg(
    path('M7 20c1.1-2.8 1.8-5.5 1.4-8.4L6.8 6.2 11.5 8l2.8-3.4c2.8 2.6 3.5 6.4 2 9.4l1.7 4.8H7Z') +
      path('M10.5 9.2c2.3.6 4 2 5.2 4.2l-1 2.2c-1.9-.4-3.7-1.1-5.3-2.4.2-1.4.6-2.7 1.1-4Z', accent) +
      circle(13.7, 10.6, 0.5, INK, 'stroke="none"') +
      line('M8.8 6.8 7 4.5M15.2 5.2l1.6-2') +
      detail,
  );
}

function bowIcon(tall = false, detail = ''): string {
  const d = tall ? 'M16 3c-5 4.1-5 13.9 0 18' : 'M15 5c-4 3.1-4 10.9 0 14';
  const string = tall ? 'M16 3c1.4 5.8 1.4 12.2 0 18' : 'M15 5c1.2 4.6 1.2 9.4 0 14';
  return svg(
    line(d) +
      line(string) +
      path('M4 12h12l-3-2.2v4.4L16 12Z', BRONZE) +
      detail,
  );
}

function bannerIcon(accent = RED, detail = ''): string {
  return svg(
    rect(5, 4, 1.6, 17, BRONZE, 'rx="0.6"') +
      path('M6.6 5h10.2l-2.4 3 2.4 3H6.6V5Z', accent) +
      line('M8.2 7.2h5.8') +
      detail,
  );
}

function keepIcon(accent = BRONZE, detail = ''): string {
  return svg(
    path('M5 20V8h3V5h3v3h2V5h3v3h3v12H5Z') +
      path('M9.5 20v-4.2c0-1.5 1-2.6 2.5-2.6s2.5 1.1 2.5 2.6V20h-5Z', accent) +
      rect(7, 11, 2.2, 2.2, STEEL, 'rx="0.3"') +
      rect(14.8, 11, 2.2, 2.2, STEEL, 'rx="0.3"') +
      detail,
  );
}

function towerIcon(accent = BRONZE, top = ''): string {
  return svg(
    path('M7 21V8h2V5h2v3h2V5h2v3h2v13H7Z') +
      rect(10.2, 15, 3.6, 6, accent, 'rx="0.7"') +
      rect(9, 10.5, 2, 2.1, STEEL, 'rx="0.3"') +
      rect(13, 10.5, 2, 2.1, STEEL, 'rx="0.3"') +
      top,
  );
}

function coinStack(accent = BRONZE, detail = ''): string {
  return svg(
    path('M7 15c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2v3c0 1.2-2.2 2.2-5 2.2s-5-1-5-2.2v-3Z') +
      path('M7 11.5c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2v3.2c0 1.2-2.2 2.2-5 2.2s-5-1-5-2.2v-3.2Z', accent) +
      circle(12, 9.5, 5, GOLD) +
      line('M10.1 9.5h3.8M12 7.6v3.8') +
      detail,
  );
}

function scalesIcon(): string {
  return svg(
    rect(11.2, 4, 1.6, 14.5, BRONZE, 'rx="0.6"') +
      line('M6 8h12M12 5.2 6.8 8 4.6 13M12 5.2 17.2 8l2.2 5') +
      path('M3.5 13h5.2c-.4 1.8-1.2 3-2.6 3s-2.2-1.2-2.6-3Z') +
      path('M15.3 13h5.2c-.4 1.8-1.2 3-2.6 3s-2.2-1.2-2.6-3Z') +
      rect(8.5, 18, 7, 1.8, GOLD, 'rx="0.7"'),
  );
}

function catapultIcon(detail = ''): string {
  return svg(
    line('M5 18h14M7 18 14 8M17 18 14 8') +
      rect(6.5, 15.5, 9, 2.5, BRONZE, 'rx="0.8"') +
      circle(8, 19, 1.7, GOLD) +
      circle(16, 19, 1.7, GOLD) +
      line('M13.8 8.2 19 5') +
      circle(20, 4.5, 1.6, STEEL) +
      detail,
  );
}

function hornIcon(accent = BRONZE, detail = ''): string {
  return svg(
    path('M5 13c4.8-.4 8-2.3 11-6l2.8 9.4c-4.7-1.5-8.7-1.8-13.8-1.1V13Z') +
      path('M4.2 12.4c-1.5.4-2.2 1.8-1.6 3 .5 1 2 1.3 3.2.4l-.8-3.4h-.8Z', accent) +
      line('M17.8 7.4c1.2-.8 2.2-.8 3.1-.1M19 11.2c1.4.1 2.3.7 2.9 1.6') +
      detail,
  );
}

function flameIcon(detail = ''): string {
  return svg(
    path('M12.6 3.5c2.9 3.2.5 5.1 2.9 7.5 1.4 1.4 2.1 2.8 2.1 4.5 0 3.1-2.5 5.5-5.6 5.5s-5.6-2.4-5.6-5.5c0-2.5 1.4-4.5 4.1-6.2-.2 2 1 3 2.1 3.8.9-2.8-1.2-4.8 0-9.6Z', RED) +
      path('M12 13.1c1.5 1.6.8 2.8 1.2 4.1.2.8-.4 1.7-1.3 1.7s-1.8-.8-1.6-1.9c.2-1.1.9-2.1 1.7-3.9Z', GOLD) +
      detail,
  );
}

const UNKNOWN_ICON = shield(
  line('M10.4 9.4c.2-1.5 1.2-2.4 2.6-2.4 1.5 0 2.5.9 2.5 2.2 0 1.8-2 2-2.4 3.6M12.8 16.2v.1', 'stroke-width="1.4"'),
  STEEL,
);

const ICONS: Record<string, string> = {
  // Main-menu navigation: larger, immediately readable silhouettes for the landing screen.
  menuCrown: svg(
    polygon('5,17 6.7,7.5 10.1,11.2 12,4.1 13.9,11.2 17.3,7.5 19,17', GOLD) +
      rect(5.2, 17, 13.6, 3.1, BRONZE, 'rx="0.8"') +
      circle(8.3, 15.3, 0.9, RED) +
      circle(12, 14.8, 1, STEEL) +
      circle(15.7, 15.3, 0.9, RED),
  ),
  menuDeck: svg(
    `<g transform="rotate(-12 10 12)">${rect(5.2, 4.5, 10.6, 14.8, STEEL, 'rx="1"') + rect(6.6, 6, 7.8, 11.8, GOLD, 'rx="0.6"') + polygon('10.5,8.1 11.5,10.3 13.8,10.5 12,12 12.6,14.2 10.5,13 8.4,14.2 9,12 7.2,10.5 9.5,10.3', RED)}</g>` +
      `<g transform="rotate(12 14 12)">${rect(8.5, 4.4, 10.4, 14.8, BRONZE, 'rx="1"') + rect(9.9, 5.9, 7.6, 11.8, STEEL, 'rx="0.6"') + path('M12.2 10.3h3.2M13.8 8.7v6.4', GOLD)}</g>`,
  ),
  menuShop: svg(
    path('M4.8 10.3h12.5l-1.2 8.2H6L4.8 10.3Z', BRONZE) +
      path('M4.8 10.3 7 5.9h8.2l2.1 4.4H4.8Z', GOLD) +
      rect(9.8, 11.2, 2.6, 3.1, GOLD, 'rx="0.5"') +
      circle(17.8, 17.6, 2.2, GOLD) +
      circle(20.1, 19.1, 1.7, BRONZE) +
      line('M17 17.6h1.6M17.8 16.8v1.6'),
  ),
  menuCredits: svg(
    path('M7.3 5.2h9.2c-1.2 1.2-1.2 2.8 0 4v9.2c-3-1.2-6.2-1.2-9.2 0V9.2c1.2-1.2 1.2-2.8 0-4Z', GOLD) +
      path('M7.3 5.2c-1.6 0-2.7-.8-2.7-1.8S5.7 1.6 7.3 1.6M16.5 18.4c1.6 0 2.7.8 2.7 1.8S18.1 22 16.5 22', BRONZE) +
      line('M9.6 11h4.6M9.6 13.7h3.5') +
      path('M16.8 9.4 21 5.2l-1.1 4.1-3.1 3.1-2.1.8.8-2.1 3.1-3.1', STEEL),
  ),
  menuExit: svg(
    path('M5.3 4.5h8.8v15H5.3V4.5Z', BRONZE) +
      path('M7.2 6.3h4.9v11.4H7.2V6.3Z', GOLD) +
      circle(10.6, 12, 0.6, INK, 'stroke="none"') +
      path('M14.8 12h5.4l-2.4-2.4v4.8l2.4-2.4', STEEL) +
      line('M15.1 12h5.4'),
  ),
  // Play-setup controls are kept as SVG so their gold silhouettes stay sharp at every UI scale.
  setupMap: svg(
    path('M4.2 6.2 9.6 4l4.8 2.1L20 4v13.8l-5.6 2.2-4.8-2.1-5.4 2.1V6.2Z', STEEL) +
      line('M9.6 4v13.8M14.4 6.1v13.8') +
      path('M12 7.2c-1.9 0-3.3 1.4-3.3 3.3 0 2.5 3.3 5.8 3.3 5.8s3.3-3.3 3.3-5.8c0-1.9-1.4-3.3-3.3-3.3Z', GOLD) +
      circle(12, 10.5, 0.9, RED),
  ),
  setupPlayerFaction: bannerIcon(BRONZE, polygon('10.2,6.7 12,5.1 13.8,6.7 13.1,8.7 10.9,8.7', GOLD)),
  setupBotFaction: svg(
    rect(5, 4, 1.5, 16, BRONZE, 'rx="0.5"') +
      path('M6.5 5h9.5l-2.2 3 2.2 3H6.5V5Z', STEEL) +
      `<g transform="rotate(-38 15 14)">${path('M15 7 16.4 8.8 15.6 15h-1.2l-.8-6.2L15 7Z') + rect(12.2, 14.6, 5.6, 1.3, BRONZE, 'rx="0.5"')}</g>` +
      `<g transform="rotate(38 15 14)">${path('M15 7 16.4 8.8 15.6 15h-1.2l-.8-6.2L15 7Z') + rect(12.2, 14.6, 5.6, 1.3, BRONZE, 'rx="0.5"')}</g>`,
  ),
  setupHelmet: svg(
    path('M5.4 15.3c.2-6.4 2.8-10 6.6-10s6.4 3.6 6.6 10l-2.3 3.6H7.7l-2.3-3.6Z', BRONZE) +
      path('M12 5.3v10.8M7 12.4h10M9.3 18.9v1.4h5.4v-1.4', STEEL) +
      path('M9.2 15.3h5.6l-1.2 2.2h-3.2l-1.2-2.2Z', GOLD),
  ),
  setupLock: svg(
    rect(6.2, 10, 11.6, 9.2, BRONZE, 'rx="1.2"') +
      path('M8.8 10V7.8c0-2.1 1.3-3.6 3.2-3.6s3.2 1.5 3.2 3.6V10', GOLD) +
      circle(12, 14.3, 1.1, INK) +
      line('M12 15.4v1.6'),
  ),
  setupBook: svg(
    path('M5 5.7c3.1-1.1 5.3-.3 7 1.3 1.7-1.6 3.9-2.4 7-1.3v12.6c-3.1-1.1-5.3-.3-7 1.3-1.7-1.6-3.9-2.4-7-1.3V5.7Z', STEEL) +
      line('M12 7v12.5M7.4 9.7h2.8M7.4 12.2h2.8M13.8 9.7h2.8M13.8 12.2h2.8') +
      polygon('17.4,3.2 18.5,5.8 21.2,6.8 18.5,7.8 17.4,10.5 16.4,7.8 13.7,6.8 16.4,5.8', GOLD),
  ),
  setupChevronLeft: svg(path('M14.6 4.8 8.2 12l6.4 7.2', GOLD, 'stroke-width="1.8"')),
  setupChevronRight: svg(path('M9.4 4.8 15.8 12l-6.4 7.2', GOLD, 'stroke-width="1.8"')),
  setupBack: svg(path('M20 12H7.4l4-4v8l-4-4H20', GOLD) + line('M7.4 12H20')),
  setupSliders: svg(
    line('M4 7h16M4 12h16M4 17h16') +
      circle(9, 7, 1.8, BRONZE) +
      circle(15.5, 12, 1.8, GOLD) +
      circle(7, 17, 1.8, STEEL),
  ),

  // Buildings
  keep: keepIcon(),
  farm: svg(
    path('M5 20c2.5-6.3 5.2-10 7.3-15.5C15.3 9.4 18 13.6 20 20H5Z', BRONZE) +
      line('M12 5v15M8.5 11.2c1.5.2 2.8 1 3.5 2.2M15.5 10.6c-1.5.3-2.7 1.2-3.4 2.6M7.4 15.2c1.8.1 3.5.8 4.6 2.1M16.8 15c-1.9.2-3.4.9-4.8 2.4'),
  ),
  lumber: svg(
    path('M6 17.7c2.3-2.2 3.7-4.8 4.3-7.9l2.7 1c-1 3.3-2.8 6.1-5.4 8.3L6 17.7Z') +
      path('M11.6 4.5 19 8.2l-2.2 3.6-7.4-3.7 2.2-3.6Z', STEEL) +
      line('M5 20h14M14.1 5.8l-2 3.8'),
  ),
  mine: svg(
    path('M5 19c1.4-4 3.6-6.2 7-6.2s5.6 2.2 7 6.2H5Z', BRONZE) +
      line('M7 9.5c2-2.8 5.8-4.7 10.2-4M9.5 5.5l6.6 6.8M15.1 4.8l-1.8 2.8') +
      circle(12, 15.4, 1.1, STEEL),
  ),
  quarry: svg(
    path('M4.5 17.4 8.3 11l5 .8 2 5.6H4.5Z', BRONZE) +
      path('M11 17.4 14.2 8l5.3 4.2-1.8 5.2H11Z') +
      line('M8.1 13.2h4M14.5 11.8l2.6 2.6'),
  ),
  storehouse: svg(
    path('M4.5 20V9.2L12 5l7.5 4.2V20H4.5Z') +
      rect(7, 13.2, 4.2, 4.2, BRONZE, 'rx="0.6"') +
      rect(12.8, 12, 4, 5.4, BRONZE, 'rx="0.6"') +
      line('M4.5 9.2h15M8 15.3h2.2M13.5 14.6h2.6'),
  ),
  house: svg(
    path('M4 12 12 5l8 7h-2v8H6v-8H4Z') +
      rect(10, 14, 4, 6, BRONZE, 'rx="0.7"') +
      rect(7.2, 13, 2.2, 2.2, STEEL, 'rx="0.3"') +
      rect(14.6, 13, 2.2, 2.2, STEEL, 'rx="0.3"'),
  ),
  depot: svg(
    rect(5, 8, 14, 11, BRONZE, 'rx="1"') +
      polygon('5,8 12,4.8 19,8 12,11.2', GOLD) +
      line('M12 11.2V19M8 13.5h2.4M13.6 13.5H16'),
  ),
  market: scalesIcon(),
  yard: svg(
    rect(5, 18, 14, 2, BRONZE, 'rx="0.8"') +
      rect(8, 6, 1.7, 12, GOLD, 'rx="0.5"') +
      line('M9 6h8.5M9 8.2l5-2.2 3.5 2.2M17.5 6v5.8') +
      path('M15.7 11.8h3.6l-.9 2.5h-1.8l-.9-2.5Z', STEEL),
  ),
  barracks: svg(
    `<g transform="rotate(-35 12 12)">${path('M12 3 14 5.3 12.7 16h-1.4L10 5.3 12 3Z') + rect(8.2, 15.3, 7.6, 1.6, BRONZE, 'rx="0.6"')}</g>` +
      `<g transform="rotate(35 12 12)">${path('M12 3 14 5.3 12.7 16h-1.4L10 5.3 12 3Z') + rect(8.2, 15.3, 7.6, 1.6, BRONZE, 'rx="0.6"')}</g>` +
      rect(9.5, 17.5, 5, 2, STEEL, 'rx="0.7"'),
  ),
  range: svg(
    circle(12, 12, 7.5, BRONZE) +
      circle(12, 12, 4.8, GOLD) +
      circle(12, 12, 2, RED) +
      path('M4.3 19.8 19.8 4.3l.8 3.5-3.5-.8', STEEL),
  ),
  stable: horseHead(),
  workshop: svg(
    path('M12 5.2 13.4 7l2.2-.3.8 2 2 1.1-.7 2.1.7 2.1-2 1.1-.8 2-2.2-.3L12 18.8 10.6 17l-2.2.3-.8-2-2-1.1.7-2.1-.7-2.1 2-1.1.8-2 2.2.3L12 5.2Z') +
      circle(12, 12, 2.4, STEEL) +
      line('M5.2 20 9.2 16M7.1 18.2l2.1 2.1'),
  ),
  forge: svg(
    flameIcon().replace(/^<svg[^>]*>|<\/svg>$/g, '') +
      path('M5 20h14l-2-3H7l-2 3Z', BRONZE),
  ),
  blacksmith: svg(
    path('M5 18h12l-2.6-4.8H7.6L5 18Z', BRONZE) +
      path('M10.5 7.2 14 3.7l5.2 5.2-2 2-5.2-5.2', GOLD) +
      rect(6.5, 18, 11, 2, GOLD, 'rx="0.8"') +
      line('M8 13.2h7.2'),
  ),
  academy: svg(
    path('M6 6.5c3.4-1.2 5.2-.4 6 .8 1.3-1.1 3.3-1.8 6-.8v12.2c-2.8-.8-4.8-.3-6 .8-1.2-1.1-3.3-1.6-6-.8V6.5Z') +
      line('M12 7.3v12.2M7.8 10h2.4M7.8 12.8h2.6M13.8 10h2.4M13.8 12.8h2.6') +
      path('M16.8 4.2 20 2.8l-1.4 3.4', RED),
  ),
  woodWall: svg(
    rect(5, 6, 3, 14, BRONZE, 'rx="1"') +
      rect(10.5, 5, 3, 15, GOLD, 'rx="1"') +
      rect(16, 6, 3, 14, BRONZE, 'rx="1"') +
      line('M5.6 9h12.8M5.6 16h12.8M7 6l1-2M12 5l1-2M17 6l1-2'),
  ),
  stoneWall: svg(
    rect(4, 8, 16, 11, BRONZE, 'rx="0.8"') +
      line('M4 11.5h16M4 15h16M8 8v3.5M14 8v3.5M11 11.5V15M17 11.5V15M7 15v4M14 15v4'),
  ),
  gate: svg(
    path('M5 20V9c0-3.2 3.2-5 7-5s7 1.8 7 5v11H5Z') +
      path('M7.5 20V9.7c0-2 2-3.2 4.5-3.2s4.5 1.2 4.5 3.2V20h-9Z', BRONZE) +
      line('M12 6.5V20M8.7 13h2M13.3 13h2'),
  ),
  tower: towerIcon(),
  ballistaTower: towerIcon(BRONZE, line('M5 7.8h14M6.3 5.8 12 9.7l5.7-3.9')),
  fortTower: towerIcon(STEEL, polygon('6.5,8 12,3.5 17.5,8', BRONZE)),
  repair: svg(
    path('M7.5 20 18.8 8.7c.8-.8.9-2 .2-2.9l-2.1 2.1-2.3-2.3 2.1-2.1c-.9-.6-2.1-.6-2.9.2L2.5 15l5 5Z') +
      circle(6.5, 16, 1, STEEL),
  ),
  bell: svg(
    path('M8 17V10c0-2.6 1.5-4.4 4-4.4s4 1.8 4 4.4v7l2 2H6l2-2Z') +
      path('M10 20c.3 1.1 1.1 1.7 2 1.7s1.7-.6 2-1.7h-4Z', BRONZE) +
      line('M12 3.4v2.2M9.5 10.2h5'),
  ),
  guildHall: svg(
    polygon('4,9 12,4 20,9', GOLD) +
      rect(5, 9, 14, 2, BRONZE) +
      rect(6.5, 11, 2.2, 7, GOLD) +
      rect(10.9, 11, 2.2, 7, GOLD) +
      rect(15.3, 11, 2.2, 7, GOLD) +
      rect(4.8, 18, 14.4, 2, BRONZE),
  ),
  bastion: shield(rect(9, 8, 6, 5, STEEL, 'rx="0.6"') + line('M8 13h8M10 8V6M14 8V6'), STEEL),
  cathedral: svg(
    path('M5 20V10.5L12 4l7 6.5V20H5Z') +
      path('M10 20v-5c0-1.4.8-2.4 2-2.4s2 1 2 2.4v5h-4Z', BRONZE) +
      rect(11.2, 5, 1.6, 6, STEEL, 'rx="0.5"') +
      line('M9.6 7.2h4.8M7.4 12.4h2M14.6 12.4h2'),
  ),
  royalStable: horseHead(BRONZE, polygon('10.5,5.5 12,2.8 13.5,5.5 15.5,3.8 15,7.1 10,7.1 9.5,3.8', RED)),

  // Units
  worker: svg(
    path('M7 21v-4c0-2.6 2-4.4 5-4.4s5 1.8 5 4.4v4H7Z') +
      circle(12, 8.7, 3.4, GOLD) +
      path('M8.2 8.2c.4-3 2.1-4.5 3.8-4.5s3.4 1.5 3.8 4.5H8.2Z', BRONZE) +
      line('M6 8.2h12M17 4.5l3 3M19.7 5.7 16.5 9'),
  ),
  cart: svg(
    rect(5, 10, 10.5, 6, BRONZE, 'rx="0.8"') +
      line('M4 8h2l2 8h9M15.5 11.5l4-2') +
      circle(8.2, 18, 1.8, GOLD) +
      circle(15.5, 18, 1.8, GOLD),
  ),
  mason: svg(
    rect(5, 14, 14, 5, BRONZE, 'rx="0.6"') +
      line('M5 16.5h14M9 14v2.5M14 16.5V19') +
      path('M7 10.2 14.5 5l2 2.2-7.7 5-1.8-2Z') +
      rect(14.5, 5.2, 3.8, 2.2, STEEL, 'rx="0.5"'),
  ),
  coin: svg(
    path('M6.5 10.5c0-2.7 2.2-5 5.5-5s5.5 2.3 5.5 5c0 2.2-1.1 4-2.3 5.7L17 20H7l1.8-3.8c-1.2-1.7-2.3-3.5-2.3-5.7Z', BRONZE) +
      circle(12, 10.5, 3, GOLD) +
      line('M10.8 10.5h2.4M12 9.2v2.6'),
  ),
  spear: svg(
    polygon('12,2.8 15.2,8 12.7,9.3 12,21 11.3,9.3 8.8,8', GOLD) +
      line('M12 9.3v11.7M9.5 13.5h5') +
      path('M10.3 8.8h3.4l-1.7 2.4-1.7-2.4Z', BRONZE),
  ),
  sword: sword(),
  shield: shield(line('M8.6 9.5h6.8M9.8 13h4.4')),
  longsword: svg(
    `<g transform="rotate(-36 12 12)">${path('M12 3 14 5.3 12.7 16h-1.4L10 5.3 12 3Z') + rect(8.2, 15.3, 7.6, 1.6, BRONZE, 'rx="0.6"')}</g>` +
      `<g transform="rotate(36 12 12)">${path('M12 3 14 5.3 12.7 16h-1.4L10 5.3 12 3Z') + rect(8.2, 15.3, 7.6, 1.6, BRONZE, 'rx="0.6"')}</g>` +
      circle(12, 18.8, 1.2, STEEL),
  ),
  halberd: svg(
    line('M12 3v18') +
      path('M12 5c4 .7 5.6 3.2 4.7 6.2-1.8-1.3-3.2-2.4-4.7-2.8V5Z') +
      path('M12 7.5 7.5 10.4c1 1.5 2.5 2.2 4.5 2.2V7.5Z', BRONZE) +
      rect(10.9, 17, 2.2, 3.5, STEEL, 'rx="0.6"'),
  ),
  footman: svg(
    path('M7 20v-4.2c0-2 2-3.4 5-3.4s5 1.4 5 3.4V20H7Z', BRONZE) +
      path('M8.2 8.8c.4-3 2-4.7 3.8-4.7s3.4 1.7 3.8 4.7l-1.4 2.7H9.6L8.2 8.8Z') +
      line('M8.8 8.7h6.4M12 4.1v7.4') +
      group(shield('', STEEL), 'translate(13 9) scale(.38)'),
  ),
  champion: svg(
    path('M5 13c0-5 3.2-8.8 7-8.8s7 3.8 7 8.8c0 4.6-2.8 7.2-7 7.2s-7-2.6-7-7.2Z', BRONZE) +
      path('M7 11c-1.6-2.2-1.2-4.3.7-6 .2 2 1.2 3.1 2.5 3.6M17 11c1.6-2.2 1.2-4.3-.7-6-.2 2-1.2 3.1-2.5 3.6') +
      circle(9.6, 12.3, 0.6, INK, 'stroke="none"') +
      circle(14.4, 12.3, 0.6, INK, 'stroke="none"') +
      path('M10 16c1.2 1 2.8 1 4 0', GOLD),
  ),
  banner: bannerIcon(),
  bow: bowIcon(false),
  crossbow: svg(
    line('M5 8c4 2.8 10 2.8 14 0M5 8c1.1 4.7 1.1 7.3 0 12M19 8c-1.1 4.7-1.1 7.3 0 12M4 14h16') +
      rect(10, 10.5, 4, 8, BRONZE, 'rx="0.8"') +
      path('M4 14h10l-2.3-2v4L14 14Z', STEEL),
  ),
  longbow: bowIcon(true, line('M7 8.5c2.2-.8 4.4-.6 6.6.7')),
  pavise: svg(
    path('M6.5 5h8v11c0 2.4-1.6 4.2-4 5-2.4-.8-4-2.6-4-5V5Z') +
      line('M10.5 5v15.8M7.8 10h5.4') +
      line('M12.2 12h8M17.5 9c-2.2 1.8-2.2 4.2 0 6'),
  ),
  arbalest: svg(
    line('M3.8 7.8c4.8 3.4 11.6 3.4 16.4 0M4.2 8c.9 4.6.9 8 0 12M19.8 8c-.9 4.6-.9 8 0 12M3.5 14h17') +
      rect(9, 10, 6, 9.2, BRONZE, 'rx="0.8"') +
      circle(12, 14, 1.5, STEEL),
  ),
  marksman: svg(
    circle(11, 11.5, 6.4, BRONZE) +
      circle(11, 11.5, 3.7, GOLD) +
      circle(11, 11.5, 1.4, RED) +
      path('M14.5 14.8 20 20.3M17.2 15.9l-.1 3.1 3.1-.1', STEEL),
  ),
  scout: horseHead(STEEL, line('M5 20c1.2-1.1 2.4-1.7 3.8-1.8')),
  horseman: horseHead(BRONZE, path('M15.8 8.5 20 5.8M18.6 4.8l2.2 2', STEEL)),
  knight: horseHead(STEEL, path('M9.8 8.2h5.7l-1.2-2.4h-3.8l-.7 2.4Z', BRONZE)),
  lancer: horseHead(BRONZE, line('M15.5 8.5 21 4M19.3 3.8l1.6 1.9')),
  paladin: horseHead(STEEL, polygon('10.3,6.2 12,3.2 13.7,6.2 16.5,5 15.6,8.2 8.4,8.2 7.5,5', GOLD)),
  bannerKnight: horseHead(BRONZE, rect(17, 4, 1, 8, BRONZE) + path('M18 4.5h3.6l-.8 1.8.8 1.8H18V4.5Z', RED)),
  ram: svg(
    rect(5, 12, 14, 4.5, BRONZE, 'rx="1.5"') +
      path('M7 11c.4-2 1.6-3.2 3.8-3.2h2.4c2.2 0 3.4 1.2 3.8 3.2H7Z') +
      path('M19 12.6 21 14.3 19 16.1', STEEL) +
      circle(8, 18.5, 1.6, GOLD) +
      circle(16, 18.5, 1.6, GOLD),
  ),
  catapult: catapultIcon(),
  trebuchet: svg(
    line('M5 20h14M7 20 12 5M17 20 12 5M12 5v11M12 7l6-2M18 5l-1.2 7') +
      circle(16.8, 12.3, 1.6, STEEL) +
      circle(8, 20, 1.3, GOLD) +
      circle(16, 20, 1.3, GOLD),
  ),
  siegeTower: svg(
    path('M7 19V6h10v13H7Z') +
      path('M6 6h12l-1.4-3H7.4L6 6Z', BRONZE) +
      line('M9 9h6M9 12h6M12 6v13') +
      circle(8.5, 20, 1.4, GOLD) +
      circle(15.5, 20, 1.4, GOLD),
  ),
  ballista: svg(
    line('M4 9c4.7 3.1 11.3 3.1 16 0M4 9c1.2 4.8 1.2 7.2 0 11M20 9c-1.2 4.8-1.2 7.2 0 11M4 15h15') +
      path('M10 12h4l1.5 7h-7L10 12Z', BRONZE) +
      path('M3.8 15h10.4l-2.8-2v4l2.8-2Z', STEEL),
  ),
  bombard: svg(
    path('M6 15.5 16.5 10l2.2 4.1L8.2 19.6 6 15.5Z', BRONZE) +
      circle(17.8, 12.1, 2.4, STEEL) +
      circle(8, 19.3, 1.5, GOLD) +
      line('M4.5 20h8M18.8 6.5l1-2.5M20.5 8.2l2-.8M17 5.2l-.8-2'),
  ),

  // Abilities
  rally: hornIcon(),
  arrowRain: svg(
    path('M5 8.6c1.2-2.7 4.1-3.5 6.4-2 1.7-2.6 5.7-1.5 6.1 1.5 2 .2 3.1 1.6 2.8 3.4H4.5c-.6-1 .1-2.4.5-2.9Z', STEEL) +
      path('M7 13l-1.5 5.5M12 13l-1.5 6.5M17 13l-1.5 5.5', GOLD) +
      line('M5.5 18.5l-1-2.2M10.5 19.5l-1-2.2M15.5 18.5l-1-2.2'),
  ),
  decree: svg(
    path('M7 5.5h9.5c1.2 0 2 .8 2 2v11H8.8c-1.8 0-3.3-1.5-3.3-3.3V7c0-.8.7-1.5 1.5-1.5Z') +
      path('M7.2 5.5c1.7.4 2.4 1.4 2.4 3v9.8', BRONZE) +
      line('M11.5 9.5h4M11.5 12.2h4.5') +
      circle(15.5, 16.2, 1.4, RED),
  ),
  trowel: svg(
    path('M4 18.5 14 7.8l2.2 2.2L5.5 20 4 18.5Z', BRONZE) +
      path('M13.7 4.2c3.1.5 5.2 2.3 6.3 5.4-3.2.2-5.6-.8-7.2-3l.9-2.4Z') +
      line('M8.3 15.4 10.2 17.3'),
  ),
  charge: svg(
    path('M5 16.5 13.8 7l2.2 2.2-8.8 9.5H5v-2.2Z') +
      line('M4 7.5h5M3 11h7M14 6l4-2M16.8 3.5l1.7 1.7'),
  ),
  holdLine: shield(line('M5 15h14M7 12h10'), STEEL),
  standard: bannerIcon(RED, line('M17.2 4.2l1.1-2.1M19 7.4h2.2M17.8 10.5l1.8 1.4')),
  castleDoctrine: keepIcon(BRONZE, path('M3.8 16.5h5.4c1 0 1.8.8 1.8 1.8v2.2H5.6c-1 0-1.8-.8-1.8-1.8v-2.2Z', STEEL)),

  // Asian
  monk: svg(
    circle(12, 6.7, 2.6, GOLD) +
      path('M7.5 20c.2-5 1.7-8.5 4.5-10.5 2.8 2 4.3 5.5 4.5 10.5h-9Z', BRONZE) +
      line('M8 15h8M10.2 12.5 7 10M13.8 12.5 17 10'),
  ),
  rocket: svg(
    path('M6.5 17.5C7 11.2 10.3 6.3 16.4 3.2c1.3 6.6-.2 11.5-4.7 14.7l-5.2-.4Z') +
      path('M7 17.2 4 20l.9-4.1M11.8 18l-1.6 3.2 3.9-1.2', RED) +
      circle(14.7, 7.8, 1.6, STEEL),
  ),
  fan: svg(
    path('M5 18c2.4-6.5 5-10.3 7-11.5 2 1.2 4.6 5 7 11.5H5Z') +
      line('M12 6.5V18M8 18l4-11.5M16 18 12 6.5M6.8 14h10.4') +
      circle(12, 18.3, 1.5, BRONZE),
  ),
  pagoda: svg(
    polygon('4,9 12,4 20,9', BRONZE) +
      polygon('5.5,14 12,9.8 18.5,14', GOLD) +
      rect(7.5, 14, 9, 6, BRONZE, 'rx="0.6"') +
      line('M6.5 9h11M8 17h8M12 14v6'),
  ),
  temple: svg(
    polygon('4,8 12,4.8 20,8', RED) +
      rect(5, 8, 14, 2, BRONZE) +
      rect(7, 10, 2.2, 9, GOLD) +
      rect(14.8, 10, 2.2, 9, GOLD) +
      line('M4 19h16M8.1 13.5h7.8'),
  ),
  bamboo: svg(
    rect(7, 4, 3, 16, BRONZE, 'rx="1"') +
      rect(13, 3, 3, 17, GOLD, 'rx="1"') +
      line('M7 8h3M7 13h3M13 7h3M13 12h3M13 17h3') +
      path('M10 10c2.3-2 4.5-2.7 7-2.2M6.5 15c-1.7-1.1-2.4-2.7-2.1-4.8', ARCANE),
  ),
  discipline: svg(
    path('M5 19V5h14L5 19Z') +
      path('M8 16.2V8.5h7.7L8 16.2Z', BRONZE) +
      line('M6.5 17.5h3M8.5 15.5h3M10.5 13.5h3'),
  ),
  fireArrows: svg(
    path('M4 15h14l-3-2.2v4.4L18 15Z', STEEL) +
      path('M6 10h12l-2.4-1.8v3.6L18 10Z') +
      path('M6.5 5.5c1.9 1.6.6 2.8 2 4 .8.6 1.1 1.3 1.1 2 0 1.4-1.1 2.5-2.6 2.5s-2.6-1.1-2.6-2.5c0-1 .5-1.8 1.6-2.5-.1 1 .5 1.4 1.1 1.8.4-1.5-.6-2.5-.6-5.3Z', RED),
  ),
  smoke: svg(
    path('M6 17c-2.2-.4-3.3-2.8-1.7-4.5 1-1 2.3-1 3.4-.4.2-2.5 2.2-4.1 4.7-3.5 1.8.4 2.8 1.7 3.1 3.4 2-.2 3.8 1.2 3.9 3.1.1 2.2-1.7 3.7-4 3.7H6Z', STEEL) +
      line('M8 6c1.9-2 4.6-2.1 6.6-.4M10 3.2c1.7-.8 3.6-.6 5 .5'),
  ),
  dragonRockets: svg(
    path('M5 15c2.4-4.7 5.8-6.9 10-6.5l3-3.5 1.2 4.4c-2.9 3.1-6.9 5-12 5.8L5 15Z', ARCANE) +
      path('M7 15.2 4 19.5l4.3-2M15.5 8.6l4.2 3.8M18.8 12l1.5 3.2', RED) +
      circle(14.6, 9.8, 0.6, INK, 'stroke="none"'),
  ),
  silentMarch: svg(
    path('M7 6h6l1.2 7.4 3.8 2.1V19H8.7C6.4 19 5 17.6 5 15.6h5.2L7 6Z') +
      line('M16.5 6.5c1.7 1.9 1.7 4.1 0 6M19 5c2.2 2.8 2.2 6.2 0 9') +
      line('M5.5 20.5h12'),
  ),
  templeBlessing: svg(
    polygon('5,9 12,5 19,9', GOLD) +
      rect(7, 9, 10, 8, BRONZE) +
      line('M12 3v2M7.2 5.2 8.5 6.8M16.8 5.2 15.5 6.8M4.8 17h14.4') +
      path('M10 13h4M12 11v4', ARCANE),
  ),
  perfectFormation: svg(
    polygon('12,4 16,8 12,12 8,8', ARCANE) +
      polygon('6,12 10,16 6,20 2,16', GOLD) +
      polygon('18,12 22,16 18,20 14,16', GOLD) +
      polygon('12,12 16,16 12,20 8,16', BRONZE),
  ),
  windReposition: svg(
    line('M6 8c3.5-4 10.6-3.1 12.5 2.3M18.5 10.3l-3.4-.3 1.8-2.9M18 16c-3.5 4-10.6 3.1-12.5-2.3M5.5 13.7l3.4.3-1.8 2.9') +
      path('M9 12c1.1-1.4 3.7-1.5 5-.2', ARCANE),
  ),

  // African
  drum: svg(
    path('M7 8c0-1.4 2.2-2.5 5-2.5s5 1.1 5 2.5v8c0 1.4-2.2 2.5-5 2.5s-5-1.1-5-2.5V8Z') +
      path('M7 8c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5', BRONZE) +
      line('M8 11.5 16 16M16 11.5 8 16M5 5l4 2M19 5l-4 2'),
  ),
  elephant: svg(
    path('M4.5 16c0-4.5 3.2-7.4 7.8-7.4h3c2.4 0 4.2 1.8 4.2 4.2v3.7c0 2-1.3 3.5-3.2 3.5H8c-2.1 0-3.5-1.5-3.5-4Z') +
      path('M6.2 11.5c-2.4.5-3.6 2.3-3.2 5.2 1.7.2 2.8-.5 3.2-2.4v-2.8Z', BRONZE) +
      path('M18.6 14c1.8 1 2.5 2.5 1.9 4.5-1.4.2-2.5-.7-3.2-2.4', STEEL) +
      line('M8 20v-3M15 20v-3') +
      circle(16.2, 11.2, 0.5, INK, 'stroke="none"'),
  ),
  rhino: svg(
    path('M4 15.5c1.5-4 5-6.2 10-6.2h3.5l2.5 2.5-3 1.2c-.4 3.5-2.5 5.5-6.5 5.5H6l-2-3Z') +
      polygon('17.5,9.3 21,6.7 19.5,11.6', BRONZE) +
      line('M7 18.5v2M14 18.5v2M8.4 12.4h3.6') +
      circle(16.3, 11.5, 0.5, INK, 'stroke="none"'),
  ),
  zebra: horseHead(GOLD, line('M10.2 9.5h4.6M9.6 12h5.2M10.7 14.2h4.3')),
  sling: svg(
    path('M7 5c4 4.6 4 9.4 0 14M17 5c-4 4.6-4 9.4 0 14', BRONZE) +
      path('M8.8 12c1.9-1.3 4.5-1.3 6.4 0-.6 1.8-1.7 2.8-3.2 2.8s-2.6-1-3.2-2.8Z') +
      circle(18.8, 6.2, 1.4, STEEL),
  ),
  gourd: svg(
    path('M9.5 9.2c-1.9 1.2-3 3.1-3 5.5 0 3.3 2.2 5.8 5.5 5.8s5.5-2.5 5.5-5.8c0-2.4-1.1-4.3-3-5.5 1.1-2.2.1-4.2-2.5-5.7-2.6 1.5-3.6 3.5-2.5 5.7Z') +
      path('M10 9.3h4M9 15c1.8 1 3.9 1 6 0', BRONZE) +
      line('M12 3.5V2.2'),
  ),
  hearth: svg(
    path('M5 19h14l-1.5-3H6.5L5 19Z', BRONZE) +
      flameIcon().replace(/^<svg[^>]*>|<\/svg>$/g, '') +
      line('M7 20h10'),
  ),
  warDrums: svg(
    path('M5 9c0-1.2 1.7-2.1 3.8-2.1s3.8.9 3.8 2.1v7c0 1.2-1.7 2.1-3.8 2.1S5 17.2 5 16V9Z') +
      path('M11.5 9c0-1.2 1.7-2.1 3.8-2.1S19 7.8 19 9v7c0 1.2-1.7 2.1-3.8 2.1s-3.8-.9-3.8-2.1V9Z', BRONZE) +
      line('M6 4.5l4 2M18 4.5l-4 2M6.5 12.5h11'),
  ),
  courage: svg(
    path('M9 20v-6.2c0-1.2.9-2.1 2.1-2.1h.2V7.5c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8V12l1.4-1.4c.8-.8 2.1-.2 2.1.9v2.4c0 3.6-2.3 6.1-5.8 6.1H9Z') +
      line('M9 14H5.5M7 12.2v5.3'),
  ),
  dust: svg(
    path('M5 16.5c1.7-2.8 5-4 9.8-3.5 2.2.2 3.8 1.3 4.7 3.2-2.1 2-5.4 2.8-10 2.4-2.5-.2-4-.9-4.5-2.1Z', BRONZE) +
      line('M4 10c3.6-2.4 7.3-2.7 11-.7M8 6.2c2.8-1.3 5.4-1.2 8 .3M14 10.3c2.3.2 4 .9 5 2.2'),
  ),
  stampede: svg(
    path('M5 14c0-3.1 2.2-5 5.5-5h5.8c1.7 0 3 1.3 3 3v2.2c0 2.4-1.7 4-4.2 4H8c-1.8 0-3-1.8-3-4.2Z') +
      line('M2.5 9.5h4M2 13h3.6M2.8 16.5h4.5M8 18.2v2M15 18.2v2') +
      path('M18.7 13c1.6.7 2.1 1.9 1.5 3.4', BRONZE),
  ),
  sunfire: svg(
    circle(12, 10, 4.1, GOLD) +
      line('M12 2.8v2M12 15.2v2M5 10H3M21 10h-2M7 5l-1.4-1.4M18.4 3.6 17 5') +
      path('M10 13.2c2.2 2.1.7 3.3 2.7 5 .9.8.8 2.1-.6 2.1s-2.6-1-2.6-2.5c0-1.3.5-2.5.5-4.6Z', RED),
  ),
  goldenSurge: svg(
    coinStack(BRONZE).replace(/^<svg[^>]*>|<\/svg>$/g, '') +
      path('M18.5 19V9.5M18.5 9.5 16 12M18.5 9.5 21 12', ARCANE),
  ),
  shieldCircle: svg(
    path('M8 5.2 12 6.8v3c0 2.3-1.5 4.2-4 5.2-2.5-1-4-2.9-4-5.2v-3l4-1.6Z') +
      path('M16 5.2 20 6.8v3c0 2.3-1.5 4.2-4 5.2-2.5-1-4-2.9-4-5.2v-3l4-1.6Z', BRONZE) +
      path('M12 10.2 16 11.8v3c0 2.3-1.5 4.2-4 5.2-2.5-1-4-2.9-4-5.2v-3l4-1.6Z', STEEL),
  ),

  // Middle Eastern
  camel: svg(
    path('M4 16c.4-3.2 2.4-5.5 5.2-5.5 1.4 0 2.2.8 3 2.1.8-2.2 2.2-3.7 4.6-3.7 2 0 3.2 1.2 3.2 3v4.1h-3.4l-1-2.7h-5.9L8.4 16H4Z') +
      path('M18.2 9.1 20.8 5l.8 3.6-2.3 3', BRONZE) +
      line('M7 16v4M16 16v4M10.5 13.4h4.2') +
      circle(19.7, 8.3, 0.5, INK, 'stroke="none"'),
  ),
  scimitar: svg(
    path('M6 18.3c5.8-2.2 10-6.8 12.8-13.5 1.1 5.3-2.4 11-10.4 16.4L6 18.3Z') +
      rect(4.8, 17.2, 5, 1.8, BRONZE, 'rx="0.7"') +
      circle(4.8, 18.1, 1.2, STEEL),
  ),
  dome: svg(
    path('M5 20v-6c0-4.2 3.1-7.2 7-7.2s7 3 7 7.2v6H5Z') +
      path('M8 20v-5.8c0-2.4 1.7-4.2 4-4.2s4 1.8 4 4.2V20H8Z', BRONZE) +
      line('M12 4.2v2.6M10.5 4.2h3M4.5 20h15'),
  ),
  bazaar: svg(
    rect(5, 10, 14, 9, BRONZE, 'rx="0.8"') +
      path('M5 10 7 5h10l2 5H5Z') +
      path('M6 10c0 1.4 1 2.4 2.2 2.4s2.1-1 2.1-2.4c0 1.4 1 2.4 2.2 2.4s2.1-1 2.1-2.4c0 1.4 1 2.4 2.2 2.4S19 11.4 19 10', RED) +
      rect(9.3, 14, 5.4, 5, GOLD, 'rx="0.6"'),
  ),
  minaret: svg(
    path('M8 21V9c0-2.7 1.6-4.4 4-4.4s4 1.7 4 4.4v12H8Z') +
      path('M9 8.3h6l-1.2-3.8h-3.6L9 8.3Z', BRONZE) +
      line('M10 12h4M10 15h4M12 2.2v2.3') +
      path('M15.2 3.3c1.4-1.1 2.8-1 4 .1-1.1.8-2.4.8-4-.1Z', ARCANE),
  ),
  oasis: svg(
    path('M4 18c3.2-2.6 8.4-2.6 16 0-3.6 2.7-9.6 2.7-16 0Z', STEEL) +
      line('M11 18c.1-4.2.7-7.6 1.9-10.2M12.9 7.8c2.6-.9 4.7-.2 6.3 2-2.6.6-4.7-.1-6.3-2ZM12.1 9.2c-2.3-1.9-4.4-2.3-6.4-1.1 1.7 1.8 3.8 2.1 6.4 1.1Z') +
      polygon('11.3,5.2 14,3.2 14.8,6.4', GOLD),
  ),
  sandstorm: svg(
    line('M4 8c4-2.9 8-2.9 12 0 1.7 1.2 3 1.5 4 .8M3.5 13c3.7-2.4 7.5-2.4 11.4 0 2 1.2 3.9 1.4 5.6.5M5.5 18c3-1.4 6-1.4 9 0') +
      path('M15.5 9.2c1.7 1.4 1.8 3.4.2 5.8', BRONZE),
  ),
  bazaarBoom: svg(
    path('M5 11 7 6h10l2 5H5Z', BRONZE) +
      rect(6, 11, 12, 7, GOLD, 'rx="0.8"') +
      circle(9, 19, 1.6, GOLD) +
      circle(13, 19.3, 1.6, BRONZE) +
      path('M18 5.2 19.2 3M19.3 7.2h2.4M18.5 9.3l1.7 1.5', RED),
  ),
  burningOil: svg(
    path('M6 10h12l-1.3 9H7.3L6 10Z', BRONZE) +
      path('M7.4 10c.8-2.4 2.3-3.6 4.6-3.6s3.8 1.2 4.6 3.6H7.4Z') +
      path('M11.8 3.4c1.8 1.7.6 2.6 1.6 3.8.7.8 1 1.5.8 2.3', RED) +
      line('M5 19h14'),
  ),
  desertMarch: svg(
    path('M5 18c2.5-1.5 5.2-1.5 8.2 0 2.1 1 4 1 5.8 0', BRONZE) +
      path('M6 13.5c.5-2.4 2.1-3.8 4.4-3.8 1.1 0 1.8.6 2.4 1.6.6-1.6 1.8-2.6 3.4-2.6 1.5 0 2.5.9 2.5 2.4v3h-2.5l-.7-1.8H9l-.9 1.2H6Z') +
      line('M8.5 14v4M16.5 14v4'),
  ),
  caravan: svg(
    path('M4 15c.5-2.8 2.2-4.6 4.8-4.6 1.2 0 2 .7 2.6 1.8.7-1.9 2-3.1 4.1-3.1 1.8 0 2.9 1.1 2.9 2.8V15H4Z') +
      rect(9.6, 8.7, 4.4, 4, BRONZE, 'rx="0.7"') +
      path('M17.2 9.3 20 5.2l.7 3.4-2.1 2.5', BRONZE) +
      circle(8, 18, 1.5, GOLD) +
      circle(16, 18, 1.5, GOLD),
  ),
  meteor: svg(
    path('M5 18.5C8.8 12 13.6 7.4 19.5 4.6 16.7 10.5 12 15.2 5.5 19l-.5-.5Z', RED) +
      circle(8.2, 16, 3.2, GOLD) +
      line('M14 5.5 20 2.8M16 8.2l4.8-1.1M12 6.8l2.1-4.6'),
  ),
  goldenCommand: svg(
    polygon('7,8 9.8,4 12,8 14.2,4 17,8 16,13H8', GOLD) +
      path('M6.5 14h11v5H6.5v-5Z', BRONZE) +
      rect(4.5, 7, 1.4, 13, BRONZE, 'rx="0.5"') +
      path('M5.9 7.8h4.8l-1 2 1 2H5.9v-4Z', RED),
  ),
  siegeMastery: svg(
    catapultIcon(circle(19.5, 4.2, 1.2, RED)).replace(/^<svg[^>]*>|<\/svg>$/g, '') +
      circle(6, 6, 2.7, GOLD) +
      line('M6 3.3v5.4M3.3 6h5.4'),
  ),

  // Neutral and heroes
  golem: svg(
    path('M6 20V8.5L10.5 4h5L18 8.5V20H6Z', BRONZE) +
      path('M9 10h6v5H9v-5Z', STEEL) +
      circle(10.5, 12.2, 0.6, INK, 'stroke="none"') +
      circle(13.5, 12.2, 0.6, INK, 'stroke="none"') +
      line('M9 17h6M8 8.5h8'),
  ),
  lionDuke: svg(
    path('M5 13c0-5 3.2-8.8 7-8.8s7 3.8 7 8.8c0 4.6-2.8 7.2-7 7.2s-7-2.6-7-7.2Z', BRONZE) +
      path('M8 6.2 6 3.6l3.6 1M16 6.2l2-2.6-3.6 1M9.5 15.5c1.5 1.1 3.5 1.1 5 0') +
      polygon('9.5,4.7 12,2.4 14.5,4.7', GOLD) +
      circle(9.8, 11.5, 0.6, INK, 'stroke="none"') +
      circle(14.2, 11.5, 0.6, INK, 'stroke="none"'),
  ),
  jadeStrategist: svg(
    path('M5 15c2.4-4.7 5.8-6.9 10-6.5l3-3.5 1.2 4.4c-2.9 3.1-6.9 5-12 5.8L5 15Z', ARCANE) +
      path('M5.5 17h8.5c1.3 0 2.2.9 2.2 2.2v1H7.8c-1.3 0-2.3-.9-2.3-2.2v-1Z', GOLD) +
      line('M7.5 19h6.4M14.6 9.8h2.5') +
      circle(14.6, 9.8, 0.6, INK, 'stroke="none"'),
  ),
  sunshieldQueen: shield(
    circle(12, 9.3, 2.5, GOLD) +
      line('M12 5.4v-2M8.9 6.2 7.6 4.6M15.1 6.2l1.3-1.6M9 12.4h6') +
      polygon('8.5,5 12,2.7 15.5,5', RED),
    RED,
  ),
  crescentVizier: svg(
    path('M15.5 4.5c-3.5 1.2-5.6 4.2-5.6 7.7 0 3.6 2.1 6.4 5.6 7.7-5.7.4-9.9-3.1-9.9-7.7s4.2-8.1 9.9-7.7Z', GOLD) +
      path('M13.5 15.8h6c.8 0 1.5.7 1.5 1.5V20h-5.8c-1 0-1.7-.7-1.7-1.7v-2.5Z', BRONZE) +
      line('M15.2 18h3.5'),
  ),

  // Upgrades
  tier2: keepIcon(STEEL, line('M9 4h6')),
  tier3: towerIcon(BRONZE, polygon('5.5,7 12,3 18.5,7', RED)),
  tier4: svg(
    polygon('5,9 8.5,4 12,9 15.5,4 19,9 17.8,18H6.2L5 9Z') +
      rect(6, 18, 12, 2.2, BRONZE, 'rx="0.8"') +
      circle(8.5, 9, 1, RED) +
      circle(12, 9, 1, STEEL) +
      circle(15.5, 9, 1, RED),
  ),
  axe: svg(
    path('M8 20c2.3-2.4 4-5.3 5.1-8.8l2.5 1.1c-1.2 3.8-3.1 6.8-5.8 9L8 20Z') +
      path('M12.4 4.5 20 7.8l-2.2 4.2-7.5-3.3 2.1-4.2Z', STEEL) +
      line('M14.7 5.5 12.8 9.8'),
  ),
  pick: svg(
    line('M6.5 9.5c2.2-3.1 6-4.9 11.5-5.1M10 5.2l6.6 7M15.7 4.5l-1.8 2.8') +
      path('M7 20 13.2 9.8l2 2L9 21.5 7 20Z', BRONZE),
  ),
  gold: svg(
    circle(12, 12, 6.7, GOLD) +
      path('M8.5 15c1.8 1.2 5.2 1.2 7 0M9.5 9.5c1.3-.8 3.7-.8 5 0M12 7.5v9', BRONZE),
  ),
  wall: svg(
    rect(4, 7, 16, 12, BRONZE, 'rx="0.7"') +
      line('M4 11h16M4 15h16M8 7v4M14 7v4M11 11v4M17 11v4M7 15v4M14 15v4'),
  ),
  hammer: svg(
    path('M8 20 18 10l-2-2L6 18l2 2Z') +
      path('M12.5 4.5 16 2.8l5.2 5.2-1.8 3.4-6.9-6.9Z', BRONZE) +
      line('M15.2 5.3 18.7 8.8'),
  ),
  arrow: svg(
    path('M4 12h12.5l-4-4v8l4-4H4Z') +
      line('M16.5 12h3.5M18.2 9.8l2.2 2.2-2.2 2.2'),
  ),
  horseArmor: horseHead(STEEL, path('M9.5 10.2h7.3l-1.2 4.4h-5.9l-.2-4.4Z', BRONZE)),
  lance: svg(
    line('M4 20 19 5') +
      polygon('18.2,3.8 21.2,2.8 20.2,5.8', GOLD) +
      path('M8.5 14.5h3.8l-1.9 3.2-1.9-3.2Z', RED) +
      line('M6.5 17.5 8.5 19.5'),
  ),
  boots: svg(
    path('M7 5h5l.5 8 4.5 2.3V19H8.3C6.3 19 5 17.8 5 16h5.5L7 5Z') +
      path('M13 6h4l.5 6 3.2 1.7V17h-4.5', BRONZE) +
      line('M5 20h15'),
  ),
  formation: svg(
    polygon('12,4 16,8 12,12 8,8', GOLD) +
      polygon('7,13 10.5,16.5 7,20 3.5,16.5', BRONZE) +
      polygon('17,13 20.5,16.5 17,20 13.5,16.5', BRONZE) +
      line('M12 12v3M9.5 15.8h5'),
  ),
  stopCommand: svg(
    path('M7 5h10l2 2v10l-2 2H7l-2-2V7l2-2Z', RED) +
      rect(9, 8, 2.2, 8, GOLD, 'rx="0.6"') +
      rect(12.8, 8, 2.2, 8, GOLD, 'rx="0.6"'),
  ),
  upgradesCommand: svg(
    path('M12 3.5 14.2 7l4.1.8-2.7 3.2.5 4.2L12 13.6l-4.1 1.6.5-4.2-2.7-3.2 4.1-.8L12 3.5Z', ARCANE) +
      path('M12 12.2v8M8.9 17.1 12 20.2l3.1-3.1', GOLD),
  ),
  deleteCommand: svg(
    path('M7 7h10l-.8 13H7.8L7 7Z', RED) +
      rect(6, 5, 12, 2, BRONZE, 'rx="0.6"') +
      rect(10, 3.5, 4, 1.8, GOLD, 'rx="0.5"') +
      line('M10 9.5v7M14 9.5v7'),
  ),
  patrol: svg(
    path('M3.5 12c2.5-4.2 5.3-6.2 8.5-6.2s6 2 8.5 6.2c-2.5 4.2-5.3 6.2-8.5 6.2s-6-2-8.5-6.2Z') +
      circle(12, 12, 3.2, STEEL) +
      line('M18 17.5l2.2 2.2M20.2 17.5v2.2H18'),
  ),
  gears: svg(
    path('M12 4.5 13.2 7l2.7-.4.9 2.6 2.4 1.4-1.5 2.3.3 2.8-2.7.8-1.8 2.1-2.4-1.4-2.4 1.4-1.8-2.1-2.7-.8.3-2.8L3 10.6l2.4-1.4.9-2.6 2.7.4L12 4.5Z') +
      circle(12, 12, 3, STEEL),
  ),
  flank: svg(
    line('M7 17c-2.4-4.3-.1-9.6 4.8-10.7 2.8-.6 5.4.3 7.2 2.4M19 8.7l-3.5-.3 2-2.9') +
      shield('', BRONZE).replace(/^<svg[^>]*>|<\/svg>$/g, '') +
      line('M5.5 18.5 8 16.2 8.1 19.6'),
  ),

  // Resources and HUD roles
  food: svg(
    path('M7.5 15.5c-2.3-2.4-2.2-5.8.1-8.1s5.7-2.4 8.1-.1c2.5 2.4 2.6 5.8.3 8.2s-6 2.5-8.5 0Z') +
      path('M6.6 14.7 3.8 17.5c-.8.8-.8 2.1 0 2.9s2.1.8 2.9 0l2.8-2.8', BRONZE) +
      circle(5.2, 19, 0.9, STEEL) +
      line('M10 9.3c1.2-.8 2.8-.7 4 .2'),
  ),
  wood: svg(
    rect(5, 9, 14, 4.5, BRONZE, 'rx="2.2"') +
      rect(4, 14, 13, 4.5, GOLD, 'rx="2.2"') +
      circle(17, 11.2, 2.2, GOLD) +
      circle(15, 16.2, 2.2, BRONZE) +
      line('M7 11.2h8M6.5 16.2h6.5'),
  ),
  stone: svg(
    path('M5 17.5 7.5 9l6-2 5.5 5.4-2.2 5.1H5Z', BRONZE) +
      path('M8.3 17.5 10 12l5-1.8 2.8 3.1-1.1 4.2H8.3Z') +
      line('M10 12h5.1M8.3 17.5l3.3-5.2'),
  ),
  goldRes: coinStack(),
  influence: svg(
    polygon('12,3.2 14.1,9 20,9.2 15.4,12.9 17,18.8 12,15.6 7,18.8 8.6,12.9 4,9.2 9.9,9', GOLD) +
      line('M6 19c2.1 1.2 4.1 1.6 6 1.2M18 19c-2.1 1.2-4.1 1.6-6 1.2') +
      circle(12, 12, 2.2, ARCANE),
  ),
  command: svg(
    rect(4, 5, 1.5, 15, BRONZE, 'rx="0.5"') +
      path('M5.5 5.5h9.8l-1.9 2.8 1.9 2.8H5.5V5.5Z', RED) +
      circle(9, 16.2, 1.5, GOLD) +
      circle(12, 15.5, 1.8, GOLD) +
      circle(15, 16.2, 1.5, GOLD) +
      line('M8 19h8'),
  ),
  roleInfantry: svg(
    `<g transform="rotate(-35 12 12)">${path('M12 3 14 5.3 12.7 16h-1.4L10 5.3 12 3Z') + rect(8.2, 15.3, 7.6, 1.6, BRONZE, 'rx="0.6"')}</g>` +
      `<g transform="rotate(35 12 12)">${path('M12 3 14 5.3 12.7 16h-1.4L10 5.3 12 3Z') + rect(8.2, 15.3, 7.6, 1.6, BRONZE, 'rx="0.6"')}</g>`,
  ),
  roleRanged: bowIcon(false, path('M4 12h11l-2.5-2v4L15 12Z', STEEL)),
  roleCavalry: horseHead(),
  roleSiege: catapultIcon(),
  roleSupport: bannerIcon(ARCANE, circle(16.6, 14, 1.4, ARCANE)),
  // Flag-mode buttons show the ORDER, not a flag — the flag itself lives on the map.
  flagMarch: svg(
    path('M9.5 4h4.6v7.5H9.5V4Z', STEEL) + // greave
      path('M9.5 11.5h4.6l4.1 3.5c1.1.9.4 2.5-.9 2.5H9.5v-6Z') + // boot
      rect(9.5, 17.4, 8.4, 1.7, BRONZE, 'rx="0.6"') + // sole
      line('M3.8 8.5h3.4M3.2 12h3.8M3.8 15.5h3.4'), // marching dashes
  ),
  flagAssault: svg(
    `<g transform="rotate(-40 12 12)">${rect(11.2, 4.5, 1.6, 14.5, BRONZE, 'rx="0.6"') + path('M12.8 4.8c2.6.3 4.2 1.7 4.8 4.2-1.7 1-3.4 1.3-4.8 1V4.8Z', STEEL)}</g>` +
      `<g transform="rotate(40 12 12)">${rect(11.2, 4.5, 1.6, 14.5, BRONZE, 'rx="0.6"') + path('M11.2 4.8c-2.6.3-4.2 1.7-4.8 4.2 1.7 1 3.4 1.3 4.8 1V4.8Z', STEEL)}</g>`,
  ),
  flagSiege: svg(
    path('M5.5 17.5 8 9l5.8-2.3 5 4.7-1.8 6.1H5.5Z', BRONZE) + // boulder
      path('M8.6 17.5l1.7-5.4 4.5-1.8 2.4 2.3-1.4 4.9H8.6Z') +
      line('M12.2 7l1 4.1-2.3 2.3 1.5 4.1') + // crack
      line('M3.6 6.4 5.7 8.1M20.4 6.6l-1.9 1.7M12.4 3.4l.2 2.2'), // impact sparks
  ),
  flagRally: svg(
    circle(12, 14.6, 2.6, GOLD) +
      polygon('12,3.6 14.4,7.8 9.6,7.8', RED) +
      line('M12 7.8v3.4') +
      polygon('3.6,9 8.3,9.8 5,13.5', RED) +
      line('M6.9 11.4l2.8 1.7') +
      polygon('20.4,9 19,13.5 15.7,9.8', RED) +
      line('M17.1 11.4l-2.8 1.7'),
  ),
  flagHarass: svg(
    path('M7.2 20.5c-2-6.6-.6-11.7 2.9-14.7 1.1-1 2.7-1 3.8 0 3.5 3 4.9 8.1 2.9 14.7l-2.7-.8c1.5-5.2.7-9-1.5-11-.4-.4-.8-.4-1.2 0-2.2 2-3 5.8-1.5 11l-2.7.8Z', STEEL) + // horseshoe
      circle(8.6, 16.2, 0.6, INK, 'stroke="none"') +
      circle(15.4, 16.2, 0.6, INK, 'stroke="none"') +
      line('M2.8 8.8h2.6M2.2 12.4h3M2.8 16h2.6'), // gallop dashes
  ),
  flagDefend: shield(circle(12, 10.8, 2.1, GOLD) + line('M12 13v4.6'), STEEL),
  clearFlags: svg(
    rect(4.4, 4, 1.6, 16.5, BRONZE, 'rx="0.6"') +
      path('M6 5h9.4l-2.2 2.8L15.4 10.6H6V5Z', STEEL) +
      `<path d="M13.6 13.6 20.4 20.4M20.4 13.6l-6.8 6.8" fill="none" stroke="${RED}" stroke-width="2.4" stroke-linecap="round"/>`,
  ),
  emFullAssault: svg(
    polygon('12,3 14.3,9 20.6,6.8 17.4,12 21,17.2 14.6,15.5 12,21 9.4,15.5 3,17.2 6.6,12 3.4,6.8 9.7,9', RED) +
      circle(12, 12, 2.8, GOLD),
  ),
  emHoldKeep: keepIcon(STEEL, group(shield('', RED), 'translate(14 12) scale(.36)')),
  emProtectWorkers: svg(
    shield('', STEEL).replace(/^<svg[^>]*>|<\/svg>$/g, '') +
      circle(12, 9.5, 2, GOLD) +
      path('M9 17v-2.2c0-1.6 1.2-2.6 3-2.6s3 1 3 2.6V17H9Z', BRONZE) +
      line('M8.8 8h6.4'),
  ),
  emRallyArmy: hornIcon(RED, group(bannerIcon(STEEL), 'translate(13 2) scale(.45)')),
  emRepairWalls: svg(
    rect(4, 12, 10, 7, BRONZE, 'rx="0.6"') +
      line('M4 15.5h10M7.5 12v3.5M11 15.5V19') +
      path('M10 8.8 15.5 3.3 20 7.8l-1.5 2.8-6.7-6.7', GOLD) +
      line('M13 5.2 18.2 10.4'),
  ),
  emRetreat: svg(
    rect(5, 4, 1.5, 17, BRONZE, 'rx="0.5"') +
      path('M6.5 5h10.5c-1.2 2-1.2 4 0 6H6.5V5Z') +
      path('M14.5 15H6.8l2.8-2.8M6.8 15l2.8 2.8', STEEL),
  ),
  garrison: svg(
    rect(4, 15, 16, 5, BRONZE, 'rx="0.6"') +
      line('M4 17.5h16M7 15v5M12 15v5M17 15v5') +
      bowIcon(false, line('M7 9h7')).replace(/^<svg[^>]*>|<\/svg>$/g, '') +
      circle(9, 8.4, 1.4, GOLD),
  ),
  dismount: svg(
    rect(4, 15, 16, 5, BRONZE, 'rx="0.6"') +
      line('M4 17.5h16M7 15v5M12 15v5M17 15v5') +
      path('M12 4v8M8.5 9.2 12 12.7l3.5-3.5', STEEL) +
      line('M9 4h6'),
  ),
  houseUp: svg(
    path('M4 13 12 6l8 7h-2v7H6v-7H4Z') +
      rect(10, 15, 4, 5, BRONZE, 'rx="0.7"') +
      path('M12 3v6M9.5 5.5 12 3l2.5 2.5', ARCANE),
  ),
  allocScales: scalesIcon(),

  // Detail card stat icons
  health: svg(
    path('M12 20c-4.6-3-7.5-6.1-7.5-9.4 0-2.4 1.6-4.1 3.8-4.1 1.6 0 2.7.8 3.7 2.2 1-1.4 2.1-2.2 3.7-2.2 2.2 0 3.8 1.7 3.8 4.1 0 3.3-2.9 6.4-7.5 9.4Z', RED),
  ),
  time: svg(
    path('M7 4h10c0 3.3-1.7 5.6-5 7 3.3 1.4 5 3.7 5 7H7c0-3.3 1.7-5.6 5-7-3.3-1.4-5-3.7-5-7Z') +
      line('M6 3h12M6 21h12M9.5 7.2h5M9.5 16.8h5'),
  ),
  cooldown: svg(
    path('M7 4h10c0 2.8-1.4 5-4.2 6.6 3.3 1.4 5 3.8 5 7.4H6.2c0-3.6 1.7-6 5-7.4C8.4 9 7 6.8 7 4Z', BRONZE) +
      line('M6 3h12M6 21h12M18.5 9.5c1.2 2 .9 4.6-.7 6.3M18.2 15.8l-.1-2.9 2.7 1'),
  ),
  footprint: svg(
    line('M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4') +
      rect(8, 8, 8, 8, BRONZE, 'rx="0.8"'),
  ),
  splash: svg(
    polygon('12,3.5 14.1,9.2 20,7.6 16.5,12 20,16.4 14.1,14.8 12,20.5 9.9,14.8 4,16.4 7.5,12 4,7.6 9.9,9.2', RED) +
      circle(12, 12, 2.3, GOLD),
  ),
  heal: svg(
    shield('', ARCANE).replace(/^<svg[^>]*>|<\/svg>$/g, '') +
      rect(10.5, 7.5, 3, 9, GOLD, 'rx="0.6"') +
      rect(7.5, 10.5, 9, 3, GOLD, 'rx="0.6"'),
  ),
  poison: svg(
    path('M7 11c0-3 2.1-5.2 5-5.2s5 2.2 5 5.2c0 2.2-1.1 3.9-2.8 4.8V19H9.8v-3.2C8.1 14.9 7 13.2 7 11Z', STEEL) +
      circle(10.2, 11, 0.8, INK, 'stroke="none"') +
      circle(13.8, 11, 0.8, INK, 'stroke="none"') +
      line('M9 19h6M10 16.2l4 2M14 16.2l-4 2'),
  ),
  income: svg(
    coinStack().replace(/^<svg[^>]*>|<\/svg>$/g, '') +
      path('M18.5 20v-6M16.2 15.8l2.3-2.3 2.3 2.3', ARCANE),
  ),
};

export function icon(key: string): string {
  return ICONS[key] ?? UNKNOWN_ICON;
}

export function registerIcons(defs: Record<string, string>): void {
  Object.assign(ICONS, defs);
}
