# Responsive Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar una interfaz responsive en movil, tablet, laptop y desktop, con navbar publica off-canvas, hero fluido y shells principales sin overflow, sin cambiar Auth, rutas, datos ni backend.

**Architecture:** `SiteNavbar` conservara Auth, roles y rutas, pero delegara el panel movil a `MobileNavDrawer` y consumira una definicion unica de enlaces. Los estilos responsive nuevos viviran en archivos enfocados importados despues de `index.css`, para sobreescribir de forma predecible el CSS historico sin reescribirlo. Los shells lector, creador y admin conservaran su estructura y datos; solo obtendran controles de navegacion compacta donde el CSS no sea suficiente.

**Tech Stack:** React 18, React Router 6, CSS, Material Symbols Rounded, Node 18 `node:test`, Vite 5.

---

## File map

- Create `leyendas-de-bacalar/frontend/src/components/ui/siteNavigation.js`: definicion pura de destinos visibles.
- Create `leyendas-de-bacalar/frontend/src/components/ui/siteNavigation.test.js`: pruebas de enlaces por sesion y rol.
- Create `leyendas-de-bacalar/frontend/src/components/ui/MobileNavDrawer.jsx`: drawer accesible y cleanup de scroll/foco.
- Modify `leyendas-de-bacalar/frontend/src/components/ui/SiteNavbar.jsx`: una sola fuente de navegacion y control del drawer.
- Create `leyendas-de-bacalar/frontend/src/styles/responsive-navigation.css`: navbar, drawer y estados responsive.
- Create `leyendas-de-bacalar/frontend/src/styles/responsive-layouts.css`: hero, contenedores, grids y shells.
- Modify `leyendas-de-bacalar/frontend/src/main.jsx`: importar ambos archivos despues del CSS existente.
- Modify `leyendas-de-bacalar/frontend/src/components/dashboard/DashboardShell.jsx`: navegacion compacta del lector.
- Modify `leyendas-de-bacalar/frontend/src/components/dashboard/Sidebar.jsx`: id, estado abierto y cierre por ruta.
- Modify `leyendas-de-bacalar/frontend/src/components/dashboard/CreatorShell.jsx`: toggle y backdrop para sidebar movil.
- Modify `leyendas-de-bacalar/frontend/src/components/ui/AdminPrimitives.jsx`: toggle y backdrop para sidebar movil.
- Modify paginas activas solo si la inspeccion visual demuestra overflow que no pueda resolverse en primitivas.

### Task 1: Lock navigation rules with a pure model

**Files:**
- Create: `leyendas-de-bacalar/frontend/src/components/ui/siteNavigation.js`
- Create: `leyendas-de-bacalar/frontend/src/components/ui/siteNavigation.test.js`

- [ ] **Step 1: Write the failing navigation tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSiteNavigation } from './siteNavigation.js';

test('visitor receives public destinations and auth actions', () => {
  const model = buildSiteNavigation({ isAuthenticated: false, isCreator: false, isAdmin: false });
  assert.deepEqual(model.links.map(({ label }) => label), ['Inicio', 'Biblioteca', 'Acerca de', 'Creador']);
  assert.deepEqual(model.sessionActions.map(({ label }) => label), ['Iniciar sesion', 'Registro']);
});

test('authenticated creator receives redeem and creator dashboard destinations', () => {
  const model = buildSiteNavigation({ isAuthenticated: true, isCreator: true, isAdmin: false });
  assert.equal(model.links.find(({ label }) => label === 'Creador').to, '/creator');
  assert.equal(model.links.some(({ label }) => label === 'Canjear codigo'), true);
  assert.equal(model.links.some(({ label }) => label === 'Admin'), false);
});

