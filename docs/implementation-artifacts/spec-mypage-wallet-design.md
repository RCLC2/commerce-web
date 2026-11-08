---
title: 'My Page address wallet and support sheet'
type: 'feature'
created: '2026-11-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

## Final Delivery (2026-11-08)

The final implementation is described in [the PR body](pr-mypage-wallet-design-body.md). The follow-up sections below preserve the iteration history; later requests supersede earlier address-wallet, order-filter-sheet and hover-preview designs. The delivered wallet has points-only Money information, original card artwork, selection-only updates, direct swipe/drag, 160px maximum card width, 16px spacing, and outside arrows. Orders retain inline filters; product/cart options use bottom sheets.

Latest targeted verification: 7 Vitest files / 40 tests and changed-file ESLint passed. The two continuous recordings use a local fixture API, not live PG transactions or real-device Safari. Videos are attached through GitHub, with links in the PR body.

<frozen-after-approval reason="user-requested intent">

## Intent

Update My Page using Figma UehRoDZu3UNpv2QSKeyP4m / 7:189 as the visual reference, preserving the existing pink design system and live account/order data. Present saved shipping addresses as credit/debit-card-inspired cards that users can swipe between, reserve an advertisement slot between the wallet and order history, and place a customer-service bottom-sheet trigger below order history. Preserve working address editing, add address registration using the existing form, and provide real account destinations plus local FAQ content. Capture desktop/mobile results and the open sheet.

Work with all open PR changes integrated locally. Preserve #45's evolved equivalents from squash #49, #55 already integrated into #57, and current #57; apply missing #58's two-line neutral recommendation copy. Do not publish, commit, or remotely merge without an explicit request. Preserve pre-existing untracked .agents/, _bmad/, and docs/party-mode/.

</frozen-after-approval>

## Implementation Notes

- Reuse MyPage queries, Button, Input, FilterChip, CheckoutAddressForm, and BottomSheet (focus trap, Escape, focus restoration, scroll lock). Changes are reversible frontend updates with no new dependencies, APIs, migrations, or external writes.
- Keep wallet logic in src/components/my-address-wallet.tsx and service sheet in src/components/my-page-support.tsx; compose in src/components/my-page.tsx. Preserve order search/status filtering and error/loading/guest states.
- Default address appears first. Card browsing does not change the saved default. Editing preserves address name/default flag; an explicit action sets the default. Empty state allows registration. Failures retain form input and allow retry.
- Native horizontal scroll snapping supports touch; arrow buttons and labeled pagination support keyboard users. Keep long addresses within cards and avoid page overflow.
- Figma context and screenshot fetched through MCP. Relevant existing Lucide icons and UI tokens match the reference. Product imagery stays API-supplied. Figma comments are login-gated in the browser; PRs have bot deployment comments and no inline review threads.
- Verify wallet mutation payloads, navigation, support sheet close/focus, guest/loading states, lint/type/build and screenshots at 1440px/390px with explicitly mocked account data.

- User refinement: use actual Korean card issuer designs. Adapted official Hyundai ZERO Edition3 (white/silver engraved lettering), Shinhan Mr.Life (red radial finish and black typography), and KB My WE:SH (pink circle/red/orange/white blocks). Card theme is stable by address ID, independently of default selection. No downloaded financial card image or third-party logo is used as a functional payment method.
- References: https://www.hyundaicard.com/cpc/cr/CPCCR0201_01.hc?cardwcd=MZROE3 ; https://www.shinhancard.com/pconts/images/contents/card/plate/cdCreditAUAARH.png ; https://card.kbcard.com/SVC/DVIEW/HSJMCXCROCIC0035 .

## Review Triage Log

- Medium, patched: existing customer E2E selectors depended on removed email/coupon presentation; updated to heading and new coupon shortcut.
- Medium, patched: cancellation FAQ described an unsupported customer action; restricted it to supported return behavior.
- Medium, patched: editable pending form inputs could lose later changes; disabled address fields during submission and verified pending Escape behavior.
- Low, patched: duplicate navigation/edit labels for a shared recipient; added index and street address context.
- Low, patched: checkout-specific submit wording implied selection; added optional submitLabel and use shipping-address-save wording in wallet.
- Follow-up review verified all five fixes and found no material new issue in the issuer themes.

