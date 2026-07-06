import { el, button } from './dom';

export interface ModalButton {
  label: string;
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
}

/** Show a modal dialog; resolves/closes when any button is clicked. */
export function showModal(title: string, message: string, buttons: ModalButton[]): HTMLElement {
  const backdrop = el('div', { className: 'modal-backdrop' });
  const modal = el('div', { className: 'modal' }, [
    el('h2', { text: title }),
    el('p', { text: message }),
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