test('admin destination is role-gated', () => {
  const model = buildSiteNavigation({ isAuthenticated: true, isCreator: false, isAdmin: true });
  assert.equal(model.links.at(-1).to, '/admin');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test src/components/ui/siteNavigation.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `siteNavigation.js`.

- [ ] **Step 3: Implement the minimal navigation model**

```js
export function buildSiteNavigation({ isAuthenticated, isCreator, isAdmin }) {
  const links = [
    { label: 'Inicio', to: '/', icon: 'home' },
    { label: 'Biblioteca', to: '/reader/library', icon: 'local_library' },
    { label: 'Acerca de', to: '/#acerca', icon: 'info' },
    { label: 'Creador', to: isAuthenticated && isCreator ? '/creator' : '/creator/apply', icon: 'edit_square' },
  ];
  if (isAuthenticated) links.push({ label: 'Canjear codigo', to: '/reader/redeem', icon: 'redeem' });
  if (isAdmin) links.push({ label: 'Admin', to: '/admin', icon: 'admin_panel_settings' });

  return {
    links,
    sessionActions: isAuthenticated
      ? [{ label: 'Salir', action: 'signOut', icon: 'logout' }]
      : [
          { label: 'Iniciar sesion', action: 'login', icon: 'login' },
          { label: 'Registro', action: 'register', icon: 'person_add' },
        ],
  };
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `node --test src/components/ui/siteNavigation.test.js`

Expected: 3 passing tests, 0 failures.

- [ ] **Step 5: Commit the model**

```bash
git add leyendas-de-bacalar/frontend/src/components/ui/siteNavigation.js leyendas-de-bacalar/frontend/src/components/ui/siteNavigation.test.js
git commit -m "test: define responsive site navigation rules"
```

### Task 2: Build the accessible mobile drawer

**Files:**
- Create: `leyendas-de-bacalar/frontend/src/components/ui/MobileNavDrawer.jsx`
- Modify: `leyendas-de-bacalar/frontend/src/components/ui/SiteNavbar.jsx`
- Create: `leyendas-de-bacalar/frontend/src/styles/responsive-navigation.css`
- Modify: `leyendas-de-bacalar/frontend/src/main.jsx`

- [ ] **Step 1: Add the drawer component with explicit interaction contracts**

Implement `MobileNavDrawer` with props `open`, `links`, `displayName`, `initial`, `isAuthenticated`, `loginPath`, `registerPath`, `onClose`, `onSignOut`, and `returnFocusRef`. Its effect must:

```js
useEffect(() => {
  if (!open) return undefined;
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  closeButtonRef.current?.focus();
  const onKeyDown = (event) => event.key === 'Escape' && onClose();
  document.addEventListener('keydown', onKeyDown);
  return () => {
    document.body.style.overflow = previousOverflow;
    document.removeEventListener('keydown', onKeyDown);
    returnFocusRef.current?.focus();
  };
}, [open, onClose, returnFocusRef]);
```

Render a fixed root with `aria-hidden={!open}`, a backdrop button, and a panel using `role="dialog"`, `aria-modal="true"`, `aria-labelledby="mobile-nav-title"`. Use `AppIcon` for `close`, each navigation icon, `person`, `language`, `facebook`, `music_note`, and `logout`. Every route link calls `onClose`; logout awaits `onSignOut` and then closes.

- [ ] **Step 2: Replace duplicated navbar markup with the shared model**

In `SiteNavbar.jsx`:

- Add `useCallback`, `useMemo`, `useRef`, `useState`.
- Call `buildSiteNavigation({ isAuthenticated, isCreator, isAdmin })` once.
- Render the desktop links from `navigation.links`.
- Preserve current redirect-safe login and registration paths.
- Always render a real logo link, including Home; remove the empty Home placeholder.
- Add a mobile action group with optional authenticated avatar and hamburger.
- Pass all values to `MobileNavDrawer`.
- Close the drawer on `location.pathname`, `location.search`, or `location.hash` change.

The toggle contract is:

```jsx
<button
  ref={menuButtonRef}
  className="site-nav-mobile-toggle"
  type="button"
  aria-label="Abrir menu de navegacion"
  aria-expanded={drawerOpen}
  aria-controls="mobile-site-navigation"
  onClick={() => setDrawerOpen(true)}
>
  <AppIcon name="menu" size={26} />
</button>
```

- [ ] **Step 3: Add isolated navbar and drawer CSS**

`responsive-navigation.css` must define:

```css
.site-header-centered { width: 100%; max-width: none; min-width: 0; }
.site-nav-mobile-actions, .site-nav-mobile-toggle { display: none; }
.mobile-nav-drawer { position: fixed; inset: 0; z-index: 100; pointer-events: none; visibility: hidden; }
.mobile-nav-drawer.is-open { pointer-events: auto; visibility: visible; }
.mobile-nav-drawer__backdrop { position: absolute; inset: 0; border: 0; background: rgba(0, 5, 10, .58); opacity: 0; transition: opacity 220ms ease; }
.mobile-nav-drawer__panel { position: absolute; inset: 0 0 0 auto; width: min(88vw, 380px); height: 100dvh; overflow-y: auto; padding: max(20px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom)); background: rgba(3, 25, 38, .97); border-left: 1px solid rgba(159, 232, 242, .16); box-shadow: -28px 0 72px rgba(0, 0, 0, .42); backdrop-filter: blur(22px); transform: translateX(100%); transition: transform 220ms cubic-bezier(.22, 1, .36, 1); }
.mobile-nav-drawer.is-open .mobile-nav-drawer__backdrop { opacity: 1; }
.mobile-nav-drawer.is-open .mobile-nav-drawer__panel { transform: translateX(0); }
.mobile-nav-drawer__link, .mobile-nav-drawer__close, .site-nav-mobile-toggle { min-height: 44px; min-width: 44px; }

@media (max-width: 1024px) {
  .site-header-centered { position: fixed; min-height: 68px; padding: 10px clamp(14px, 4vw, 28px); display: flex; justify-content: space-between; background: rgba(2, 24, 38, .86); backdrop-filter: blur(18px); border-bottom: 1px solid rgba(255, 255, 255, .08); }
  .site-header-centered .nav-left, .site-header-centered .nav-right { display: none; }
  .site-nav-mobile-actions, .site-nav-mobile-toggle { display: inline-flex; align-items: center; }
  .brand-center { order: initial; margin: 0; }
  .brand-center img { width: auto; height: 46px; }
}

@media (prefers-reduced-motion: reduce) {
  .mobile-nav-drawer__backdrop, .mobile-nav-drawer__panel { transition: none; }
}
```

Also style separated navigation, social, profile and session sections, visible focus rings, current route, full-width logout, and 12-16 px internal spacing.

- [ ] **Step 4: Import the stylesheet last**

```js
import './styles/index.css';
import './styles/responsive-navigation.css';
```

- [ ] **Step 5: Verify compile and navigation tests**

Run: `node --test src/components/ui/siteNavigation.test.js`

Expected: PASS.

Run: `npm.cmd run lint`

Expected: no warnings or errors introduced by the new components.

- [ ] **Step 6: Commit navbar and drawer**

```bash
git add leyendas-de-bacalar/frontend/src/main.jsx leyendas-de-bacalar/frontend/src/components/ui/SiteNavbar.jsx leyendas-de-bacalar/frontend/src/components/ui/MobileNavDrawer.jsx leyendas-de-bacalar/frontend/src/styles/responsive-navigation.css
git commit -m "feat: add responsive mobile navigation drawer"
```

### Task 3: Make the Home hero responsive without altering 3D behavior

**Files:**
- Create: `leyendas-de-bacalar/frontend/src/styles/responsive-layouts.css`
- Modify: `leyendas-de-bacalar/frontend/src/main.jsx`
- Verify only: `leyendas-de-bacalar/frontend/src/pages/public/HomePage.jsx`

- [ ] **Step 1: Capture the failing visual baseline**

At 375x812 and 768x1024, record before screenshots and evaluate:

```js
({
  viewport: [window.innerWidth, window.innerHeight],
  documentWidth: document.documentElement.scrollWidth,
  hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  heroTitle: document.querySelector('.home-hero-copy h1')?.getBoundingClientRect().toJSON(),
  heroActions: [...document.querySelectorAll('.home-hero-copy .actions-row a')].map((node) => node.getBoundingClientRect().toJSON()),
})
```

Expected baseline: navbar is broken at narrow widths and/or hero geometry does not meet the approved layout.

- [ ] **Step 2: Add global responsive foundations and hero overrides**

Create `responsive-layouts.css` with:

```css
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { width: 100%; min-height: 100%; }
html, body { max-width: 100%; overflow-x: clip; }
img, video, svg { max-width: 100%; height: auto; }
.container-responsive { width: min(1180px, calc(100% - clamp(24px, 5vw, 80px))); margin-inline: auto; }
.responsive-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: clamp(16px, 2vw, 28px); }