## Verification

- Targeted Vitest: 4 files / 21 tests passed (wallet, My Page, address form, accessible overlays).
- Changed TypeScript/TSX files and updated E2E file: ESLint passed.
- Next.js production build and TypeScript checks passed; git diff --check passed.
- Full suite before final cosmetic refinement: 486 passed / 3 failed. All three failures independently reproduced against unchanged HEAD 0c15c8e973121fa4c9c473c84f8ed57dc71e65d1 in /tmp/commerce-web-baseline-wallet. Notification fixture expects retired response shape; two sponsored-banner assertions use the former image parent. No production behavior was changed to satisfy stale tests.
- Production Chromium validation with controlled API fixtures: no horizontal page overflow at 320/390/768/1440px; desktop final add card aligned within 2px of maximum scroll. Verified edit persistence/refetch, preservation of nondefault status, explicit default changes, stable issuer theme, FAQ expansion, Escape close and focus restoration.
- Pictures use fictional fixture account/address/order data and the existing product placeholder, not a live backend session. No remote PR merge, commit, push, or deployment performed.
- Screenshots: output/playwright/mypage-domestic-desktop.png, output/playwright/mypage-domestic-mobile.png, output/playwright/mypage-domestic-support-mobile.png. Repro scripts: output/playwright/mypage-wallet-setup.js and mypage-wallet-verify.js.

## Follow-up: Separate Customer Service and Usage Guidance

- User requested separate customer-service and usage-guidance entries. Each now has its own button, title, description, expanded state, and bottom-sheet content.
- Customer service contains delivery tracking and returns FAQs. Usage guidance contains saved-address/coupon instructions, account management links, and logout.
- Updated existing support tests to verify content separation, per-button expanded state, Escape focus restoration, and logout. Wallet/MyPage tests: 2 files / 9 tests passed; changed-file ESLint and production build passed.
- Browser validation: both sheets contain their own two topics; each closes with Escape and restores focus to its corresponding button. No mobile overflow. Captures: output/playwright/mypage-support-split-desktop.png, mypage-support-split-service.png, mypage-support-split-guide.png.

## Follow-up: Preserve Original Card Plates

- User requested stronger fidelity to actual cards. Replaced CSS approximations with unchanged issuer-hosted original front plate PNGs and a portrait 53.98:85.6 physical card proportion. Sideways source images rotate in CSS; none are redrawn, cropped into new artwork, or stretched. Address text, default status, and management actions live outside the card face.
- Local assets in public/images/address-cards/: hyundai-zero-edition3.png (604x956), shinhan-mr-life.png (1119x705), kb-my-wish.png (570x360). No external asset URL is used at runtime.
- Asset sources: https://img.hyundaicard.com/img/com/card/card_MZROE3_BY_f.png ; https://www.shinhancard.com/pconts/images/contents/card/plate/cdCreditAUAARH.png ; https://img1.kbcard.com/ST/img/cxc/kbcard/upload/img/product/09123_img.png .
- Existing wallet/MyPage tests: 2 files / 9 tests passed. ESLint and production build passed. Separate customer-service/usage-guidance entries preserved.
- Production browser evidence: all three local original assets loaded successfully; each plate renders at 256x405.95px with original image proportions preserved by contain. At 320/390/768/1440px, no horizontal page overflow and the final add card aligns correctly. Screenshots: output/playwright/mypage-original-plates-desktop.png, mypage-original-plates-mobile.png, mypage-original-plates-shinhan-mobile.png, mypage-original-plates-kb-mobile.png. Verification script: output/playwright/mypage-original-plates-verify.js.

## Follow-up: Order Filter Sheet and Visible Logout

