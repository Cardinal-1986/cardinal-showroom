/* sentinel setup — the Cardinal Showroom, signed in, with production-shaped data.
 *
 *   node sentinel.js index.html \
 *     --setup .claude/skills/cardinal-build/scripts/sentinel_setup_showroom.js \
 *     --viewports 390x844,820x1180,1194x834,1440x900 \
 *     --since <the previous artifact>
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS, IN ONE PARAGRAPH
 *
 * On 31 Aug the Showroom shipped with five defects in it and every mechanical
 * gate green. Three were reported by Theo from one screenshot — OC Colors a
 * black screen, the Showcase button dead, Studio 404 — and two more were found
 * afterwards: photographs that never resolved, and a header that pushed
 * PRESENT off a 414px phone. Four of the five live one click past the sign-in
 * form, and the fifth is only visible at a phone width. A checker pointed at a
 * login screen reports CLEAN and means nothing by it. That is the whole
 * argument for this file.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT THE FIXTURES ARE, AND WHAT THEY ARE NOT
 *
 * Every column list below was read out of `information_schema.columns` on the
 * live database on 31 Aug, not remembered and not inferred from the code
 * (BUG_CLASSES 45: a fixture invented rather than observed makes the stub
 * agree with the code, so the two are wrong together and the gate certifies
 * it). The VALUES are invented — deliberately, because a customer's name and
 * address have no business sitting in a gate file — but every shape, key and
 * enum value is the real one.
 *
 * ⚠ AND THE REAL TABLE IS NEARLY EMPTY. Measured the same day:
 *
 *      oc_colors           34 rows
 *      showcase_pairs       1 row
 *      workmanship_pairs    1 row
 *      walks                0 rows
 *
 * So a populated Showcase grid is the ASPIRATION and the empty state is what a
 * rep actually opens today. Both are walked below. An empty state that no
 * instrument ever renders is an empty state nobody has checked — and it is the
 * one Theo will see first.
 * ───────────────────────────────────────────────────────────────────────── */

