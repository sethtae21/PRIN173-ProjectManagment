# Manual evidence capture session

The Jira export marks the listed tickets Done. Capture the following evidence in
one browser session. Start the frontend at `http://localhost:5173` and use the
named route; sign in with the appropriate role where required. Save screenshots
at the exact repository paths shown. Do not mark a capture complete until the
image exists.

## Figma prototype

| Ticket | URL / route | Action | Expected result | Required filename |
|---|---|---|---|---|
| KAN-42 | https://www.figma.com/design/Xf2GQEuKbp8JRts4rCkRrX/FitFusion-Wireframe?node-id=0-1&t=nQa7sxoFwsRrDaT8-1 | Open the approved prototype and export/capture its login, account, avatar, try-on, catalog, recommendation, cart/checkout/order, and Seller Dashboard designs. | The linked prototype is accessible and contains all MVP screen designs described by the ticket. | `docs/evidence/KAN-42/figma-prototype.pdf` |

## Public landing and Guest pages

| Ticket | URL / route | Action | Expected result | Required filename |
|---|---|---|---|---|
| KAN-106 | http://localhost:5173/ | Show the landing page and its Log In, Sign Up, and Continue-as-Guest actions; spot-check keyboard/contrast and 320px, desktop, and 4K widths. | Landing page and shopper navigation shell render; entry actions work and the page passes the listed visual checks. | `docs/evidence/KAN-106/landing-page.png` |
| KAN-113 | http://localhost:5173/guest | Open the Guest home page. | Guest home renders with the expected guest entry/navigation. | `docs/evidence/KAN-113/guest-home.png` |
| KAN-113 | http://localhost:5173/guest | Spot-check Guest pages at 320px and 4K widths, plus keyboard navigation, contrast, and alt text. | Guest screens meet the ticket's responsive and WCAG AA spot-check criteria. | `docs/evidence/KAN-113/guest-responsive-320.png`; `docs/evidence/KAN-113/guest-responsive-4k.png` |
| KAN-113 | http://localhost:5173/guest/catalog | Show catalog browsing and the filter bar. | Guest can see the placeholder catalog and filter controls without backend calls. | `docs/evidence/KAN-113/guest-catalog.png` |
| KAN-113 | http://localhost:5173/guest/fitting-studio | Open the Guest avatar setup page. | Guest avatar setup is available without an account. | `docs/evidence/KAN-113/guest-avatar-setup.png` |
| KAN-113 | http://localhost:5173/guest/fitting-studio/customize | Show the Guest customization canvas and Front/Rear controls. | Guest customization shell and view controls render. | `docs/evidence/KAN-113/guest-avatar-customize.png` |
| KAN-113 | http://localhost:5173/guest/avatar-presets | Attempt to save or manage a preset as Guest. | Guest sees the sign-up prompt; no registered-user preset is shown as saved. | `docs/evidence/KAN-113/guest-preset-prompt.png` |

## Registered User pages

Sign in as a Registered User before opening these routes.