- Moved both order/product keyword search and all existing order status options into a dedicated BottomSheet, opened by the order-history filter button. Edits stay in draft until Filter Apply; dismissing discards them. Reopening seeds the controls from applied conditions. Reset changes the draft; Apply commits it. Applied criteria and a clear action remain visible above the list.
- Moved logout out of Usage Guidance and placed it directly below the Customer Service / Usage Guidance buttons in the page.
- Tests verify combined status/search apply, dismissal, draft reset cancellation, applied reset, focus restoration and the logout position/callback. Relevant tests: 2 files / 10 passed. Changed-file ESLint and production build passed.
- Production browser validation passed: dismiss preserves applied conditions, status+keyword apply together, clear restores the list, logout is below both service entries and absent from the guide sheet. At 320x667 and 390x844, no page overflow and Apply remains visible. Captures: output/playwright/mypage-order-filter-sheet.png and mypage-orders-and-logout.png; script: output/playwright/mypage-order-filters-verify.js.

## Follow-up: Payment-Only Commerce Pay Wallet

- User explicitly replaced the address wallet with a payment-only wallet based on the supplied pay screenshot and selected "wallet UI + existing order payment handoff" rather than backend stored-card/money/QR expansion.
- Removed My Page address queries and address editing/registration from this area. Checkout shipping remains in its existing order flow. Deleted the superseded MyAddressWallet component/styles/tests and moved issuer artwork to public/images/payment-cards/.
- Implemented CommercePayWallet using Commerce pink, a white payment panel, segmented card/easy-payment tabs, a swipeable issuer artwork preview rail, real profile point balance, help sheet, and /checkout handoff. Card previews are explicitly labeled as previews; final cards and point use are selected in the existing checkout. No saved card identities, bank account digits, prepaid balance, barcode/QR payload, billing key, or financial storage is fabricated.
- Retained order filter sheet, reserved ad position, separate customer-service/usage-guidance sheets, and the page-level logout underneath. Updated usage guidance to payment/points instead of address-wallet instructions.
- Relevant Vitest: 5 files / 22 tests passed. Changed source/tests ESLint, production build, TypeScript, and diff whitespace checks passed. MyPage regression verifies no address API requests.
- Removed the now-unused CheckoutAddressForm submitLabel extension and restored the shared checkout form to the branch baseline; no checkout-payment or shipping business logic changed. Card previews reset consistently when switching payment modes. Final relevant tests remain 5 files / 22 passed; final production build and ESLint passed.
- Final production-browser evidence: no address request before entering checkout; real API-derived point value displayed; card rail and easy-payment tabs work; help closes with Escape and restores focus; primary CTA navigates to /checkout. No horizontal page overflow at 320/390/768/1440px. Screenshots with fixture data: output/playwright/commerce-pay-desktop.png, commerce-pay-mobile.png, commerce-pay-easy-mobile.png. Reproduction: commerce-pay-setup.js and commerce-pay-verify.js in the same output directory.

## Follow-up: Restore Order History and Move Purchase Choices into Sheets

- User superseded the order-filter sheet request: restored the original inline order-number/product search and horizontally scrollable status chips, with immediate filtering. Removed the filter button, draft conditions, and apply/reset sheet. Commerce Pay, ad placement, separate support entries, and logout remain.
- Product detail now opens the shared BottomSheet for option/quantity selection before adding to cart. The page shows the current selection and total; the sheet retains selection when dismissed and reopened. The floating purchase action follows the same flow. Existing login, stock limits, cart reconciliation, and ambiguous-result handling remain.
- Cart option and quantity editing now share a BottomSheet and explicit save. Removed the row-level quantity mutation controls. Existing grouped-item atomic updates, option-stock clamping, retained draft on failure, and refetch behavior remain.
- Relevant Vitest: 5 files / 33 tests passed (MyPage, product detail, cart, product engagement, accessible design-system overlays). Changed-file ESLint, production build/TypeScript, and diff whitespace checks passed.
- Production Chromium with controlled fixtures verified immediate order filtering; bottom-anchored purchase/edit sheets; Escape focus restoration; selection retained on reopening; POST option 20 / quantity 2; PATCH option 10 / quantity 3; persisted selection after reload. No horizontal page overflow at 320/390/1440px. No real order or payment was submitted.
- Captures: output/playwright/orders-inline-restored.png, purchase-options-mobile.png, cart-option-quantity-mobile.png, cart-option-quantity-desktop.png. Reproduction: purchase-option-sheets-setup.js and purchase-option-sheets-verify.js in the same directory.

## Local Interactive Preview

