import { el, button } from './dom';

export interface ModalButton {
  label: string;
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
}

/**
 * Show a modal dialog; closes when any button is clicked. `message` may be a
 * string (rendered as a paragraph) or a prebuilt element for richer content
 * such as the controls reference.
 */
export function showModal(title: string, message: string | HTMLElement, buttons: ModalButton[]): HTMLElement {
  const backdrop = el('div', { className: 'modal-backdrop' });
  const modal = el('div', { className: 'modal' }, [
    el('h2', { text: title }),
    typeof message === 'string' ? el('p', { text: message }) : message,
  ]);
  const row = el('div', { className: 'modal-buttons' });
  for (const b of buttons) {
    const cls = `btn small${b.primary ? ' primary' : ''}${b.danger ? ' danger' : ''}`;
    row.append(
      button(b.label, () => {
        backdrop.remove();
        b.onClick?.();
      }, cls),
    );
  }
  modal.append(row);
  backdrop.append(modal);
  document.body.append(backdrop);
  return backdrop;
}
