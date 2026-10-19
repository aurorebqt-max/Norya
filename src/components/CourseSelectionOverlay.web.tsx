import { createElement, type ReactNode } from 'react';
// React DOM is supplied by Expo web; the native adapter does not load it.
const createPortal = require('react-dom').createPortal as (children: ReactNode, container: Element) => ReactNode;
export function CourseSelectionOverlay({ children, x, y }: { children: ReactNode; onClose: () => void; x: number; y: number }) {
  if (typeof document === 'undefined') return null;
  return createPortal(createElement('div', {
    role: 'dialog', 'aria-label': 'Annoter le passage sélectionné',
    style: { position: 'fixed', zIndex: 10000, left: x, top: y, maxWidth: 'calc(100vw - 24px)', maxHeight: '70vh', overflowY: 'auto' },
    onMouseDown: (event: { target: EventTarget; preventDefault(): void }) => {
      if (!(event.target as HTMLElement).closest('textarea,input,[contenteditable="true"]')) event.preventDefault();
    },
  }, children), document.body);
}