- User requested temporary login and setup for hands-on testing. Kept the final production frontend on localhost:3000 and started a disposable fixture API bound to 127.0.0.1:8080 using ignored output/playwright/local-preview-api.mjs. No production authentication code, environment files, remote data, or payment integration was changed.
- Fictional preview account: preview@example.com / preview123!. The local API accepts only this fixture account/token and restricts browser origins to localhost/127.0.0.1:3000. Profile changes, coupon claims, and cart edits are stored in process memory. Actual order/payment submissions return an explicit preview-only error.
- Logged into the user's in-app browser through the existing login UI; verified MyPage shows 12,500 points, one owned coupon, three sample orders, and original issuer artwork. Refreshed the existing product-list and cart tabs to load the shared session and fixtures. Verified profile settings save and survive page reload. Servers remain running for the user's test; restarting the fixture API resets sample changes.

## Follow-up: Compact Wallet Selection and Activity Summary

- User requested card/own-pay selection on the base page and details/addition through bottom sheets. Replaced the expanded payment panel with compact Card / Commerce Pay tabs, original issuer card choices, and one detail row. Chosen card persists across tab changes and sheet dismissal. Points and checkout handoff now appear in the detail sheet. Add opens a separate method-choice sheet; the existing checkout handles card information. No stored cards, prepaid balance, billing registration, or preferred checkout method is fabricated.
- Added "내가 쓴 리뷰" to the summary using the existing listMyReviews API and shared review query key, linked to review management. Added "진행 중인 문의" with an explicit preparation state and an informational bottom sheet. There is no inquiry API or route in the current frontend, so it does not claim zero inquiries or simulate a submitted request.
- Summary adapts to five columns on wider screens and a three-plus-two layout on mobile. Customer Service and Usage Guidance now each occupy a full content-width row at every breakpoint, with logout below. Their bottom sheets adapt to the viewport and the page's max-w-6xl width.
- Relevant Vitest: 4 files / 22 tests passed. Changed-file ESLint, final production build/TypeScript, and diff whitespace checks passed. Browser tests against the live local fixture API verified add/detail/help flows, actual point rendering, preserved card selection, Escape/focus restoration, two review records and their management link, inquiry availability notice, and full-width support rows/sheets. No horizontal overflow at 320/390/768/1440px.
- Local fixture API now seeds two editable sample reviews and provides a heartbeat-only notification stream. Frontend and fixture API remain available on localhost:3000 / localhost:8080 with the same preview login. All data remains disposable local process memory.
- Captures: output/playwright/mypage-wallet-sheets-mobile.png, mypage-wallet-main-mobile.png, mypage-wallet-sheets-desktop.png, wallet-card-details-sheet.png, wallet-own-pay-sheet.png, wallet-add-method-sheet.png, mypage-support-full-width-sheet.png. Reproduction: wallet-sheets-final-verify.js in that directory.

## Follow-up: Temporary Inquiry Records and Reply Status

- User explicitly requested temporary inquiry records instead of the preparation notice. Added three fictional inquiries: delivery awaiting reply, option change under review, and coupon/points answered with a sample support response. The summary derives two active inquiries by excluding answered records.
- Extracted MyInquirySummary into its own component. Its bottom sheet shows category, title, full question, submission date, related product where applicable, status badge/text, and support answer/date. All / Active / Answered tabs show derived counts. Escape restores focus; reopening resets the filter to All. Empty records and an unavailable source remain distinct states.
- Fixtures live in src/lib/inquiry-preview.ts and are only supplied when NEXT_PUBLIC_INQUIRY_PREVIEW=true. Enabled this explicitly in the ignored .env.local for the requested local testing session. The sheet labels these records "임시 데이터". No inquiry API, real submission, or remote customer-service conversation is fabricated.
- Targeted Vitest: 4 files / 13 tests passed. Changed-file ESLint, production build/TypeScript, and diff whitespace checks passed. Live localhost browser verification confirmed count 2 vs 3 total / 1 answered, content and reply text, filtering, Escape/focus restoration, filter reset, and count after reload. No horizontal overflow at 320/390/768/1440px; sheets remain bottom-anchored.
- Captures: output/playwright/inquiry-preview-summary.png, inquiry-preview-all-mobile.png, inquiry-preview-answer-mobile.png, inquiry-preview-answer-desktop.png. Reproduction: inquiry-preview-verify.js. Frontend remains on localhost:3000 and the fixture API on localhost:8080 for the user's test.