/* ── the database ──────────────────────────────────────────────────────── */
window.supabase = {
  createClient: function () {

    /* oc_colors — 19 real columns. Four rows chosen to span what the hub has
       to render: a verified hex, an UNVERIFIED one (which draws the
       "approximate colour" warning instead of a swatch), a discontinued colour
       (which keeps a badged spot — settled, do not filter it out), and one
       with no cover image at all, which is the typographic fallback path. */
    var OC = [
      { id:'c1', name:'Onyx Black', slug:'onyx-black', hex:'#232427', hex_verified:true,
        family:'black', product_line:'duration', status:'current', replaced_by:null,
        nearest:null, description:'Deep consistent black with dimensional variation.',
        sort_order:1, cover_image_path:'oc-colors/onyx-black/hero.jpg',
        cover_credit:'Cardinal install, Kettering', coty_year:null, hidden:false,
        swatch_path:null, created_at:'2026-08-07T00:00:00Z', updated_at:'2026-08-07T00:00:00Z' },
      { id:'c2', name:'Storm Cloud', slug:'storm-cloud', hex:'#5A5E63', hex_verified:false,
        family:'grey', product_line:'duration', status:'current', replaced_by:null,
        nearest:null, description:'Mid grey with cool undertone.',
        sort_order:7, cover_image_path:'oc-colors/storm-cloud/hero.jpg',
        cover_credit:null, coty_year:null, hidden:false, swatch_path:null,
        created_at:'2026-08-07T00:00:00Z', updated_at:'2026-08-07T00:00:00Z' },
      { id:'c3', name:'Bourbon', slug:'bourbon', hex:'#6B4630', hex_verified:false,
        family:'brown', product_line:'designer', status:'coty', replaced_by:null,
        nearest:null, description:'Warm brown with amber depth.',
        sort_order:12, cover_image_path:'oc-colors/bourbon/hero.jpg',
        cover_credit:null, coty_year:2026, hidden:false, swatch_path:null,
        created_at:'2026-08-07T00:00:00Z', updated_at:'2026-08-07T00:00:00Z' },
      /* Discontinued AND coverless — two awkward paths in one row. */
      { id:'c4', name:'Mountain Pine', slug:'mountain-pine', hex:'#3F4A3E', hex_verified:false,
        family:'green', product_line:'duration', status:'discontinued',
        replaced_by:'Onyx Black', nearest:null,
        description:'Muted green, shown so an older roof can be identified.',
        sort_order:31, cover_image_path:null, cover_credit:null, coty_year:null,
        hidden:false, swatch_path:null,
        created_at:'2026-08-07T00:00:00Z', updated_at:'2026-08-07T00:00:00Z' },
      /* hidden:true — load() filters on `.eq('hidden', false)`, so this row
         must NEVER appear. Shasta White is the real one. It is here so the
         filter is exercised rather than assumed. */
      { id:'c5', name:'Shasta White', slug:'shasta-white', hex:'#E9E7E1', hex_verified:false,
        family:'grey', product_line:'other', status:'current', replaced_by:null,
        nearest:null, description:'Hidden.', sort_order:99, cover_image_path:null,
        cover_credit:null, coty_year:null, hidden:true, swatch_path:null,
        created_at:'2026-08-07T00:00:00Z', updated_at:'2026-08-07T00:00:00Z' }
    ];

    var OC_PHOTOS = [
      { id:'op1', color_id:'c1', storage_path:'oc-colors/onyx-black/1.jpg',
        project_address:'Dayton', captured_on:'2026-06-14', caption:'South elevation',
        is_hero:true, sort_order:1, created_by:'theo@cardinalrenovations.net',
        created_at:'2026-06-14T00:00:00Z' }
    ];

    /* showcase_pairs — 20 real columns. `published` matters: RLS admits an
       unpublished row only to an admin, and the module filters too. */
    var PAIRS = [
      { id:'sp1', title:'Full roof replacement', address:'12 Example Rd', city:'Dayton',
        project_id:'p1', trade:'roof', material:'TruDefinition Duration — Onyx Black',
        completed_on:'2026-06-02', before_path:'showcase/sp1/before.jpg',
        build_path:'showcase/sp1/build.jpg', after_path:'showcase/sp1/after.jpg',
        score:94, sort_order:1, published:true, release_on:null, release_by:null,
        notes:null, created_by:'theo@cardinalrenovations.net',
        created_at:'2026-06-03T00:00:00Z', updated_at:'2026-06-03T00:00:00Z' },
      /* No `build_path`. The three-up compare has a two-photo path and it is
         the commoner one. */
      { id:'sp2', title:'Siding and gutters', address:'44 Example Ave', city:'Kettering',
        project_id:'p1', trade:'siding', material:'CertainTeed Cedar Impressions',
        completed_on:'2026-07-19', before_path:'showcase/sp2/before.jpg',
        build_path:null, after_path:'showcase/sp2/after.jpg',
        score:88, sort_order:2, published:true, release_on:null, release_by:null,
        notes:null, created_by:'theo@cardinalrenovations.net',
        created_at:'2026-07-20T00:00:00Z', updated_at:'2026-07-20T00:00:00Z' }
    ];

    /* workmanship_pairs — the Hall of Fame. Theirs beside ours. */
    var WORK = [
      { id:'wm1', title:'Nailing zone', trade:'roof',
        lesson:'Nails driven above the reinforced zone do not hold in wind, and the shingle may not be covered under warranty at all.',
        bad_path:'work/wm1/bad.jpg', bad_caption:'Nailed high, above the zone',
        good_path:'work/wm1/good.jpg', good_caption:'On the SureNail strip, where it belongs',
        sort_order:1, published:true, created_by:'theo@cardinalrenovations.net',
        created_at:'2026-05-01T00:00:00Z', updated_at:'2026-05-01T00:00:00Z' }
    ];

    /* walks + walk_shots. ⚠ PRODUCTION HAS ZERO WALKS, so nothing here was
       copied from a real row — the FINDINGS shape is taken from the response
       contract that api/detect.js prints in its own prompt, which is the
       authority both ends share:
         {defect, severity:"crit"|"warn"|"ok", label, note,
          box:{x,y,w,h} as FRACTIONS 0..1, confidence}
       plus the two fields the browser adds when a person edits one:
       `edited` and `source`. A box in pixels rather than fractions would
       render off-screen and look like a layout bug, so the units matter. */
    var WALKS = [
      { id:'w1', project_id:'p1', title:'Front slope', address:'12 Example Rd',
        city:'Dayton', trade:'roof', notes:null, sort_order:1, published:true,
        created_by:'theo@cardinalrenovations.net',
        created_at:'2026-08-01T00:00:00Z', updated_at:'2026-08-01T00:00:00Z' }
    ];
    var SHOTS = [
      { id:'ws1', walk_id:'w1', sort_order:1, path:'walks/w1/1.jpg', source:'upload',
        origin_photo_id:null, caption:'South slope, mid-morning',
        findings:[
          { defect:'hail_impact', severity:'crit', label:'Hail impact',
            note:'Granule loss with a bruised mat underneath — this is the one the adjuster is looking for.',
            box:{ x:0.31, y:0.22, w:0.14, h:0.11 }, confidence:0.82,
            edited:false, source:'ai' },
          { defect:'exposed_fastener', severity:'warn', label:'Exposed fastener',
            note:'Sealant has failed around the head.',
            box:{ x:0.62, y:0.55, w:0.08, h:0.07 }, confidence:0.61,
            edited:true, source:'human' }
        ],
        ai_quality:'ok', ai_note:null, reviewed_by:'theo@cardinalrenovations.net',
        reviewed_at:'2026-08-01T12:00:00Z', created_at:'2026-08-01T11:00:00Z' },
      /* A shot with NO findings. "An empty findings array is a correct and
         useful answer" — api/detect.js says so in its own rules, and a sound
         slope is a thing a rep shows on purpose. */
      { id:'ws2', walk_id:'w1', sort_order:2, path:'walks/w1/2.jpg', source:'upload',
        origin_photo_id:null, caption:'North slope — sound', findings:[],
        ai_quality:'ok', ai_note:null, reviewed_by:'theo@cardinalrenovations.net',
        reviewed_at:'2026-08-01T12:02:00Z', created_at:'2026-08-01T11:02:00Z' }
    ];

    var TABLES = {
      oc_colors: OC,
      oc_color_photos: OC_PHOTOS,
      showcase_pairs: PAIRS,
      workmanship_pairs: WORK,
      walks: WALKS,
      walk_shots: SHOTS,
      studio_tray: [],          /* admin-only, and the Showroom never reads it */
      projects: [
        { id:'11111111-1111-4111-8111-111111111111', name:'Example Project',
          stage:'Prospect', address:'12 Example Rd, Dayton OH' },
        /* p2 has no photographs — the empty strip is a real screen. */
        { id:'22222222-2222-4222-8222-222222222222', name:'Bare Project',
          stage:'Lead', address:null }
      ],
      project_photos: [
        { id:'ph1', project_id:'11111111-1111-4111-8111-111111111111',
          storage_path:'projects/p1/front.jpg', section:'roof',
          caption:'Front elevation', created_by:'theo@cardinalrenovations.net',
          created_at:'2026-08-02T00:00:00Z', data:null },
        { id:'ph2', project_id:'11111111-1111-4111-8111-111111111111',
          storage_path:'projects/p1/rear.jpg', section:'roof',
          caption:'Rear elevation', created_by:'theo@cardinalrenovations.net',
          created_at:'2026-08-02T00:00:00Z', data:null }
      ]
    };
    window.__srTables = TABLES;   /* states below empty a table to reach its empty screen */

    /* Only the builder methods the two modules and the shell actually call —
       measured, not guessed: select, eq, order, limit, insert, update, delete,
       maybeSingle, rpc, and the thenable. A stub answering more than that is a
       stub nobody can read. */
    function builder(name) {
      var rows = (window.__srTables[name] || []).slice();
      var b = {};
      ['select', 'order', 'not', 'is', 'in', 'or', 'neq', 'range'].forEach(function (m) {
        b[m] = function () { return b; };
      });
      b.limit = function (n) { rows = rows.slice(0, n); return b; };
      b.eq = function (col, val) {
        /* Filter only on a column the fixture actually has. Silently returning
           everything for an unknown column would make a broken query look
           correct; silently returning nothing would make a correct one look
           broken. Both have cost a round on this project. */
        if (rows.length && Object.prototype.hasOwnProperty.call(rows[0], col))
          rows = rows.filter(function (r) { return r[col] === val; });
        return b;
      };
      b.then = function (ok, no) {
        return Promise.resolve({ data: rows, error: null }).then(ok, no);
      };
      b.maybeSingle = function () {
        return Promise.resolve({ data: rows[0] || null, error: null });
      };
      b.single = b.maybeSingle;
      return b;
    }

    /* ⚠ THE SIGNING CONTRACT, AND WHY IT IS A KNOB.
       Defect 4 of 31 Aug was signedPhotoMap keying its result by `row.path`
       instead of by `list[i]`, the path that was ASKED for. Every consumer
       looks a URL up by the path it passed in, so the map came back empty and
       both screens drew correct chrome around black rectangles.
       A stub that always returns a usable `path` cannot see that bug — BOTH
       keyings work against it, and a probe that passes either way proves
       nothing. So the shape is switchable and one state below flips it: the
       code has to be right for a response that carries `path` and for one that
       does not. */
    window.__srSignShape = window.__srSignShape || 'full';
    function signRows(paths) {
      return paths.map(function (p) {
        return window.__srSignShape === 'nopath'
          ? { signedUrl: '/img/' + p, error: null }
          : { path: p, signedUrl: '/img/' + p, error: null };
      });
    }

    return {
      auth: {
        /* ⚠ NO STORED SESSION, DELIBERATELY. Returning one here would enter the
           app before the first probe and the SIGN-IN SCREEN WOULD NEVER BE
           RENDERED — which is not hypothetical: its wordmark was sitting at
           3.36:1 and only the setup-less run saw it. The first state below
           probes the form; the second signs in through the real handler, so
           the sign-in path is exercised rather than bypassed. */
        getSession: function () {
          return Promise.resolve({ data: { session: null }, error: null });
        },
        signInWithPassword: function () {
          return Promise.resolve({ data: { session: { access_token: 'sentinel',
            user: { id: 'u1', email: 'theo@cardinalrenovations.net' } } }, error: null });
        },
        signOut: function () { return Promise.resolve({ error: null }); },
        onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; }
      },
      /* is_admin is asked of the DATABASE, never inferred from an email string.
         Admin draws strictly more chrome, so it is the wider sweep. */
      rpc: function () { return Promise.resolve({ data: !!window.__srAdminAnswer, error: null }); },
      from: function (t) {
        var b = builder(t);
        return {
          select: function () { return b; },
          insert: function () { return { select: function () { return b; }, then: b.then }; },
          update: function () { return b; },
          upsert: function () { return b; },
          delete: function () { var d = { then: b.then };
                                 ['eq', 'in', 'match'].forEach(function (m) { d[m] = function () { return d; }; });
                                 return d; }
        };
      },
      storage: {
        from: function () {
          return {
            createSignedUrl: function (p) {
              return Promise.resolve({ data: { signedUrl: '/img/' + p }, error: null });
            },
            createSignedUrls: function (ps) {
              return Promise.resolve({ data: signRows(ps || []), error: null });
            },
            download: function () {
              return Promise.resolve({ data: new Blob([''], { type: 'image/jpeg' }), error: null });
            },
            upload: function (p) { return Promise.resolve({ data: { path: p }, error: null }); },
            remove: function (f) { return Promise.resolve({ data: f, error: null }); },
            getPublicUrl: function (p) { return { data: { publicUrl: '/img/' + p } }; }
          };
        }
      }
    };
  }
};