@media (max-width: 1024px) {
  .hero-content { width: min(100% - clamp(28px, 6vw, 64px), 820px); padding-top: 108px; grid-template-columns: minmax(0, 1fr); gap: clamp(16px, 4vw, 32px); }
  .home-hero-copy { max-width: 680px; gap: clamp(14px, 3vw, 22px); }
  .home-hero-copy h1 { font-size: clamp(3.25rem, 10vw, 6.3rem); line-height: .9; overflow-wrap: normal; }
  .home-book-stage { width: 100%; min-height: min(48vh, 430px); }
}

@media (max-width: 640px) {
  .home-hero { min-height: 100svh; align-items: start; }
  .hero-background { background-position: 64% center; background-size: cover; }
  .hero-content { width: min(100% - 28px, 560px); padding-top: 94px; padding-bottom: 32px; }
  .home-hero-copy h1 { font-size: clamp(2.75rem, 14vw, 4.6rem); line-height: .92; }
  .home-hero-copy > p { font-size: clamp(.96rem, 4vw, 1.05rem); line-height: 1.6; }
  .home-hero-copy .actions-row { width: 100%; gap: 12px; }
  .home-hero-copy .actions-row > a, .home-hero-copy .actions-row .btn { width: 100%; }
  .home-book-stage { min-height: min(88vw, 360px); }
  .floating-book-shell { width: min(88vw, 360px); height: min(88vw, 360px); }
}
```

Do not change `HomePage` lazy loading, observer, timer fallback or `FloatingBook`.

- [ ] **Step 3: Import responsive layouts after navigation CSS**

```js
import './styles/index.css';
import './styles/responsive-navigation.css';
import './styles/responsive-layouts.css';
```

- [ ] **Step 4: Verify hero geometry**

Repeat the Step 1 script at 375, 640, 768 and 1024 px.

Expected: `hasHorizontalOverflow === false`; each mobile action width equals the available copy width within 2 px; title remains inside viewport.

- [ ] **Step 5: Commit hero and global foundations**

```bash
git add leyendas-de-bacalar/frontend/src/main.jsx leyendas-de-bacalar/frontend/src/styles/responsive-layouts.css
git commit -m "style: adapt landing hero across breakpoints"
```

### Task 4: Make public, Auth and reader surfaces fluid

**Files:**
- Modify: `leyendas-de-bacalar/frontend/src/styles/responsive-layouts.css`
- Modify if evidence requires markup hooks: `leyendas-de-bacalar/frontend/src/pages/public/CatalogPage.jsx`
- Modify if evidence requires markup hooks: `leyendas-de-bacalar/frontend/src/components/legend/LegendHero.jsx`
- Modify if evidence requires markup hooks: `leyendas-de-bacalar/frontend/src/pages/auth/LoginPage.jsx`
- Modify if evidence requires markup hooks: `leyendas-de-bacalar/frontend/src/pages/auth/RegisterPage.jsx`
- Modify if evidence requires markup hooks: `leyendas-de-bacalar/frontend/src/pages/reader/LibraryPage.jsx`
- Modify if evidence requires markup hooks: `leyendas-de-bacalar/frontend/src/pages/reader/RedeemCodePage.jsx`

- [ ] **Step 1: Run a route-level overflow audit before edits**

For `/catalog`, one available `/legend/:slug`, `/login`, `/register`, `/reader/library` and `/reader/redeem`, evaluate:

```js
const offenders = [...document.querySelectorAll('body *')]
  .filter((node) => {
    const rect = node.getBoundingClientRect();
    return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1;
  })
  .map((node) => ({ tag: node.tagName, className: node.className, rect: node.getBoundingClientRect().toJSON() }));
