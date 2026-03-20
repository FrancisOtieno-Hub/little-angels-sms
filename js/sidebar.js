/* sidebar.js — injects the persistent sidebar + topbar into every page */
import { SCHOOL } from './school-config.js';

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
          <div class="sidebar-school-name">${SCHOOL.shortName}</div>
          <div class="sidebar-tagline">${SCHOOL.tagline}</div>
        </div>
      </div>

      <div class="sidebar-section-label">Main Menu</div>

      <nav class="sidebar-nav">
        ${navItemsHTML}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-signature">
          Empowering education through<br>intelligent systems — <span>${SCHOOL.signedBy}</span>
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
        <input type="text" placeholder="Search learners, payments…" id="globalSearch" autocomplete="off"/>
        <div class="global-search-results hidden" id="globalSearchResults"></div>
      </div>

      <div class="topbar-right">
        <div class="topbar-notif-wrap">
          <button class="topbar-icon-btn" id="notifBtn" title="Notifications">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke-linecap="round"/>
            </svg>
            <div class="notif-dot" id="notifDot"></div>
          </button>
          <div class="notif-dropdown" id="notifDropdown">
            <div class="notif-dd-head">
              <span>Recent Payments</span>
              <a href="fee-reports.html" style="font-size:.72rem;color:var(--primary-light);text-decoration:none;font-weight:500;">View all →</a>
            </div>
            <div id="notifList">
              <div class="notif-empty">Loading…</div>
            </div>
          </div>
        </div>

        <div class="topbar-avatar-wrap">
          <div class="topbar-avatar" id="topbarAvatar">AD</div>
          <div class="avatar-dropdown" id="avatarDropdown">
            <div class="avatar-dd-head">
              <div class="avatar-dd-name">Administrator</div>
              <div class="avatar-dd-role">School Management</div>
            </div>
            <button class="avatar-dd-item" id="profileBtn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              Profile
            </button>
            <button class="avatar-dd-item" id="settingsBtn">
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

  /* ── Profile modal ── */
  const profileModalHTML = `
    <div class="modal hidden" id="profileModal">
      <div class="modal-content" style="max-width:400px;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
          <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,var(--navy),var(--navy2));display:flex;align-items:center;justify-content:center;color:white;font-size:1.2rem;font-weight:700;flex-shrink:0;" id="profileModalInitials">AD</div>
          <div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:700;color:var(--text-primary);">My Account</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:2px;">School Management System</div>
          </div>
        </div>
        <div style="background:var(--bg);border-radius:var(--radius-sm);padding:16px;display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">
          <div>
            <div style="font-size:0.72rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">Email Address</div>
            <div style="font-size:0.9rem;color:var(--text-primary);font-weight:500;" id="profileModalEmail">—</div>
          </div>
          <div>
            <div style="font-size:0.72rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">Role</div>
            <div style="font-size:0.9rem;color:var(--text-primary);font-weight:500;">Administrator</div>
          </div>
          <div>
            <div style="font-size:0.72rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">Last Sign In</div>
            <div style="font-size:0.9rem;color:var(--text-primary);font-weight:500;" id="profileModalLastSeen">—</div>
          </div>
        </div>
        <button id="profileModalClose" style="width:100%;padding:11px;border:1.5px solid var(--border);border-radius:var(--radius-xs);background:white;font-family:'DM Sans',sans-serif;font-size:0.88rem;font-weight:600;color:var(--text-primary);cursor:pointer;transition:var(--transition);" onmouseover="this.style.borderColor='var(--navy2)'" onmouseout="this.style.borderColor='var(--border)'">Close</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', profileModalHTML);

  /* ── Profile button ── */
  const profileBtn   = document.getElementById('profileBtn');
  const profileModal = document.getElementById('profileModal');
  const profileClose = document.getElementById('profileModalClose');

  if (profileBtn) {
    profileBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      avatarMenu.classList.remove('open');

      // Fetch current user from Supabase
      const { supabase } = await import('./supabase.js');
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const email    = user.email || '—';
        const initials = email.slice(0, 2).toUpperCase();
        const lastSeen = user.last_sign_in_at
          ? new Date(user.last_sign_in_at).toLocaleString('en-KE', {
              timeZone: 'Africa/Nairobi',
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })
          : '—';

        document.getElementById('profileModalEmail').textContent    = email;
        document.getElementById('profileModalInitials').textContent = initials;
        document.getElementById('profileModalLastSeen').textContent = lastSeen;
        document.getElementById('topbarAvatar').textContent         = initials;
        document.querySelector('.avatar-dd-name').textContent       = email.split('@')[0];
      }

      profileModal.classList.remove('hidden');
    });
  }

  if (profileClose) {
    profileClose.addEventListener('click', () => profileModal.classList.add('hidden'));
  }

  // Close profile modal on backdrop click
  profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) profileModal.classList.add('hidden');
  });

  /* ── Settings button → fees.html ── */
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      avatarMenu.classList.remove('open');
      window.location.href = 'fees.html';
    });
  }

  /* ═══════════════════════════════════════════════
     GLOBAL SEARCH
     Searches learners by name or admission number.
     Shows matching learners AND their recent payments
     in two grouped sections in the dropdown.
  ═══════════════════════════════════════════════ */
  const globalSearch  = document.getElementById('globalSearch');
  const searchResults = document.getElementById('globalSearchResults');
  let searchTimeout   = null;
  let learnerCache    = null;   // cache learners for the session

  async function fetchLearnersCache() {
    if (learnerCache) return learnerCache;
    const { supabase } = await import('./supabase.js');
    const { data } = await supabase
      .from('learners')
      .select('id, admission_no, first_name, last_name, classes(name)')
      .eq('active', true)
      .order('first_name');
    learnerCache = data || [];
    return learnerCache;
  }

  async function fetchPaymentsForLearners(learnerIds) {
    if (!learnerIds.length) return [];
    const { supabase } = await import('./supabase.js');
    // Chunk to avoid URL limits
    const CHUNK = 50;
    const results = [];
    for (let i = 0; i < learnerIds.length; i += CHUNK) {
      const { data } = await supabase
        .from('payments')
        .select('id, learner_id, amount, payment_date, reference_no, terms(year, term)')
        .in('learner_id', learnerIds.slice(i, i + CHUNK))
        .order('payment_date', { ascending: false })
        .limit(30);
      if (data) results.push(...data);
    }
    return results;
  }

  async function runSearch(q) {
    const learners = await fetchLearnersCache();
    const ql = q.toLowerCase();

    const matched = learners.filter(l =>
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(ql) ||
      l.admission_no.toLowerCase().includes(ql)
    ).slice(0, 6);

    if (!matched.length) {
      searchResults.innerHTML = `<div class="gs-empty">No results for "<strong>${q}</strong>"</div>`;
      searchResults.classList.remove('hidden');
      return;
    }

    // Fetch payments for matched learners in parallel
    const payments = await fetchPaymentsForLearners(matched.map(l => l.id));

    // Group payments by learner id
    const payMap = {};
    payments.forEach(p => {
      if (!payMap[p.learner_id]) payMap[p.learner_id] = [];
      payMap[p.learner_id].push(p);
    });

    let html = '';

    // ── Section 1: Learners ──
    html += `<div class="gs-section-label">Learners</div>`;
    html += matched.map(l => `
      <a href="learners.html" class="gs-item">
        <div class="gs-avatar">${l.first_name[0]}${l.last_name[0]}</div>
        <div class="gs-info">
          <div class="gs-name">${l.first_name} ${l.last_name}</div>
          <div class="gs-meta">${l.admission_no} · ${l.classes?.name || '—'}</div>
        </div>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:var(--text-muted);flex-shrink:0;"><path d="M9 18l6-6-6-6"/></svg>
      </a>
    `).join('');

    // ── Section 2: Payments ──
    const allPayments = matched.flatMap(l =>
      (payMap[l.id] || []).slice(0, 3).map(p => ({ ...p, learner: l }))
    ).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)).slice(0, 8);

    if (allPayments.length) {
      html += `<div class="gs-section-label" style="border-top:1px solid var(--border);margin-top:2px;padding-top:6px;">Payments</div>`;
      html += allPayments.map(p => {
        const termLabel = p.terms ? `Term ${p.terms.term} ${p.terms.year}` : '—';
        const dateStr   = new Date(p.payment_date).toLocaleDateString('en-KE', {
          timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric'
        });
        const refLabel  = p.reference_no ? ` · Ref: ${p.reference_no}` : '';
        return `
          <a href="payments.html" class="gs-item gs-payment-item">
            <div class="gs-pay-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <div class="gs-info">
              <div class="gs-name">
                KES ${Number(p.amount).toLocaleString()}
                <span style="font-weight:400;color:var(--text-secondary);font-size:.78rem;"> — ${p.learner.first_name} ${p.learner.last_name}</span>
              </div>
              <div class="gs-meta">${dateStr} · ${termLabel}${refLabel}</div>
            </div>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:var(--text-muted);flex-shrink:0;"><path d="M9 18l6-6-6-6"/></svg>
          </a>
        `;
      }).join('');
    }

    searchResults.innerHTML = html;
    searchResults.classList.remove('hidden');
  }

  function hideSearchResults() {
    searchResults.classList.add('hidden');
    searchResults.innerHTML = '';
  }

  if (globalSearch) {
    globalSearch.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      clearTimeout(searchTimeout);
      if (q.length < 2) { hideSearchResults(); return; }
      searchTimeout = setTimeout(() => runSearch(q), 280);
    });

    globalSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { hideSearchResults(); globalSearch.blur(); }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.topbar-search')) hideSearchResults();
    });
  }

  /* ═══════════════════════════════════════════════
     NOTIFICATIONS
     Shows the 6 most recent payments across all
     terms. Loads on first open, then stays cached.
  ═══════════════════════════════════════════════ */
  const notifBtn      = document.getElementById('notifBtn');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifDot      = document.getElementById('notifDot');
  let notifLoaded     = false;

  async function loadNotifications() {
    const { supabase } = await import('./supabase.js');
    const { data } = await supabase
      .from('payments')
      .select('amount, payment_date, created_at, learners(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(6);

    const list = document.getElementById('notifList');
    if (!data || !data.length) {
      list.innerHTML = '<div class="notif-empty">No recent payments</div>';
      notifDot.style.display = 'none';
      return;
    }

    list.innerHTML = data.map(p => {
      const name = p.learners ? `${p.learners.first_name} ${p.learners.last_name}` : 'Unknown';
      const dt   = new Date(p.created_at);
      const time = dt.toLocaleDateString('en-KE', {
        timeZone: 'Africa/Nairobi', month: 'short', day: 'numeric'
      }) + ' · ' + dt.toLocaleTimeString('en-KE', {
        timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit'
      });
      return `
        <div class="notif-item">
          <div class="notif-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div class="notif-body">
            <div class="notif-title">${name}</div>
            <div class="notif-sub">KES ${Number(p.amount).toLocaleString()} · ${time}</div>
          </div>
        </div>`;
    }).join('');

    notifLoaded = true;
  }

  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      avatarMenu.classList.remove('open');
      hideSearchResults();

      const isOpen = notifDropdown.classList.toggle('open');
      if (isOpen && !notifLoaded) await loadNotifications();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.topbar-notif-wrap')) notifDropdown.classList.remove('open');
    });
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
