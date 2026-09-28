/**
 * Toast Notification System
 * Lightweight, accessible, non-blocking notifications replacing window.alert.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.showToast = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const TOAST_ICONS = {
    info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`
  };

  /**
   * Displays a toast notification.
   * @param {string} message - Notification text to display.
   * @param {'info'|'warning'|'error'|'success'} [type='info'] - Visual type.
   * @param {number} [duration=3500] - Duration in ms before auto-dismissal. 0 for persistent.
   */
  function showToast(message, type = 'info', duration = 3500) {
    if (!message) return;

    let container = document.getElementById('toastContainer');
    if (container) {
      // Dismiss any existing toasts to avoid stacking
      const existingToasts = container.querySelectorAll('.toast');
      existingToasts.forEach(t => {
        if (!t.classList.contains('toast-hiding')) {
          t.classList.add('toast-hiding');
          t.addEventListener('animationend', () => t.remove(), { once: true });
        }
      });

      // If the same message is already shown, vibrate it instead of creating a new toast
      const existingMessages = container.querySelectorAll('.toast-message');
      for (let i = 0; i < existingMessages.length; i++) {
        if (existingMessages[i].textContent === message) {
          const existingToast = existingMessages[i].closest('.toast');
          if (existingToast) {
            existingToast.classList.remove('toast-vibrate');
            void existingToast.offsetWidth; // trigger reflow
            existingToast.classList.add('toast-vibrate');
          }
          return;
        }
      }
    } else {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const safeType = TOAST_ICONS[type] ? type : 'info';
    toast.className = `toast toast-${safeType}`;
    toast.setAttribute('role', safeType === 'error' || safeType === 'warning' ? 'alert' : 'status');

    toast.innerHTML = `
      <span class="toast-icon">${TOAST_ICONS[safeType]}</span>
      <span class="toast-message">${message}</span>
      <button type="button" class="toast-close" aria-label="Close notification" title="Close">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    let isDismissed = false;
    function dismiss() {
      if (isDismissed) return;
      isDismissed = true;
      toast.classList.add('toast-hiding');
      toast.addEventListener('animationend', () => {
        toast.remove();
        if (container.children.length === 0) {
          container.remove();
        }
      }, { once: true });
    }

    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismiss();
      });
    }

    toast.addEventListener('click', dismiss);

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }

    container.appendChild(toast);
  }

  return showToast;
});
