/** Tiny DOM helpers — the app's "component framework". */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: { className?: string; text?: string; html?: string; title?: string } = {},
  children: (HTMLElement | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs.className) node.className = attrs.className;
  if (attrs.text !== undefined) node.textContent = attrs.text;
  if (attrs.html !== undefined) node.innerHTML = attrs.html;
  if (attrs.title) node.title = attrs.title;
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function button(
  label: string,
  onClick: () => void,
  className = 'btn',
): HTMLButtonElement {
  const b = el('button', { className, text: label });
  b.addEventListener('click', onClick);
  return b;
}

export function selectInput<T extends string>(
  options: { value: T; label: string }[],
  value: T,
  onChange: (v: T) => void,
): HTMLSelectElement {
  const s = document.createElement('select');
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    s.append(o);
  }
  s.value = value;
  s.addEventListener('change', () => onChange(s.value as T));
  return s;
}

export function sliderInput(
  min: number,
  max: number,
  step: number,
  value: number,
  onChange: (v: number) => void,
  format: (v: number) => string = (v) => String(v),
): HTMLElement {
  const wrap = el('span');
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const label = el('span', { className: 'slider-value', text: format(value) });
  input.addEventListener('input', () => {
    const v = Number(input.value);
    label.textContent = format(v);
    onChange(v);
  });
  wrap.append(input, label);
  return wrap;
}

export function formRow(labelText: string, control: HTMLElement): HTMLElement {
  return el('div', { className: 'form-row' }, [el('label', { text: labelText }), control]);
}

export function checkbox(value: boolean, onChange: (v: boolean) => void): HTMLInputElement {
  const c = document.createElement('input');
  c.type = 'checkbox';
  c.checked = value;
  c.addEventListener('change', () => onChange(c.checked));
  return c;
}
