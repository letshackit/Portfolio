import { useEffect } from 'react';
import { useUi } from '../app/providers/uiContext';
import { TIMING } from '../config';
import './Toast.css';

/** One polite live region, always mounted so announcements are reliable. Clears itself (FR-39). */
export function Toast() {
  const { toast, showToast } = useUi();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => showToast(null), TIMING.toastVisible);
    return () => window.clearTimeout(timer);
  }, [toast, showToast]);

  return (
    <div className="toast" role="status" aria-live="polite" data-visible={toast ? 'true' : undefined}>
      {toast ? <span className="toast__text mono-value">{toast}</span> : null}
    </div>
  );
}
