import { icon } from './icons.js';

let toastContainer = null;

function ensureToastRoot() {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'nutrisense-toast-root';
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.className =
      'fixed bottom-20 left-1/2 -translate-x-1/2 md:translate-x-0 md:bottom-6 md:left-6 z-[90] flex flex-col gap-2.5 max-w-sm w-[calc(100%-2rem)] pointer-events-none';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message, type = 'success') {
  const root = ensureToastRoot();
  const el = document.createElement('div');

  const accent =
    type === 'error'
      ? 'border-red-500/40 bg-white dark:bg-[#17191E] text-red-600 dark:text-red-400'
      : type === 'warning'
      ? 'border-amber-500/40 bg-white dark:bg-[#17191E] text-amber-600 dark:text-amber-400'
      : 'border-zinc-200 dark:border-[#2C3038] bg-white dark:bg-[#17191E] text-zinc-900 dark:text-white';

  const iconName = type === 'error' || type === 'warning' ? 'alert' : 'check';
  const iconColor =
    type === 'error'
      ? 'text-red-500'
      : type === 'warning'
      ? 'text-amber-500'
      : 'text-[#658C0A] dark:text-[#B8F527]';

  el.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg transition-all duration-200 translate-y-1 opacity-0 ${accent}`;
  el.innerHTML = `
    <span class="shrink-0 ${iconColor}">${icon(iconName, 'w-4 h-4')}</span>
    <p class="text-sm font-medium flex-1 leading-snug text-zinc-800 dark:text-zinc-100">${message}</p>
    <button type="button" class="shrink-0 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white" aria-label="Dismiss notification">
      ${icon('x', 'w-4 h-4')}
    </button>
  `;

  root.appendChild(el);
  requestAnimationFrame(() => {
    el.classList.remove('translate-y-1', 'opacity-0');
  });

  const dismiss = () => {
    el.classList.add('opacity-0', 'translate-y-1');
    setTimeout(() => el.remove(), 180);
  };

  el.querySelector('button')?.addEventListener('click', dismiss);
  setTimeout(dismiss, 3600);
}
