import { icon } from './icons.js';
import { store } from '../state/store.js';
import { showToast } from './toast.js';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', iconName: 'home' },
  { id: 'calculator', label: 'Calculator', iconName: 'calculator' },
  { id: 'planner', label: 'Meal Plan', iconName: 'calendar' },
  { id: 'scanner', label: 'Scanner', iconName: 'scan' },
  { id: 'myfoods', label: 'My Foods', iconName: 'utensils' },
];

export function renderHeaderNav(state) {
  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const isDark = state.theme === 'dark';

  const desktopLinks = NAV_ITEMS.map((item) => {
    const active = state.activeView === item.id;
    return `
      <button
        type="button"
        data-nav="${item.id}"
        aria-current="${active ? 'page' : 'false'}"
        class="relative py-1.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F527] rounded-md px-1 ${
          active
            ? 'text-zinc-950 dark:text-[#B8F527] font-semibold'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
        }"
      >
        ${item.label}
        ${
          active
            ? '<span class="absolute left-1 right-1 -bottom-0.5 h-0.5 rounded-full bg-zinc-950 dark:bg-[#B8F527]"></span>'
            : ''
        }
      </button>
    `;
  }).join('');

  const mobileTabs = NAV_ITEMS.map((item) => {
    const active = state.activeView === item.id;
    if (active) {
      return `
        <button
          type="button"
          data-nav="${item.id}"
          aria-label="${item.label}"
          aria-current="page"
          class="flex items-center gap-2 px-3.5 min-h-[44px] rounded-full bg-[#B8F527] text-zinc-950 font-semibold text-xs whitespace-nowrap shrink-0 shadow-sm transition-transform active:scale-95"
        >
          ${icon(item.iconName, 'w-4 h-4 shrink-0')}
          <span>${item.label}</span>
        </button>
      `;
    }
    return `
      <button
        type="button"
        data-nav="${item.id}"
        aria-label="${item.label}"
        aria-current="false"
        class="flex items-center justify-center w-11 h-11 rounded-full bg-zinc-800/70 text-zinc-400 hover:text-white hover:bg-zinc-700/80 transition-colors shrink-0"
      >
        ${icon(item.iconName, 'w-4 h-4')}
      </button>
    `;
  }).join('');

  const authControl = state.isAuthenticated
    ? `
      <button
        type="button"
        data-action="sign-out"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold bg-zinc-900 text-white dark:bg-[#1E2127] dark:text-zinc-100 border border-zinc-200 dark:border-[#2C3038] hover:border-[#B8F527]/60 whitespace-nowrap shrink-0 transition-colors"
      >
        <span class="w-5 h-5 rounded-full bg-[#B8F527] text-zinc-950 flex items-center justify-center text-[10px] font-bold">${state.profile.avatarInitials}</span>
        <span class="hidden lg:inline">Sign Out</span>
        <span class="lg:hidden">${icon('logout', 'w-3.5 h-3.5')}</span>
      </button>
    `
    : `
      <button
        type="button"
        data-action="open-auth"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#B8F527] hover:bg-[#A8E51B] text-zinc-950 whitespace-nowrap shrink-0 transition-colors shadow-sm"
      >
        <span>Sign In</span>
      </button>
    `;

  return `
    <!-- Desktop & Tablet Floating Top Navigation -->
    <header class="sticky top-0 z-40 px-3 sm:px-6 pt-3">
      <div class="max-w-7xl mx-auto h-14 px-4 sm:px-6 rounded-2xl bg-white/90 dark:bg-[#121417]/90 backdrop-blur-md border border-zinc-200 dark:border-[#24272E] flex items-center justify-between gap-4 md:gap-8">
        <!-- Zone 1: Brand Wordmark -->
        <button
          type="button"
          data-nav="home"
          class="font-display text-lg font-bold tracking-tight text-zinc-950 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F527] rounded-md"
        >
          Nutri<span class="text-[#658C0A] dark:text-[#B8F527]">Sense</span>
        </button>

        <!-- Zone 2: Primary Navigation Links -->
        <nav class="hidden md:flex items-center gap-6" aria-label="Main navigation">
          ${desktopLinks}
        </nav>

        <!-- Zone 3: Actions -->
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-action="toggle-theme"
            aria-label="${isDark ? 'Switch to light mode' : 'Switch to dark mode'}"
            title="${isDark ? 'Switch to light mode' : 'Switch to dark mode'}"
            class="w-10 h-10 rounded-full flex items-center justify-center border border-zinc-200 dark:border-[#272A32] bg-zinc-100 dark:bg-[#191C21] text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            ${icon(isDark ? 'sun' : 'moon', 'w-4 h-4')}
          </button>

          <button
            type="button"
            data-action="toggle-notifications"
            aria-label="Open notifications (${unreadCount} unread)"
            class="relative w-10 h-10 rounded-full flex items-center justify-center border border-zinc-200 dark:border-[#272A32] bg-zinc-100 dark:bg-[#191C21] text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            ${icon('bell', 'w-4 h-4')}
            ${
              unreadCount > 0
                ? `<span class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#B8F527] text-zinc-950 text-[10px] font-bold flex items-center justify-center tabular-nums">${unreadCount}</span>`
                : ''
            }
          </button>

          ${
            !state.isAuthenticated
              ? `<button
                  type="button"
                  data-action="demo-signin"
                  class="hidden sm:inline-flex items-center px-3.5 py-2 rounded-full text-xs font-semibold border border-zinc-300 dark:border-[#2D313B] text-zinc-800 dark:text-zinc-200 hover:border-[#B8F527] whitespace-nowrap shrink-0 transition-colors"
                >Demo Sign-in</button>`
              : ''
          }

          ${authControl}
        </div>
      </div>
    </header>

    <!-- Mobile Floating Capsule Bottom Navigation (matching reference bottom-right UI) -->
    <nav
      class="md:hidden fixed bottom-3 left-3 right-3 z-40 max-w-md mx-auto"
      aria-label="Mobile navigation"
    >
      <div class="bg-[#121417]/95 backdrop-blur-md border border-[#272A32] rounded-full p-1.5 flex items-center justify-between gap-1 shadow-2xl">
        ${mobileTabs}
      </div>
    </nav>
  `;
}

export function bindHeaderNavEvents(root) {
  root.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav');
      if (target) store.setView(target);
    });
  });

  root.querySelectorAll('[data-action="toggle-theme"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.toggleTheme();
      const nextTheme = store.getState().theme;
      showToast(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} Mode`);
    });
  });

  root.querySelectorAll('[data-action="open-auth"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.setUI({ authModalOpen: true, authModalTab: 'login' });
    });
  });

  root.querySelectorAll('[data-action="demo-signin"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.demoSignIn();
      store.setView('myfoods');
      showToast('Signed in to Demo Profile (Alex Mercer)');
    });
  });

  root.querySelectorAll('[data-action="sign-out"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.signOut();
      showToast('Signed out to public preview mode');
    });
  });

  root.querySelectorAll('[data-action="toggle-notifications"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const isOpen = store.getUI().notificationsOpen;
      store.setUI({ notificationsOpen: !isOpen });
    });
  });
}
