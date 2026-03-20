/* sidebar.js — injects the persistent sidebar + topbar into every page */
export function injectShell({ pageTitle = '', activePage = '' } = {}) {

  const pages = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: 'dashboard.html',
      icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
               <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
               <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
             </svg>`
    },
    {
      id: 'learners',
      label: 'Learners',
      href: 'learners.html',
      icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
               <path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
             </svg>`
    },
    {
      id: 'fees',
      label: 'Term & Fees',
      href: 'fees.html',
      icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
               <rect x="5" y="2" width="14" height="20" rx="2"/>
               <line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/>
             </svg>`
    },
    {
      id: 'custom-fees',
      label: 'Custom Fees',
      href: 'custom-fees.html',
      icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
               <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
             </svg>`
    },
    {
      id: 'payments',
      label: 'Payments',
      href: 'payments.html',
      icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
               <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
             </svg>`
    },
    {
      id: 'receipts',
      label: 'Receipts',
      href: 'receipts.html',
      icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
               <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
               <polyline points="14 2 14 8 20 8"/>
               <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
             </svg>`
    },
    {
      id: 'fee-reports',
      label: 'Fee Reports',
      href: 'fee-reports.html',
      icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
               <line x1="18" y1="20" x2="18" y2="10"/>
               <line x1="12" y1="20" x2="12" y2="4"/>
               <line x1="6"  y1="20" x2="6"  y2="14"/>
               <line x1="3"  y1="20" x2="21" y2="20"/>
             </svg>`
    },
    {
      id: 'sms',
      label: 'SMS',
      href: 'sms.html',
      icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
               <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
             </svg>`
    },
    {
      id: 'promotion',
      label: 'Promotion',
      href: 'promotion.html',
      icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
               <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
               <path d="M6 12v5c3 3 9 3 12 0v-5"/>
             </svg>`
    },
  ];

  const navItemsHTML = pages.map(p => `
    <a href="${p.href}" class="nav-item ${activePage === p.id ? 'active' : ''}">
      <span class="nav-item-icon">${p.icon}</span>
      <span class="nav-item-label">${p.label}</span>
    </a>
  `).join('');

  const sidebarHTML = `
    <aside class="sidebar" id="appSidebar">
      <div class="sidebar-brand">
        <div class="sidebar-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.9)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2C8 2 4 6 4 10c0 6 8 12 8 12s8-6 8-12c0-4-4-8-8-8z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="sidebar-brand-text">
          <div class="sidebar-school-name">Little Angels</div>
          <div class="sidebar-tagline">Academy · Thika</div>
        </div>
      </div>

      <div class="sidebar-section-label">Main Menu</div>

      <nav class="sidebar-nav">
        ${navItemsHTML}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-signature">
          Empowering education through<br>intelligent systems — <span>ScoTech</span>
        </div>
      </div>
    </aside>

    <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
  `;

  const topbarHTML = `
    <header class="topbar" id="appTopbar">
      <!-- Hamburger: shown on mobile, injected here so it's always first in topbar -->
      <button class="topbar-hamburger" id="hamburgerBtn" aria-label="Open menu" aria-expanded="false">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div class="topbar-page-title">${pageTitle}</div>

      <div class="topbar-search">
        <svg class="topbar-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.4"/>
          <path d="M11 11l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <input type="text" placeholder="Search learners, payments…" id="globalSearch" />
      </div>

      <div class="topbar-right">
        <button class="topbar-icon-btn" title="Notifications">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke-linecap="round"/>
          </svg>
          <div class="notif-dot"></div>
        </button>

        <div class="topbar-avatar-wrap">
          <div class="topbar-avatar" id="topbarAvatar">AD</div>
          <div class="avatar-dropdown" id="avatarDropdown">
            <div class="avatar-dd-head">
              <div class="avatar-dd-name">Administrator</div>
              <div class="avatar-dd-role">School Management</div>
            </div>
            <button class="avatar-dd-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              Profile
            </button>
            <button class="avatar-dd-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              Settings
            </button>
            <button class="avatar-dd-item danger" id="logoutBtn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  `;

  /* ── Inject HTML ── */
  const shell = document.querySelector('.app-shell');
  if (!document.getElementById('appSidebar')) {
    shell.insertAdjacentHTML('afterbegin', sidebarHTML);
  }
  if (!document.getElementById('appTopbar')) {
    shell.insertAdjacentHTML('afterbegin', topbarHTML);
  }

  /* ── Sidebar open/close logic ── */
  const sidebar   = document.getElementById('appSidebar');
  const backdrop  = document.getElementById('sidebarBackdrop');
  const hamburger = document.getElementById('hamburgerBtn');

  function openSidebar() {
    sidebar.classList.add('open');
    backdrop.classList.add('visible');
    hamburger.classList.add('active');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';   /* prevent scroll-through */
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('visible');
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  /* Hamburger click */
  if (hamburger) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
  }

  /* Backdrop click closes sidebar */
  if (backdrop) {
    backdrop.addEventListener('click', closeSidebar);
  }

  /* ── Swipe gestures — direction-aware ── */
  let swipeStartX = 0;
  let swipeStartY = 0;

  /* Swipe-left to close: only when sidebar is already open */
  sidebar.addEventListener('touchstart', (e) => {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
  }, { passive: true });

  sidebar.addEventListener('touchend', (e) => {
    const dx = swipeStartX - e.changedTouches[0].clientX;
    const dy = Math.abs(e.changedTouches[0].clientY - swipeStartY);
    /* Only close if horizontal movement dominates (not a scroll) */
    if (dx > 60 && dx > dy * 1.5) closeSidebar();
  }, { passive: true });

  /* Swipe-right from left edge to open: horizontal intent required */
  document.addEventListener('touchstart', (e) => {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - swipeStartY);
    /* Must start within 20px of left edge, move right 60px+,
       and horizontal movement must clearly dominate vertical */
    if (
      swipeStartX < 20 &&
      dx > 60 &&
      dx > dy * 2 &&           /* angle must be more horizontal than diagonal */
      !sidebar.classList.contains('open')
    ) {
      openSidebar();
    }
  }, { passive: true });

  /* Auto-close sidebar when a nav item is tapped on mobile */
  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  /* Escape key closes sidebar */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  /* On desktop, reset any mobile state if window is resized */
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeSidebar();
    }
  });

  /* ── Avatar dropdown ── */
  const avatarBtn  = document.getElementById('topbarAvatar');
  const avatarMenu = document.getElementById('avatarDropdown');
  if (avatarBtn && avatarMenu) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      avatarMenu.classList.toggle('open');
    });
    document.addEventListener('click', () => avatarMenu.classList.remove('open'));
  }

  /* ── Logout ── */
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const { supabase } = await import('./supabase.js');
      if (confirm('Are you sure you want to logout?')) {
        await supabase.auth.signOut();
        window.location.href = '/';
      }
    });
  }
}
