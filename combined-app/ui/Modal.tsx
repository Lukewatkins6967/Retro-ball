import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal(props: {
  title: string;
  children: React.ReactNode;
  tone?: 'neutral' | 'danger';
  width?: string;
  maxHeight?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [props]);

  const toneBorder = props.tone === 'danger' ? 'rgba(220,38,38,0.35)' : 'rgba(37,99,235,0.22)';
  const toneGlow = props.tone === 'danger' ? 'rgba(220,38,38,0.12)' : 'rgba(37,99,235,0.10)';

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={() => props.onClose()}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1400,
        background: 'rgba(2,6,23,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        padding: '16px',
      }}
    >
      <div
        className="panelSolid panel"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: props.width ?? 'min(720px, calc(100vw - 24px))',
          maxHeight: props.maxHeight ?? '90vh',
          padding: 12,
          borderRadius: 18,
          border: `1px solid ${toneBorder}`,
          boxShadow: `0 28px 90px ${toneGlow}`,
          transform: 'translateY(0px)',
          animation: 'modalIn 140ms ease-out',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          isolation: 'isolate',
          position: 'relative',
          zIndex: 1401,
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            paddingBottom: 10,
            background: 'rgba(255,255,255,0.96)',
            borderBottom: `1px solid ${toneBorder}`,
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 16 }}>{props.title}</div>
          <button className="btn btnSoft" style={{ padding: '8px 10px' }} onClick={props.onClose} title="Close (Esc)">
            Close
          </button>
        </div>
        <div style={{ marginTop: 10, overflowX: 'hidden', paddingRight: 4 }}>{props.children}</div>
      </div>
      <style>{`
        @keyframes modalIn {
          from { transform: translateY(8px); opacity: 0.86; }
          to { transform: translateY(0px); opacity: 1; }
        }
      `}</style>
    </div>
  );

  return createPortal(modal, document.body);
}