window.__srAdminAnswer = true;

/* /api/detect is this app's own route and needs a key it will not have here.
   Answer it with the shape the route documents, so The Walk's review screen
   renders instead of erroring — the error path is worth checking too, but not
   at the cost of never seeing the screen. */
(function () {
  var real = window.fetch;
  window.fetch = function (url) {
    if (String(url).indexOf('/api/detect') !== -1) {
      return Promise.resolve(new Response(JSON.stringify({
        quality: 'ok', quality_note: '',
        findings: [{ defect:'granule_loss', severity:'warn', label:'Granule loss',
                     note:'Bare mat showing along the course.',
                     box:{ x:0.20, y:0.40, w:0.18, h:0.10 }, confidence:0.7 }],
        dropped: 0, counted: 1
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return real.apply(this, arguments);
  };
})();

/* ── states ────────────────────────────────────────────────────────────────
   The screens a rep reaches, in the order they reach them.

   ⚠ EACH STATE LEAVES THE PAGE WHERE THE NEXT ONE EXPECTS IT. They run in
   order against ONE page, so a state that opens a view must close it, and the
   close lever must match how the view was shown — Showcase is CLASS-shown and
   OC Colors is DISPLAY-shown, which is the whole of defect 2. Use the shell's
   own hideAllViews(), which already knows the difference, rather than writing
   display:none from here and reproducing the bug inside the instrument. */
const wait = ms => new Promise(r => setTimeout(r, ms));
const wide = () => (window.innerWidth || 0) >= 820;

window.__sentinelStates = [

  /* The sign-in screen, before anything else. It is the first thing anyone
     sees and it was carrying an unreadable wordmark. A no-op state, because
     the page already renders it — the point is that it gets PROBED. */
  { name: 'signin', run: async () => { await wait(150); } },

  /* Signed in, through the real submit handler rather than around it. */
  { name: 'launcher', run: async () => {
      document.getElementById('srEmail').value = 'theo@cardinalrenovations.net';
      document.getElementById('srPass').value = 'sentinel';
      document.getElementById('srForm').dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true }));
      await wait(500);
      location.hash = '#/project/11111111-1111-4111-8111-111111111111';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      await wait(600);
    } },

  /* The same screen with the signing response carrying NO `path` key. The map
     must still key by the path that was requested. If a future edit reverts to
     keying by the response, this state goes black and COLLAPSE fires. */
  { name: 'nopath', run: async () => {
      window.__srSignShape = 'nopath';
      location.hash = '';
      location.hash = '#/project/11111111-1111-4111-8111-111111111111';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      await wait(700);
      window.__srSignShape = 'full';
    } },

  /* A project with no photographs at all — a real screen, and the one a rep
     hits on a job nobody has shot yet. */
  { name: 'nophotos', run: async () => {
      location.hash = '#/project/22222222-2222-4222-8222-222222222222';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      await wait(600);
    } },

  { name: 'showcase', run: async () => {
      window.CardinalShowcase.open();
      await wait(700);
    } },

  { name: 'hall', run: async () => {
      const b = document.querySelector('#cr-show [data-tab="work"]');
      if (b) b.click();
      await wait(700);
    } },

  { name: 'walk', run: async () => {
      const b = document.querySelector('#cr-show [data-tab="walk"]');
      if (b) b.click();
      await wait(700);
    } },

  /* Build 590's presentation surface: no back arrow, no admin chrome, the
     hold-✕ as the way out. open() falls back to the ordinary Showcase below
     820px on purpose ("presenting in phone wouldn't be very good"), so at a
     phone width this state deliberately checks the fallback instead. */
  { name: 'showroom', run: async () => {
      window.CardinalShowcase.close(false);
      await wait(200);
      window.CardinalShowcase.open({ showroom: wide() });
      await wait(700);
    } },

  { name: 'colors_hub', run: async () => {
      window.hideAllViews();
      await wait(200);
      window.CardinalColors.open();
      await wait(700);
    } },

  { name: 'colors_line', run: async () => {
      const card = document.querySelector('#cr-occ [data-line], #cr-occ .occ-line');
      if (card) card.click();
      await wait(600);
    } },

  { name: 'colors_detail', run: async () => {
      const sw = document.querySelector('#cr-occ [data-slug], #cr-occ .occ-card');
      if (sw) sw.click();
      await wait(700);
    } },

  /* PRESENT. A DISPLAY boundary, not an authentication one — it changes what
     is drawn and never what may be fetched. What it must not do is leave a
     control clipped or unreachable, which is exactly defect 5. */
  { name: 'present', run: async () => {
      window.hideAllViews();
      await wait(200);
      const b = document.getElementById('srPres');
      if (b) b.click();
      await wait(400);
    } },

  /* THE STATE PRODUCTION IS ACTUALLY IN. One showcase pair, one workmanship
     pair, zero walks — measured 31 Aug. Empty the tables and reload so the
     empty rails are rendered at least once, then hand the page back in
     Prepare mode for a clean --since comparison. */
  { name: 'empty', run: async () => {
      const b = document.getElementById('srPrep');
      if (b) b.click();
      await wait(200);
      window.__srTables.showcase_pairs = [];
      window.__srTables.workmanship_pairs = [];
      window.__srTables.walks = [];
      window.__srTables.walk_shots = [];
      window.__srTables.oc_colors = [];
      try { await window.CardinalShowcase.reload(); } catch (_) {}
      window.CardinalShowcase.open();
      await wait(800);
    } }
];
