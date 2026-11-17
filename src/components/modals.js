import { icon } from './icons.js';
import { store } from '../state/store.js';
import { ASSISTANT_QUICK_REPLIES } from '../data/catalog.js';
import { showToast } from './toast.js';
import { supabase } from '../supabaseClient.js';

export function renderModalsAndAssistant(state, ui) {
  return `
    ${renderAuthModal(state, ui)}
    ${renderNotificationsDrawer(state, ui)}
    ${renderFloatingAssistant(state, ui)}
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderAuthModal(state, ui) {
  if (!ui.authModalOpen) return '';
  const isSignup = ui.authModalTab === 'signup';
  const prefillEmail = !isSignup && ui.authPrefillEmail ? escapeHtml(ui.authPrefillEmail) : '';
  const successMessage = !isSignup && ui.authSuccessMessage ? escapeHtml(ui.authSuccessMessage) : '';

  return `
    <div
      id="auth-modal-backdrop"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div class="w-full max-w-md rounded-3xl bg-white dark:bg-[#14161A] border border-zinc-200 dark:border-[#272A32] p-6 sm:p-7 shadow-2xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-modal-title" class="font-display text-2xl font-bold text-zinc-950 dark:text-white">
              ${isSignup ? 'Create NutriSense Account' : 'Welcome Back'}
            </h2>
            <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Sync your nutrition targets, adaptive meal plans, and food logs.
            </p>
          </div>
          <button
            type="button"
            data-action="close-auth"
            aria-label="Close sign in dialog"
            class="w-9 h-9 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-[#1E2127] text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
          >
            ${icon('x', 'w-4 h-4')}
          </button>
        </div>

        <!-- Tabs -->
        <div class="grid grid-cols-2 gap-1 p-1 mt-5 rounded-xl bg-zinc-100 dark:bg-[#1C1E24]">
          <button
            type="button"
            data-auth-tab="login"
            class="py-2 text-xs font-semibold rounded-lg transition-colors ${
              !isSignup
                ? 'bg-white dark:bg-[#282C34] text-zinc-950 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }"
          >
            Sign In
          </button>
          <button
            type="button"
            data-auth-tab="signup"
            class="py-2 text-xs font-semibold rounded-lg transition-colors ${
              isSignup
                ? 'bg-white dark:bg-[#282C34] text-zinc-950 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }"
          >
            Create Account
          </button>
        </div>

        <!-- One-Click Demo Access -->
        <div class="mt-5 p-3.5 rounded-2xl bg-[#B8F527]/12 border border-[#B8F527]/40 flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold text-zinc-900 dark:text-[#B8F527]">Instant Demo Mode</p>
            <p class="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">Preview My Foods with sample history</p>
          </div>
          <button
            type="button"
            data-action="modal-demo-signin"
            class="px-3.5 py-2 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            Demo Sign-in
          </button>
        </div>

        ${
          successMessage
            ? `
          <div
            id="auth-success"
            role="status"
            class="mt-5 p-3.5 rounded-2xl bg-[#B8F527]/12 border border-[#B8F527]/40 text-xs font-medium text-zinc-900 dark:text-[#B8F527] leading-relaxed"
          >
            ${successMessage}
          </div>`
            : ''
        }

        <form id="auth-form" class="mt-5 space-y-4" novalidate>
          ${
            isSignup
              ? `
            <div>
              <label for="auth-name" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Full Name</label>
              <input
                id="auth-name"
                name="name"
                type="text"
                required
                placeholder="Alex Mercer"
                class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D22] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#B8F527]"
              />
            </div>`
              : ''
          }
          <div>
            <label for="auth-email" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email Address</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              required
              value="${prefillEmail}"
              placeholder="you@example.com"
              class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D22] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#B8F527]"
            />
          </div>
          <div>
            <label for="auth-password" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Password</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              required
              minlength="6"
              placeholder="Minimum 6 characters"
              class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D22] border border-zinc-200 dark:border-[#2B2E36] text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#B8F527]"
            />
          </div>
          <button
            type="submit"
            class="w-full py-3 rounded-xl bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 font-semibold text-sm transition-colors"
          >
            ${isSignup ? 'Create Account & Continue' : 'Sign In'}
          </button>
        </form>
        <p id="auth-error" class="hidden mt-3 text-xs font-medium text-red-500" role="alert"></p>
        <p id="auth-notice" class="hidden mt-3 text-xs font-medium text-[#658C0A] dark:text-[#B8F527]" role="status"></p>

        <div class="mt-4 flex items-center gap-3">
          <div class="h-px flex-1 bg-zinc-200 dark:bg-[#272A32]"></div>
          <span class="text-[11px] text-zinc-400">or</span>
          <div class="h-px flex-1 bg-zinc-200 dark:bg-[#272A32]"></div>
        </div>

        <button
          type="button"
          data-action="google-signin"
          class="mt-4 w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-[#2B2E36] bg-zinc-50 dark:bg-[#1A1C21] hover:bg-zinc-100 dark:hover:bg-[#22252C] text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-2.5 transition-colors"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.7 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.6c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.7z"/>
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5H1.2v3.1C3.2 21.4 7.3 24 12 24z"/>
            <path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.2C.4 8.2 0 10.1 0 12s.4 3.8 1.2 5.4l4-3.1z"/>
            <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.2 2.6 1.2 6.6l4 3.1c1-2.9 3.7-4.9 6.8-4.9z"/>
          </svg>
          <span>Continue with Google (Demo)</span>
        </button>
        <p class="mt-3 text-[11px] text-center text-zinc-500 dark:text-zinc-400">
          Simulated local prototype authentication. Data stays in your browser.
        </p>
      </div>
    </div>
  `;
}

function renderNotificationsDrawer(state, ui) {
  if (!ui.notificationsOpen) return '';
  const prefs = state.notificationPrefs;

  const listHtml = state.notifications.length
    ? state.notifications
        .map(
          (n) => `
          <div class="p-3.5 rounded-2xl border ${
            n.read
              ? 'border-zinc-200 dark:border-[#24272F] bg-zinc-50 dark:bg-[#17191E]'
              : 'border-[#B8F527]/40 bg-[#B8F527]/5 dark:bg-[#1B2014]'
          }">
            <div class="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>${n.category} · ${n.timeLabel}</span>
              ${!n.read ? '<span class="text-[11px] font-semibold text-[#658C0A] dark:text-[#B8F527]">New</span>' : ''}
            </div>
            <p class="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">${n.title}</p>
            <p class="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">${n.message}</p>
          </div>
        `
        )
        .join('')
    : '<p class="text-sm text-zinc-500 py-6 text-center">No notifications yet.</p>';

  return `
    <div
      id="notifications-backdrop"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-drawer-title"
    >
      <div class="w-full max-w-md h-full bg-white dark:bg-[#121418] border-l border-zinc-200 dark:border-[#252830] flex flex-col">
        <div class="px-5 py-4 border-b border-zinc-200 dark:border-[#23262E] flex items-center justify-between gap-3">
          <div>
            <h2 id="notif-drawer-title" class="font-display text-lg font-bold text-zinc-950 dark:text-white">Notifications &amp; Reminders</h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">Meal schedules, macro insights &amp; quiet hours</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              data-action="mark-all-read"
              class="text-xs font-semibold text-[#658C0A] dark:text-[#B8F527] hover:underline px-2 py-1"
            >Mark all read</button>
            <button
              type="button"
              data-action="close-notifications"
              aria-label="Close notifications"
              class="w-9 h-9 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-[#1D2026] text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >${icon('x', 'w-4 h-4')}</button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-5 space-y-6">
          <section class="space-y-2.5">
            <h3 class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Recent Feed</h3>
            <div class="space-y-2.5">${listHtml}</div>
          </section>

          <section class="pt-4 border-t border-zinc-200 dark:border-[#23262E] space-y-3.5">
            <h3 class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Notification Preferences</h3>

            <label class="flex items-center justify-between gap-3 cursor-pointer">
              <span class="text-sm text-zinc-800 dark:text-zinc-200">Meal-Time Reminders</span>
              <input type="checkbox" data-pref="mealReminders" ${prefs.mealReminders ? 'checked' : ''} class="w-4 h-4 accent-[#B8F527]" />
            </label>
            <label class="flex items-center justify-between gap-3 cursor-pointer">
              <span class="text-sm text-zinc-800 dark:text-zinc-200">Hydration &amp; Recovery Prompts</span>
              <input type="checkbox" data-pref="hydrationAlerts" ${prefs.hydrationAlerts ? 'checked' : ''} class="w-4 h-4 accent-[#B8F527]" />
            </label>
            <label class="flex items-center justify-between gap-3 cursor-pointer">
              <span class="text-sm text-zinc-800 dark:text-zinc-200">Weekly Nutrition Summary</span>
              <input type="checkbox" data-pref="weeklySummary" ${prefs.weeklySummary ? 'checked' : ''} class="w-4 h-4 accent-[#B8F527]" />
            </label>

            <div class="pt-2 space-y-2">
              <p class="text-xs font-medium text-zinc-600 dark:text-zinc-400">Reminder Schedule</p>
              <div class="grid grid-cols-2 gap-2.5">
                ${Object.entries(prefs.mealTimes)
                  .map(
                    ([slot, val]) => `
                  <label class="text-xs text-zinc-500 dark:text-zinc-400 flex flex-col gap-1">
                    <span>${slot}</span>
                    <input type="time" data-meal-time="${slot}" value="${val}" class="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#1B1D22] border border-zinc-200 dark:border-[#2B2E36] text-zinc-900 dark:text-white font-mono-num text-xs" />
                  </label>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="pt-2 space-y-2.5">
              <label class="flex items-center justify-between gap-3 cursor-pointer">
                <span class="text-sm text-zinc-800 dark:text-zinc-200">Quiet Hours</span>
                <input type="checkbox" data-pref="quietHoursEnabled" ${prefs.quietHoursEnabled ? 'checked' : ''} class="w-4 h-4 accent-[#B8F527]" />
              </label>
              <div class="grid grid-cols-2 gap-2.5 ${prefs.quietHoursEnabled ? '' : 'opacity-45 pointer-events-none'}">
                <label class="text-xs text-zinc-500 dark:text-zinc-400 flex flex-col gap-1">
                  <span>Start</span>
                  <input type="time" data-quiet="quietStart" value="${prefs.quietStart}" class="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#1B1D22] border border-zinc-200 dark:border-[#2B2E36] text-zinc-900 dark:text-white font-mono-num text-xs" />
                </label>
                <label class="text-xs text-zinc-500 dark:text-zinc-400 flex flex-col gap-1">
                  <span>End</span>
                  <input type="time" data-quiet="quietEnd" value="${prefs.quietEnd}" class="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#1B1D22] border border-zinc-200 dark:border-[#2B2E36] text-zinc-900 dark:text-white font-mono-num text-xs" />
                </label>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

function renderFloatingAssistant(state, ui) {
  const chatMessages = state.chatHistory
    .map(
      (msg) => `
      <div class="flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}">
        <div class="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
          msg.role === 'user'
            ? 'bg-[#B8F527] text-zinc-950 font-medium rounded-br-sm'
            : 'bg-zinc-100 dark:bg-[#1E2127] text-zinc-800 dark:text-zinc-200 rounded-bl-sm'
        }">
          ${msg.text}
        </div>
        <span class="mt-1 text-[10px] text-zinc-400">${msg.timeLabel}</span>
      </div>
    `
    )
    .join('');

  const typingHtml = ui.chatTyping
    ? `
      <div class="flex items-start">
        <div class="px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-[#1E2127] text-zinc-500 dark:text-zinc-400 text-xs flex items-center gap-1.5">
          <span>Thinking</span>
          <span class="inline-flex gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style="animation-delay:0.12s"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style="animation-delay:0.24s"></span>
          </span>
        </div>
      </div>
    `
    : '';

  return `
    <div class="fixed bottom-[76px] md:bottom-6 right-4 md:right-6 z-40 flex flex-col items-end gap-3">
      ${
        ui.chatOpen
          ? `
        <div
          id="assistant-panel"
          class="w-[calc(100vw-2rem)] sm:w-96 max-h-[72vh] rounded-3xl bg-white dark:bg-[#14161A] border border-zinc-200 dark:border-[#282B33] shadow-2xl flex flex-col overflow-hidden"
          role="dialog"
          aria-label="NutriSense AI Nutrition Assistant"
        >
          <div class="px-4 py-3.5 bg-zinc-50 dark:bg-[#191C22] border-b border-zinc-200 dark:border-[#262932] flex items-center justify-between gap-3">
            <div>
              <h3 class="font-display text-sm font-bold text-zinc-950 dark:text-white">Nutrition Assistant</h3>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400">Informational guidance · Not medical advice</p>
            </div>
            <button
              type="button"
              data-action="close-chat"
              aria-label="Close nutrition assistant"
              class="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-200/70 dark:bg-[#242830] text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
            >${icon('x', 'w-4 h-4')}</button>
          </div>

          <div id="chat-scroll-body" class="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[340px]">
            ${chatMessages}
            ${typingHtml}
          </div>

          <!-- Quick Replies -->
          <div class="px-4 py-2 border-t border-zinc-200 dark:border-[#23262E] flex gap-1.5 overflow-x-auto">
            ${ASSISTANT_QUICK_REPLIES.map(
              (q) => `
              <button
                type="button"
                data-quick-reply="${q.replace(/"/g, '&quot;')}"
                class="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#1D2026] hover:bg-zinc-200 dark:hover:bg-[#262A32] text-[11px] font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap shrink-0 transition-colors"
              >${q}</button>
            `
            ).join('')}
          </div>

          <form id="assistant-form" class="p-3 border-t border-zinc-200 dark:border-[#23262E] flex items-center gap-2">
            <label for="assistant-input" class="sr-only">Ask a nutrition question</label>
            <input
              id="assistant-input"
              type="text"
              placeholder="Ask about macros, illness foods..."
              class="flex-1 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-[#1C1F25] border border-zinc-200 dark:border-[#2B2E36] text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#B8F527]"
            />
            <button
              type="submit"
              aria-label="Send message"
              class="w-9 h-9 rounded-xl bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 flex items-center justify-center shrink-0 transition-colors"
            >${icon('send', 'w-4 h-4')}</button>
          </form>
        </div>
      `
          : ''
      }

      <button
        type="button"
        data-action="toggle-chat"
        aria-label="${ui.chatOpen ? 'Minimize nutrition assistant' : 'Open nutrition assistant'}"
        class="h-11 px-3.5 sm:px-4 rounded-full bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 font-semibold text-xs shadow-xl ring-4 ring-zinc-50 dark:ring-[#090A0C] flex items-center gap-2 transition-transform active:scale-95"
      >
        ${icon('message', 'w-4 h-4')}
        <span class="hidden sm:inline">Ask Nutrition AI</span>
      </button>
    </div>
  `;
}

export function bindModalsAndAssistantEvents(root) {
  const closeAuth = () => {
    store.setUI({ authModalOpen: false, authPrefillEmail: '', authSuccessMessage: '' });
    if (window.location.pathname === '/login') {
      window.history.replaceState(null, '', '/');
    }
  };

  root.querySelectorAll('[data-action="close-auth"]').forEach((el) =>
    el.addEventListener('click', closeAuth)
  );
  root.querySelector('#auth-modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal-backdrop') closeAuth();
  });
  root.querySelectorAll('[data-auth-tab]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const nextTab = btn.getAttribute('data-auth-tab');
      store.setUI({
        authModalTab: nextTab,
        ...(nextTab === 'signup' ? { authSuccessMessage: '' } : {}),
      });
    })
  );
  root.querySelector('[data-action="modal-demo-signin"]')?.addEventListener('click', () => {
    store.demoSignIn();
    if (window.location.pathname === '/login') {
      window.history.replaceState(null, '', '/');
    }
    store.setView('myfoods');
    showToast('Signed in to Demo Profile');
  });
  root.querySelector('[data-action="google-signin"]')?.addEventListener('click', () => {
    store.demoSignIn({ name: 'Alex Mercer', email: 'alex.google@nutrisense.demo' });
    if (window.location.pathname === '/login') {
      window.history.replaceState(null, '', '/');
    }
    store.setView('myfoods');
    showToast('Signed in with Google Demo');
  });

  root.querySelector('#auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = form.email.value.trim();
    const password = form.password.value;
    const fullName = form.name?.value?.trim() || '';
    const errEl = root.querySelector('#auth-error');
    const noticeEl = root.querySelector('#auth-notice');
    const submitBtn = form.querySelector('button[type="submit"]');
    const isSignup = store.getUI().authModalTab === 'signup';

    if (noticeEl) {
      noticeEl.classList.add('hidden');
      noticeEl.textContent = '';
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (isSignup && fullName.length < 2) {
      errEl.textContent = 'Please enter your name (at least 2 characters).';
      errEl.classList.remove('hidden');
      return;
    }
    if (!emailValid) {
      errEl.textContent = 'Please enter a valid email address.';
      errEl.classList.remove('hidden');
      return;
    }
    if (password.length < 6) {
      errEl.textContent = 'Password must be at least 6 characters.';
      errEl.classList.remove('hidden');
      return;
    }

    errEl.classList.add('hidden');
    errEl.textContent = '';

    const originalLabel = submitBtn?.textContent || '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isSignup ? 'Creating Account...' : 'Signing In...';
    }

    try {
      const { data, error } = isSignup
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
              },
            },
          })
        : await supabase.auth.signInWithPassword({
            email,
            password,
          });

      if (error) {
        errEl.textContent = error.message || 'Authentication failed. Please try again.';
        errEl.classList.remove('hidden');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
        return;
      }

      if (isSignup) {
        if (data?.session) {
          await supabase.auth.signOut().catch(() => {});
        }
        const successMessage =
          'Your account has been created. Please check your email and verify your address before logging in.';
        const loginUrl = `/login?signup=success&email=${encodeURIComponent(email)}`;
        window.history.pushState({ fromSignup: true, email }, '', loginUrl);
        store.setUI({
          authModalOpen: true,
          authModalTab: 'login',
          authPrefillEmail: email,
          authSuccessMessage: successMessage,
        });
        return;
      }

      if (!data?.session) {
        errEl.textContent = 'No active session found. Please confirm your email before logging in.';
        errEl.classList.remove('hidden');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
        return;
      }

      const user = data.session.user || data.user;
      await store.hydrateFromSupabase(user, { force: true });

      if (window.location.pathname !== '/' || window.location.search) {
        window.history.pushState(null, '', '/');
      }
      store.setView('home');
      showToast('Signed in successfully');
    } catch (err) {
      errEl.textContent = err?.message || 'Unable to connect to authentication service.';
      errEl.classList.remove('hidden');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    }
  });

  // Notifications Drawer
  root.querySelectorAll('[data-action="close-notifications"]').forEach((el) =>
    el.addEventListener('click', () => store.setUI({ notificationsOpen: false }))
  );
  root.querySelector('#notifications-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'notifications-backdrop') store.setUI({ notificationsOpen: false });
  });
  root.querySelector('[data-action="mark-all-read"]')?.addEventListener('click', () => {
    store.markAllNotificationsRead();
    showToast('All notifications marked as read');
  });
  root.querySelectorAll('[data-pref]').forEach((input) =>
    input.addEventListener('change', () => {
      store.updateNotificationPrefs({ [input.getAttribute('data-pref')]: input.checked });
      showToast('Notification preference updated');
    })
  );
  root.querySelectorAll('[data-meal-time]').forEach((input) =>
    input.addEventListener('change', () => {
      const slot = input.getAttribute('data-meal-time');
      store.updateNotificationPrefs({ mealTimes: { [slot]: input.value } });
      showToast(`${slot} reminder set to ${input.value}`);
    })
  );
  root.querySelectorAll('[data-quiet]').forEach((input) =>
    input.addEventListener('change', () => {
      store.updateNotificationPrefs({ [input.getAttribute('data-quiet')]: input.value });
    })
  );

  // Floating Assistant
  root.querySelector('[data-action="toggle-chat"]')?.addEventListener('click', () => {
    store.setUI({ chatOpen: !store.getUI().chatOpen });
  });
  root.querySelector('[data-action="close-chat"]')?.addEventListener('click', () => {
    store.setUI({ chatOpen: false });
  });
  root.querySelectorAll('[data-quick-reply]').forEach((btn) =>
    btn.addEventListener('click', () => {
      store.sendChatMessage(btn.getAttribute('data-quick-reply'));
    })
  );
  root.querySelector('#assistant-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = root.querySelector('#assistant-input');
    if (input && input.value.trim()) {
      store.sendChatMessage(input.value.trim());
      input.value = '';
    }
  });

  const scrollBody = root.querySelector('#chat-scroll-body');
  if (scrollBody) {
    scrollBody.scrollTop = scrollBody.scrollHeight;
  }
}