## Follow-up: Card Slider without Separate Descriptions

- User requested removing separate card descriptions and browsing with left/right slide buttons. Replaced the three-thumbnail chooser with one larger original card plate, Previous/Next buttons, issuer name, and a position counter. Removed the explanatory paragraph and separate card-detail row. Tapping the card still opens the existing points/checkout sheet, whose card-specific explanatory panel was also removed. Commerce Pay and add/help flows remain.
- Slider stops at both ends, supports arrow/Home/End keys, announces the selected card/count, retains selection across payment tabs and sheet dismissal, and respects reduced-motion preferences. Original artwork/proportions remain unchanged.
- Targeted Vitest: 4 files / 14 tests passed. Changed-file ESLint, production build/TypeScript, and diff whitespace checks passed. Live localhost browser validation verified all three plates, bounds, keyboard navigation, card-tap sheet/focus restoration, and no horizontal overflow at 320/390/768/1440px.
- Captures: output/playwright/wallet-card-slider-mobile.png and wallet-card-slider-desktop.png. Reproduction: card-slider-verify.js. Updated frontend remains on localhost:3000 with the same temporary account, inquiries, and fixture API.

## Follow-up: Unified Commerce Money and Touch Slider

- User requested merging the card and own-pay modes, renaming Pay to "머니 (commerce money)", placing Money first, supporting direct swipes, and moving the selected method's information above the slider using the supplied pay screenshot as the layout reference.
- Renamed the wallet component/styles/tests to commerce-money-wallet. Removed the mode tabs. The unified sequence is Money, Hyundai ZERO Edition3 Metal, Shinhan Mr.Life, and KB My WE:SH. A white information panel above the rail updates the selected name/product, real account point balance, detail trigger, and existing checkout link. No money-balance API exists, so points remain explicitly labeled points; no prepaid funds or stored card identities are fabricated. Help, add-method choices, and usage guidance now use commerce money naming.
- Implemented a draggable rail with adjacent card previews, pointer capture after horizontal intent, short-drag snapback, edge resistance, cancel handling, and click suppression following a swipe. Vertical touch scrolling and pinch zoom remain available. Arrow buttons, keyboard Home/End/arrows, live position, reduced motion, and detail-sheet focus restoration remain supported.
- Native touch verification identified implicit child pointer capture transferring to the rail. The rail now responds only to loss of its own capture, preserving touch gestures; an additional regression test covers this transfer.
- Targeted Vitest: 4 files / 16 tests passed. Changed-file ESLint, production build/TypeScript, and diff whitespace checks passed. Live Chromium verified mouse dragging, native CDP touch swipes in both directions, vertical page scrolling without selection changes, no accidental sheet opening, upper-info synchronization, boundaries, keyboard/focus behavior, add-sheet naming, and centering/no overflow at 320/390/768/1440px.
- Captures: output/playwright/commerce-money-mobile.png, commerce-money-card-mobile.png, commerce-money-desktop.png, commerce-money-touch-mobile.png. Reproduction: money-wallet-verify.js. Frontend and fixture API remain on localhost:3000 / localhost:8080 with the same temporary login and inquiry data.

## Follow-up: Method-Specific Information on Hover and Selection

- User requested that Money shows Money information and every card shows its own information when targeted. The upper panel now renders Money's actual point data only for Money; card views show their issuer and card product. The same separation applies to detail sheets. No card balance, number, or benefit is invented.
- Mouse hover and keyboard focus preview the targeted card's information without moving the rail; leaving restores the selected method. Swipe/arrow selection clears the transient preview. Detail sheets capture the item being opened so focus/hover changes cannot swap their contents. Matched information-section heights avoid layout movement while hovering.
- Targeted Vitest: 4 files / 17 tests passed. Changed-file ESLint, production build/TypeScript, and diff whitespace checks passed. Browser verification covered real adjacent-card hover/restoration, all three issuer/product pairs, absence of Money points in card panels, native touch and mouse drag, detail focus restoration, and 320/390/768/1440px widths. Existing Money/card screenshots and money-wallet-verify.js were updated with the final behavior. Local frontend remains on localhost:3000.

