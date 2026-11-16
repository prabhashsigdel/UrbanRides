# UrbanRides design system

The category-standard rental look at Airbnb-level polish: white ground, near-black ink, one deep-teal accent. Search comes first and vehicles second, with nothing decorative in between. Tokens live in `frontend/src/styles/tokens.css`; shared primitives (buttons, inputs, page scaffolding) live in `frontend/src/styles/global.css`.

## Color

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#ffffff` | Page ground, cards, menus |
| `--color-surface` | `#f6f7f6` | Footer, empty photo slots, hover fills, segmented tracks |
| `--color-surface-strong` | `#eceeec` | Skeleton shimmer highlight |
| `--color-ink` | `#1b1f1e` | Text, active tab underline, avatar |
| `--color-ink-muted` | `#3d4441` (dark: `#d3d9d6`) | Secondary text, kept close to the main text colour on purpose |
| `--color-line` | `#e2e5e3` | Dividers, card borders |
| `--color-line-strong` | `#c9cecb` | Input borders, secondary buttons |
| `--color-accent` | `#0e6b59` | Primary buttons, focus ring, wordmark "Rides", available switch |
| `--color-accent-hover` | `#0a5546` | Primary button hover |
| `--color-accent-soft` | `#e5f1ee` | Selection, row being edited |
| `--color-danger` | `#b42318` | Field errors, destructive buttons |

Dark mode swaps every colour token (ground `#121514`, ink `#eef1ef`, secondary text `#d3d9d6`, accent `#3dbb9c` with dark text on it). It follows the system setting until the visitor uses the sun/moon toggle in the navbar; the choice is saved in localStorage (`theme`) and applied by an inline script in `index.html` before first paint.

The accent is only for actions and focus. State is never shown by colour alone: unavailable vehicles carry a text label, and errors carry a message.

## Type

- One family: **Figtree Variable** (self-hosted via `@fontsource-variable/figtree`), with a system sans fallback.
- Scale: `--text-xs` 13px, `--text-sm` 14px, `--text-base` 16px, `--text-lg` 18px, `--text-xl` 22px, `--text-2xl` fluid 26–34px, `--text-hero` fluid 36–64px.
- Headings 700–800 with −0.02 to −0.035em tracking. Body 400, line-height 1.5.
- Every price and date uses tabular numerals (`.tabular`). Prices are formatted `Rs 3,500` (en-IN grouping).

## Space, shape and elevation

- Spacing steps `--space-1`…`--space-8` (4, 8, 12, 16, 24, 32, 48, 72px). The fluid page gutter is `--gutter`, and content is capped at 1360px. The root font size steps up to 17px at 1024px wide and 18px at 1600px, so text and spacing grow slightly on large screens.
- Radii: 8px small controls, 12px inputs and buttons, 16px cards and photos, pill for the search bar, nav links, chips and account trigger.
- One elevation level, `--shadow-raised`, on raised controls only (search bar, booking summary, account trigger hover). `--shadow-pop` is for floating menus and toasts.

## Components

- **Navbar:** sticky white bar with the wordmark left and Cars, Bikes, About, Contact on the right. Log in and Sign up show when signed out, an avatar account menu when signed in. Below 820px it becomes a full-screen menu.
- **SearchBar:** pill with All/Cars/Bikes chips, Pickup and Return dates, and a Search button. It stacks into a card below 860px. `showType={false}` gives a dates-only version for the vehicles page.
- **TypeTabs:** text tabs with a GSAP-sliding underline.
- **VehicleCard:** 4:3 photo (or an icon placeholder), model, type and price per day. The whole card links to booking. Unavailable cards are dimmed with a label and don't link.
- **StateBlock:** dashed-outline empty and error state with an optional action.
- **Booking:** form sections (Pickup, Return, Contact) beside a sticky summary card showing the estimated total.
- **Lists** (My bookings, Admin fleet): divider-separated rows rather than cards. Destructive actions confirm inline (Keep / Yes, cancel).

## Motion

- GSAP (`gsap`, `@gsap/react` `useGSAP`, `Flip`), registered in `frontend/src/lib/motion.js`.
- Entrances: `expo.out`, 0.6–0.9s, 16–24px rise, 40–80ms stagger, `clearProps` afterwards. These run once per page: hero, fleet grid, booking, orders, auth card.
- Signature: switching Cars/Bikes reflows the grid with `Flip` (0.5s `power3.inOut`). New cards fade up.
- UI feedback is CSS: 140ms press scale 0.97, 180ms menu fade/scale from its trigger corner, hovers gated behind `(hover: hover)`.
- `prefers-reduced-motion` skips every GSAP entrance and Flip and near-zeroes CSS transitions.

## Rules

- No eyebrow labels, decorative dots, badges, gradient text, glass, or invented stats, reviews or claims.
- Contact details are placeholders until launch (`frontend/src/pages/Info.jsx`).
- The API base URL comes from `VITE_API_URL` (defaults to `http://localhost:8080`).