({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, offenders });
```

Expected baseline: capture concrete offending selectors; do not change pages without an offender.

- [ ] **Step 2: Add shared public/Auth/reader rules**

Add targeted rules for:

```css
.page-container, .page-stack, .reader-library, .detail-page, .auth-experience, .register-experience { min-width: 0; }
.catalog-grid, .reader-action-grid { grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr)); gap: clamp(16px, 2.4vw, 28px); }
.legend-card, .reader-action-card, .card, .auth-card { min-width: 0; max-width: 100%; }
.legend-hero__layout { grid-template-columns: minmax(180px, 300px) minmax(0, 1fr); }
.legend-hero__title { font-size: clamp(2.25rem, 7vw, 5.6rem); overflow-wrap: anywhere; }
.admin-table-wrap { max-width: 100%; overflow-x: auto; overscroll-behavior-inline: contain; }

@media (max-width: 760px) {
  .page-container { width: 100%; padding-inline: clamp(14px, 4vw, 20px); }
  .auth-page { padding: 18px 14px; }
  .auth-experience, .register-experience, .legend-hero__layout { grid-template-columns: minmax(0, 1fr); }
  .auth-card, .register-card { width: 100%; padding: clamp(20px, 6vw, 30px); }
  .social-row { display: grid; grid-template-columns: 1fr; }
  .legend-hero__cover { width: min(220px, 64vw); margin-inline: auto; }
  .legend-hero__actions { display: grid; grid-template-columns: 1fr; }
  .legend-hero__actions > *, .legend-hero__actions .glass-button { width: 100%; }
  .reader-hero-panel, .library-empty-card { padding: clamp(20px, 6vw, 32px); }
}
```

Exclude `canvas` from the global media rule; 3D and reader canvases keep component-owned dimensions.

- [ ] **Step 3: Add markup hooks only for remaining offenders**

If the audit still reports an offender, add one semantic class to its nearest existing wrapper and target that class in `responsive-layouts.css`. Do not alter service calls, state, button handlers, route targets or displayed data.

- [ ] **Step 4: Re-run the audit**

Expected: no page-level horizontal overflow at 375, 640, 768 and 1024 px. Tables may scroll inside `.admin-table-wrap`; the document must not scroll horizontally.

- [ ] **Step 5: Commit public/Auth/reader corrections**

Stage `responsive-layouts.css` plus only the page files actually changed and commit:

```bash
git commit -m "style: make public auth and reader views fluid"
```

### Task 5: Collapse reader dashboard navigation on mobile

**Files:**
- Modify: `leyendas-de-bacalar/frontend/src/components/dashboard/DashboardShell.jsx`
- Modify: `leyendas-de-bacalar/frontend/src/components/dashboard/Sidebar.jsx`
- Modify: `leyendas-de-bacalar/frontend/src/styles/responsive-layouts.css`

- [ ] **Step 1: Add state and route-close behavior**

In `DashboardShell`, use `useLocation`, `useEffect`, and `useState`. Close the sidebar whenever `location.pathname` changes and on Escape. Add a button before the content:

```jsx
<button
  className="dashboard-sidebar-toggle"
  type="button"
  aria-controls="reader-dashboard-sidebar"
  aria-expanded={sidebarOpen}
  onClick={() => setSidebarOpen(true)}
