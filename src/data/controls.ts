/**
 * The player-facing control reference. Kept dependency-free so both the setup
 * screen's Battle Codex and the match HUD can show it without dragging the
 * whole match module graph into their bundles.
 *
 * This is the single source of truth for what the README's control table and
 * the in-game help say — if a binding changes in `MatchHotkeys`, change it here
 * too and both surfaces follow.
 */
export interface ControlBinding {
  keys: string;
  action: string;
}

export const CONTROL_GROUPS: { title: string; bindings: ControlBinding[] }[] = [
  {
    title: 'Camera',
    bindings: [
      { keys: 'WASD / edge scroll', action: 'Move camera' },
      { keys: 'Q / E, middle-drag', action: 'Rotate' },
      { keys: 'Mouse wheel', action: 'Zoom' },
      { keys: 'Space', action: 'Jump to your keep' },
      { keys: '` (backtick)', action: 'Jump to your keep, keeping the selection' },
    ],
  },
  {
    title: 'Selection',
    bindings: [
      { keys: 'Left click / drag', action: 'Select units' },
      { keys: 'Double click', action: 'Select all nearby of that type' },
      { keys: 'Shift + click', action: 'Add to selection' },
      { keys: 'Ctrl + 1-9', action: 'Assign control group' },
      { keys: '1-9', action: 'Recall group (twice to centre on it)' },
      { keys: 'Ctrl + A', action: 'Select your whole army' },
      { keys: '. / ,', action: 'Cycle idle workers' },
    ],
  },
  {
    title: 'Orders',
    bindings: [
      { keys: 'Right click', action: 'Move, attack, gather, build or repair' },
      { keys: 'Shift + right click', action: 'Queue the order after the current one' },
      { keys: 'S', action: 'Stop' },
      { keys: 'H', action: 'Hold position (toggle)' },
    ],
  },
  {
    title: 'Cards & building',
    bindings: [
      { keys: 'Q W E T A D F G Z X C V', action: 'Play the matching card' },
      { keys: 'R', action: 'Rotate the building ghost' },
      { keys: 'Shift on placement', action: 'Keep placing the same building' },
      { keys: 'Esc', action: 'Cancel placement or targeting' },
    ],
  },
];
