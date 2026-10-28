# Aein Meraji portfolio

Static portfolio built from the original Figma design, with a functional contact section and footer.

## Development

```sh
npm install
npm run build
npm run dev
```

Open http://127.0.0.1:5173/. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`. Rebuild after changing source files; the server serves `dist/`.

## Contact email setup

All enquiries are configured for **aeinmeraji2007@gmail.com** through [FormSubmit](https://formsubmit.co/documentation). No SMTP password or API key is placed in client code. This works with static hosting as well as the local development server.

**Required one-time activation:** submit the form once, then open the confirmation email sent by FormSubmit to `aeinmeraji2007@gmail.com` and click **Activate Form**. Check Spam if necessary. Follow any further verification instructions when moving to your production domain. Until inbox verification is complete, email delivery is not confirmed. No real test email was sent during automated verification.

After activation, submit an enquiry using an email address you control and check the recipient inbox and Reply-To behavior. The incoming email includes the visitor's name, email, project type, and message. The visitor email enables replies to the sender. A successful API response confirms that FormSubmit accepted the request; it does not independently prove inbox delivery.

The form validates required fields, email format, whitespace, and message length; prevents concurrent duplicate submissions; times out after 20 seconds; and retains entered text when submission fails or activation is pending. It includes a hidden spam trap and leaves FormSubmit's default spam protection enabled. Without JavaScript, it uses a normal POST to FormSubmit. The direct email link remains available as an alternative. Visitor details are transmitted to FormSubmit to process the enquiry.

Edit recipient, social URLs, and service options in `contact-view.mjs`. Only the supplied Instagram and Telegram profiles are shown. Footer links navigate to existing sections.

## Source structure

- `design-reference.jsx`: original composition for the first three sections, with build placeholders for contact and footer. It is converter input, not a React application.
- `contact-view.mjs`: renders semantic contact/footer HTML from shared contact settings.
- `contact.css`: contact styling, footer, and responsive layout for the lower page.
- `contact.js`: form validation, asynchronous delivery, and submission feedback.
- `translations.js`: shared English/Persian text, including form feedback and accessibility labels.
- `localization-build.mjs` / `i18n.js`: bind existing text at build time and switch language without replacing the page or form.
- `i18n.css` / `fonts/`: language picker and local Kalameh Regular, Medium, SemiBold, and Bold fonts from the supplied archive.
- `presentation.js` / `hero-motion.css`: scaling, Lenis scrolling, cursor, and visual effects.
- `build.mjs`: produces static HTML, CSS, scripts, and local Lenis assets in `dist/`.
- `server.mjs`: serves the generated site; exports a server factory for isolated tests.

## Verification

```sh
npm run test:contact
npm run test:i18n
npm run test:mobile
node check.mjs
```

The browser test uses installed Google Chrome through Playwright. Set `BROWSER_CHANNEL` to `msedge` to use Microsoft Edge instead. Tests start an isolated server and intercept all FormSubmit requests, so they never send actual email. They cover invalid and whitespace-only input, submitted fields, success, pending activation, provider rejection, network failure, duplicate submission prevention, contact/footer links, and layout at widths from 320px to 1440px.

`check.mjs` checks remaining original Figma layers, project/navigation links, contact fields, and asset files. The existing `InterVariable.woff2` asset is missing; this check reports that separately. The page uses its sans-serif fallback until the font is supplied at `dist/assets/InterVariable.woff2`.

## Languages

The globe icon beside the logo offers English and Persian. English is the default; the selection is remembered in local storage when available. Persian uses Kalameh and a full right-to-left layout: header, hero, service cards, projects, contact columns, form fields, and footer follow RTL reading order. Shared CSS logical properties mirror positions and spacing without duplicating the page. Email addresses and the original English Aein Barbers preview keep their LTR direction. The hero heading is baked into the original English image, so Persian uses a live text heading in that same frame. English restores the original image and layout. Project screenshots and logos remain original artwork.

Language changes preserve entered form text and the selected service. Service values submitted to FormSubmit remain stable regardless of their translated labels. The language test covers persistence, accessibility labels, Kalameh loading, mirrored desktop positions and reading order, unchanged card dimensions and English preview, mobile overflow, dropdown bounds, translated validation and error feedback, restoration of English positions, and switching during the typing animation. Hero interaction bounds follow the sculpture's position in either direction.

## Mobile layout

At 900px and below, the page uses natural document flow and a centered content width up to 680px. The desktop composition remains in use above that breakpoint. `mobile.css` contains the responsive layout; shared text, fields, project assets, and links are reused in both directions.

The sticky mobile header contains the logo, the same language picker, and a keyboard-accessible dropdown menu. Menu links and footer links use the navigation settings in `navigation-view.mjs`; `navigation.js` handles dismissal and component artwork sizing. Sections have a scroll offset to keep headings below the header. The hero uses live text, stacked artwork, centered action labels, and social links. Services and projects form one column, and every contact field occupies its own row.

Only illustration stages scale; mobile typography and controls stay at readable sizes. The sculpture and miniature project previews share a resize observer. Desktop pointer physics and the custom cursor are disabled at mobile widths; gentle floating animation still respects reduced-motion preferences. The phone dialog and email form retain their existing behavior.

The mobile test checks both languages at 320, 360, 390, 430, 768, 900, 901, 1024, and 1440px, including stacked content, control sizing, centered labels, dropdown behavior, section offsets, breakpoint changes, phone actions, preserved input values, and mocked email submission. Reference screenshots of the implementation are saved in `output/mobile/`.