>
  <AppIcon name="menu" /> Menu de lector
</button>
```

Pass `id="reader-dashboard-sidebar"`, `open={sidebarOpen}`, and `onClose` to `Sidebar`. Render a backdrop button with an accessible close label.

- [ ] **Step 2: Make Sidebar accept state without changing destinations**

```jsx
function Sidebar({ title, items, id, open = false, onClose }) {
  return (
    <aside id={id} className={`sidebar${open ? ' is-open' : ''}`}>
      <div className="sidebar-mobile-heading">
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar menu"><AppIcon name="close" /></button>
      </div>
      <nav>{items.map((item) => <NavLink key={item.to} to={item.to} onClick={onClose}>{item.label}</NavLink>)}</nav>
    </aside>
  );
}
```

- [ ] **Step 3: Add off-canvas reader sidebar CSS below 900 px**

The sidebar is fixed below the 68 px site header, has width `min(86vw, 320px)`, `height: calc(100dvh - 68px)`, scrolls internally, translates left while closed, and uses z-index below the site drawer but above page content. Desktop retains the existing grid.

- [ ] **Step 4: Verify reader routes**

At 375 and 768 px verify menu open, close button, backdrop, route-close and Escape. Confirm `/reader/library`, `/reader/redeem`, `/reader/purchases`, `/reader/subscription` and `/reader/profile` remain the original destinations.

- [ ] **Step 5: Commit reader shell**

```bash
git add leyendas-de-bacalar/frontend/src/components/dashboard/DashboardShell.jsx leyendas-de-bacalar/frontend/src/components/dashboard/Sidebar.jsx leyendas-de-bacalar/frontend/src/styles/responsive-layouts.css
git commit -m "feat: collapse reader navigation on mobile"
```

### Task 6: Collapse creator and admin sidebars without changing permissions

**Files:**
- Modify: `leyendas-de-bacalar/frontend/src/components/dashboard/CreatorShell.jsx`
- Modify: `leyendas-de-bacalar/frontend/src/components/ui/AdminPrimitives.jsx`
- Modify: `leyendas-de-bacalar/frontend/src/styles/responsive-layouts.css`

- [ ] **Step 1: Add independent mobile navigation state to CreatorShell**

Add `navigationOpen`, close it when `location.pathname` changes, and render a header toggle with `aria-controls="creator-navigation"`. Give the existing aside that id and `is-open` class. Add a backdrop button immediately after the aside. Existing `menuOpen`, sign-out and item mapping remain unchanged.

- [ ] **Step 2: Add the equivalent state to AdminLayoutShell**

Add `navigationOpen`, route-close behavior, `aria-controls="admin-navigation"`, id/class on the existing aside, and an admin backdrop. Do not edit `adminNavItems`, `RoleGuard`, `signOut`, tables or admin actions.

- [ ] **Step 3: Add shared shell rules**

Below 1024 px:

- `.creator-sidebar` and `.admin-sidebar` become fixed off-canvas panels.
- `.creator-main` and `.admin-main` use the full viewport width with `min-width: 0`.
- header context text truncates instead of forcing overflow.
- calendar/location cards hide progressively while avatar and menu remain.
- sidebar toggles remain at least 44 px.
- active navigation and labels remain visible inside opened panels.

Below 640 px, reduce header padding, hide nonessential mode/date chips, constrain dropdowns to `calc(100vw - 28px)`, and stack editor/review action groups without changing handlers.

- [ ] **Step 4: Verify permission-sensitive routes**

With available sessions, load `/creator`, `/creator/legends`, `/creator/legends/new`, `/admin`, and `/admin/users`. Confirm drawer navigation only exposes the existing items and no Auth/role logic changed. If sessions are unavailable, record those checks as unverified rather than passing.

- [ ] **Step 5: Commit dashboard shells**

```bash
git add leyendas-de-bacalar/frontend/src/components/dashboard/CreatorShell.jsx leyendas-de-bacalar/frontend/src/components/ui/AdminPrimitives.jsx leyendas-de-bacalar/frontend/src/styles/responsive-layouts.css
git commit -m "feat: add responsive creator and admin navigation"
```

### Task 7: Final visual audit, builds and regression report

**Files:**
- Modify only files with a demonstrated remaining overflow defect.

- [ ] **Step 1: Run automated checks**

Run in `leyendas-de-bacalar/frontend`:

```bash
node --test src/components/ui/siteNavigation.test.js
npm.cmd run lint
npm.cmd run build
```

Expected: navigation tests pass, lint has zero warnings, Vite build completes. If Vite fails with a OneDrive/sandbox permission error, repeat only the build outside the sandbox before diagnosing code.

- [ ] **Step 2: Run the viewport matrix**

Verify widths 375, 640, 768, 1024, 1366 and 1440 on Home, Catalog, detail, login, register, library and redeem. For authenticated routes, verify creator and admin when sessions exist. At each route run:

```js
({
  width: innerWidth,
  horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  activeElement: document.activeElement?.outerHTML,
  bodyOverflow: document.body.style.overflow,
})
```

Expected: `horizontalOverflow === false`; body overflow is restored after drawers close.

- [ ] **Step 3: Verify mobile navigation interaction**

At 375 px verify hamburger, close button, backdrop, Escape, route selection, focus restoration, scroll lock, profile link, social links and logout control. At 1025 px verify desktop navbar is horizontal and no mobile toggle is visible.

- [ ] **Step 4: Verify protected regression targets**

Do not modify data while unauthenticated. With safe test accounts only, smoke-test login/logout, role routing, creator draft listing and state-based actions, `/admin`, and `/admin/users`. Report any unavailable real-session checks explicitly.

- [ ] **Step 5: Inspect scope**

Run from repo root:

```bash
git status --short
git diff --check
git diff --stat HEAD~1
```

Expected: no `node_modules`, backend, SQL, `.env`, deploy or unrelated local files in the responsive diff.

- [ ] **Step 6: Commit final demonstrated corrections**

Stage only responsive frontend files that remain after review and commit:

```bash
git commit -m "fix: close responsive layout edge cases"
```

- [ ] **Step 7: Report exact evidence**

Use the repository-required closeout: summary, exact cause, modified files, changes, no-touch confirmations, frontend build, tests, unavailable session checks, `git status --short`, `git diff --stat`, pending items and risks.