| Ticket | URL / route | Action | Expected result | Required filename |
|---|---|---|---|---|
| KAN-114 | http://localhost:5173/shopper/avatar-presets | Open preset management. | Placeholder list and designed empty/loading/error states render. | `docs/evidence/KAN-114/shopper-presets.png` |
| KAN-114 | http://localhost:5173/shopper/saved-outfits | Open outfit management. | Placeholder outfit list and designed states render. | `docs/evidence/KAN-114/shopper-outfits.png` |
| KAN-114 | http://localhost:5173/shopper/cart | Open the shopping cart. | Cart placeholder and designed states render. | `docs/evidence/KAN-114/shopper-cart.png` |
| KAN-114 | http://localhost:5173/shopper/checkout | Open checkout and show the mock-payment screen. | Checkout placeholder and designed states render; no real payment is made. | `docs/evidence/KAN-114/shopper-checkout.png` |
| KAN-114 | http://localhost:5173/shopper/orders | Open order history. | Order-history placeholder and designed states render. | `docs/evidence/KAN-114/shopper-orders.png` |
| KAN-114 | http://localhost:5173/shopper/account and http://localhost:5173/shopper/account/edit | Show account view and edit screens. | Account-management placeholders and designed states render. | `docs/evidence/KAN-114/shopper-account.png` |
| KAN-114 | http://localhost:5173/shopper/fitting-studio/customize | Show the registered-user try-on/recommendation area and its placeholder rating-control placement. | Registered-user screen renders the ticket's placeholder UI; this capture does not prove KAN-102 rating behavior. | `docs/evidence/KAN-114/shopper-rating-placement.png` |
| KAN-57 | http://localhost:5173/shopper/fitting-studio/customize and http://localhost:5173/shopper/avatar-presets | As a Registered User, change creator controls, save a preset, reload, and show it restored in preset management. | The preview updates and the saved preset persists across reload. | `docs/evidence/KAN-57/avatar-creator-save-reload.png` |
| KAN-57 | http://localhost:5173/guest/fitting-studio/customize | As Guest, change the preview and attempt Save. | Guest can use the creator but receives a sign-up prompt; no registered preset is persisted. | `docs/evidence/KAN-57/avatar-guest-save-prompt.png` |

## Seller Dashboard

Sign in as a Seller before opening these routes.

| Ticket | URL / route | Action | Expected result | Required filename |
|---|---|---|---|---|
| KAN-66 | http://localhost:5173/seller/dashboard | Open the Seller Dashboard. | Dashboard navigation and seller summary render. | `docs/evidence/KAN-66/seller-dashboard.png` |
| KAN-66 | http://localhost:5173/seller/catalog-upload | Show the CSV upload and labeled Front/Rear image drop zones. | Upload controls and instructions are visible. | `docs/evidence/KAN-66/seller-upload.png` |
| KAN-66 | http://localhost:5173/seller/listings | Open the Seller's listings. | Listing management screen renders. | `docs/evidence/KAN-66/seller-listings.png` |
| KAN-66 | http://localhost:5173/seller/report | Open the validation report screen. | Validation report screen renders. | `docs/evidence/KAN-66/seller-report.png` |

## Jira board

| Ticket | URL / route | Action | Expected result | Required filename |
|---|---|---|---|---|
| KAN-78 | https://prin173projectmanagement.atlassian.net/browse/KAN-78 | From the issue page, open the project's active board/backlog and inspect its board columns and WBS-mapped issue hierarchy. | The configured board and WBS-mapped work are visible. The numeric board ID is not included in the supplied export. | `docs/evidence/KAN-78/jira-board-config.png` |

## Non-visual artifact gaps

These are not screenshot evidence. Their missing deliverables are listed so they
are not mistaken for completed captures:

| Ticket | Missing artifact to capture |
|---|---|
| KAN-71 | `docs/evidence/KAN-71/project-idea-document.pdf`, `docs/evidence/KAN-71/SRS-v1.0.md`, `docs/evidence/KAN-71/Scope-Baseline-v1.0.md`, and `docs/evidence/KAN-71/team-working-agreement-signed.pdf`. No Project Idea Document was found in `docs/Papers` or Git history; Git history contains only SRS and Scope Baseline v1.1, not v1.0. |
| KAN-72 | `docs/evidence/KAN-72/project-idea-document.pdf`. No Project Idea Document was found in `docs/Papers` or Git history. |
| KAN-73 | `docs/evidence/KAN-73/SRS-v1.0.md`. Git history contains SRS v1.1 only; no v1.0 commit or file was found. |
| KAN-74 | `docs/evidence/KAN-74/Scope-Baseline-v1.0.md`. Git history contains Scope Baseline v1.1 only; no v1.0 commit or file was found. |
| KAN-75 | `docs/evidence/KAN-75/team-working-agreement-signed.pdf` |
| KAN-79 | `docs/evidence/KAN-79/weekly-sprint-reports.pdf` |

Jira does not prescribe filenames for the Project Idea Document, SRS, Scope
Baseline, Team Working Agreement, or sprint reports; the paths above are the
capture filenames to use in this evidence set.