## Follow-up: Selection-Only Information and Centered Slide Controls

- User superseded hover previews: removed hover/focus-driven information changes. The upper panel updates only when the selected slide changes through swipe, arrows, keyboard, or choosing another visible slide. Money points and each card's issuer/product remain distinct. Detail sheets retain the opened item's information.
- Moved Previous/Next from the footer to the slider's left/right edges, vertically centered on the card. Both controls share a centered max-width stage across breakpoints; position text remains below.
- Removed checkout navigation buttons from the wallet, detail sheets, and method guidance. Guidance now closes with Confirm. The wallet presents information; checkout remains available through the existing cart/order flow.
- Targeted Vitest: 4 files / 17 tests passed. Changed-file ESLint, production build/TypeScript, and diff whitespace checks passed. Browser verification confirmed unchanged information on hover, updates on selection, no wallet/detail checkout links, and arrow edge/vertical-center alignment within 1px at 320/390/768/1440px. Native touch, mouse dragging, keyboard, and focus checks passed. Existing Commerce Money captures and reproduction script were refreshed; localhost:3000 remains running.

## Follow-up: Outer Arrow Gutters and Minimal Method Information

- User requested farther-out, readable arrows without white button boxes, then removal of redundant issuer/product fields and labels such as "카드 정보 · 미리보기". Replaced the overlaid controls with dedicated left/right grid gutters outside the card viewport. Transparent 44x96px targets use dark pink 28px chevrons, pink hover feedback, visible keyboard focus, and distinct disabled states. The stage can span 640px on desktop; cards no longer sit beneath arrow targets.
- Removed the white information panel background and repeated information rows/labels. The upper section shows only the selected name/product, with actual points alongside Money. A matched 96px minimum information height keeps the carousel stable as selections change. Detail sheets retain the card artwork, title/product, and Money points without duplicate metadata rows. Selection-only updates and information-only wallet behavior remain.
- Targeted Vitest: 4 files / 17 tests passed. Changed-file ESLint, production build/TypeScript, and diff whitespace checks passed. Browser checks verified arrow gutters stay at least 8px outside the viewport and align with the active card's vertical center at 320/390/768/1440px; no white border/shadow button boxes or repeated definition rows remain. Mouse dragging, native touch swipes, vertical scrolling, focus, and no-hover-selection regression checks passed. Captures and money-wallet-verify.js refreshed; localhost:3000 remains running.

## Follow-up: Larger Selected Card with Subtle Neighbor Peeks

- User requested a larger selected card, only small portions of adjacent cards, and unchanged outer arrow placement. Increased the selected plate from 128px to up to 192px (responsive at narrow widths), constrained the inner viewport to 240px, and tightened the slide gap. Neighbor cards scale to 88% with lower opacity and directional transform origins so only their inner edges remain visible. Original card proportions and the outer arrow grid remain intact.
- Existing targeted Vitest: 4 files / 17 passed. ESLint, production build/TypeScript, and diff whitespace checks passed. Browser checks at 320/390/768/1440px verified centering, no overflow, outer arrows, and 4–24px neighbor visibility; selected plates are at least 180px wide from 390px viewport upward. Touch/mouse swipe and selection-only information checks passed. Updated the existing Commerce Money captures and reproduction script; localhost:3000 remains running.

## Follow-up: Points-Only Money Summary

- User requested removing the Korean/English Money labels from the selected Money information area. It now contains only "보유 포인트" and the real balance/loading/retry state. Card names/products, brand artwork, slider sizing, neighboring peeks, and outer arrows remain as established.
- Wallet/MyPage tests: 2 files / 12 passed. Changed-file ESLint, production build/TypeScript, and diff whitespace checks passed. Local preview remains on localhost:3000.

### Follow-up: Smaller Cards and More Space

- Reduced carousel card maximum width from 192px to 160px and increased the slide gap from 4px to 16px. Narrow screens reserve 48px around the selected card for spacing and subtle neighboring previews.
- Kept the outside arrow gutters and existing selection/swipe behavior. Production build passed; verified smaller cards, 16px spacing, selection updates and no horizontal page overflow in the local preview.
