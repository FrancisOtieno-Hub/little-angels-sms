/* ═══════════════════════════════════════════════════════
   SCHOOL CONFIGURATION
   ───────────────────────────────────────────────────────
   Edit ONLY this file to update school details across
   the entire application. Do not change any other file.
═══════════════════════════════════════════════════════ */

export const SCHOOL = {

  /* ── Identity ── */
  name:          'Little Angels Academy',   // Full school name
  shortName:     'Little Angels',           // Short name (used in sidebar)
  abbreviation:  'LAA',                     // Abbreviation (used in filenames, cache)
  tagline:       'Academy · Thika',         // Sidebar sub-label

  /* ── Motto ── */
  motto:         'Quality Education, Service and Discipline',

  /* ── Contact ── */
  poBox:         'P.O. Box 7093, Thika',
  phone:         '0720 985 433',
  phoneLink:     'tel:0720985433',          // href value for tel: links

  /* ── SMS ── */
  smsShortcode:  'LITTLEANGELS',            // Registered SMS shortcode

  /* ── System ── */
  systemName:    'School Management System',
  cacheKey:      'laa-sms-v2',             // Service worker cache name
  signedBy:      'ScoTech',                // Footer signature

};

/* ── Convenience: full contact line used in receipts ── */
export const SCHOOL_CONTACT_LINE =
  `${SCHOOL.poBox} | Tel: ${SCHOOL.phone}`;

/* ── Convenience: receipt footer disclaimer ── */
export const SCHOOL_RECEIPT_DISCLAIMER =
  `This is an official receipt from ${SCHOOL.name}. Please retain for your records.`;
