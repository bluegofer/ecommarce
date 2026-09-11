'use client';

import { useState, type CSSProperties } from 'react';
import { Modal, Drawer, MiniCart } from '@/components/ui';
import { useToast } from '@/lib/ui/toast-context';

export interface InteractiveDemoProps {
  locale: string;
  labels: {
    openModal: string;
    openDrawer: string;
    showToast: string;
    showErrorToast: string;
    showInfoToast: string;
    modalTitle: string;
    modalBody: string;
    drawerTitle: string;
    drawerBody: string;
    toastTitle: string;
    toastDesc: string;
    cart: string;
    subtotal: string;
    viewCart: string;
    checkout: string;
    empty: string;
  };
}

export function InteractiveDemo({ locale, labels }: InteractiveDemoProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const { show } = useToast();

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <button type="button" style={btnStyle} onClick={() => setModalOpen(true)}>
        {labels.openModal}
      </button>
      <button type="button" style={btnStyle} onClick={() => setDrawerOpen(true)}>
        {labels.openDrawer}
      </button>
      <button
        type="button"
        style={btnStyle}
        onClick={() =>
          show({ kind: 'success', title: labels.toastTitle, description: labels.toastDesc })
        }
      >
        {labels.showToast}
      </button>
      <button
        type="button"
        style={btnStyle}
        onClick={() =>
          show({ kind: 'error', title: 'Error example', description: 'Something went wrong' })
        }
      >
        {labels.showErrorToast}
      </button>
      <button
        type="button"
        style={btnStyle}
        onClick={() =>
          show({ kind: 'info', title: 'Info example', description: 'Neutral informational message' })
        }
      >
        {labels.showInfoToast}
      </button>
      <button type="button" style={btnStyle} onClick={() => setMiniCartOpen((v) => !v)}>
        {miniCartOpen ? 'Close mini-cart' : 'Toggle mini-cart'}
      </button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        ariaLabel={labels.modalTitle}
        title={labels.modalTitle}
        size="form"
      >
        <p style={{ margin: 0, fontFamily: 'var(--sk-font-en)' }}>{labels.modalBody}</p>
      </Modal>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ariaLabel={labels.drawerTitle}
        title={labels.drawerTitle}
        side="right"
        width={400}
      >
        <p style={{ margin: 0, fontFamily: 'var(--sk-font-en)' }}>{labels.drawerBody}</p>
      </Drawer>

      {miniCartOpen ? (
        <div style={{ position: 'relative' }}>
          <MiniCart
            locale={locale}
            labels={{
              title: labels.cart,
              subtotal: labels.subtotal,
              viewCart: labels.viewCart,
              checkout: labels.checkout,
              empty: labels.empty,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

const btnStyle: CSSProperties = {
  height: 36,
  padding: '0 16px',
  border: '1.5px solid var(--sk-brand-300)',
  background: '#FFFFFF',
  color: 'var(--sk-brand-700)',
  borderRadius: 'var(--sk-radius-md)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};