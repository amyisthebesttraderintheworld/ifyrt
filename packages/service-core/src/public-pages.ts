function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export interface LandingOptions {
  botUrl: string;
  stripeUrl?: string;
  supportEmail: string;
}

function layout(title: string, description: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="theme-color" content="#f4ecde" />
    <style>
      :root {
        color-scheme: light;
        --paper: #f4ecde;
        --paper-2: #ebdfca;
        --paper-3: rgba(255, 251, 245, 0.86);
        --ink: #12253f;
        --ink-soft: #55657b;
        --ink-strong: #0d1c31;
        --line: rgba(18, 37, 63, 0.12);
        --line-strong: rgba(18, 37, 63, 0.2);
        --panel: rgba(255, 250, 243, 0.78);
        --panel-strong: rgba(255, 255, 255, 0.88);
        --brand: #df6d38;
        --brand-deep: #b85027;
        --accent: #1f8a78;
        --accent-soft: rgba(31, 138, 120, 0.12);
        --shadow: 0 24px 80px rgba(18, 37, 63, 0.12);
      }

      * {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(223, 109, 56, 0.2), transparent 30%),
          radial-gradient(circle at 85% 15%, rgba(31, 138, 120, 0.14), transparent 25%),
          radial-gradient(circle at bottom right, rgba(18, 37, 63, 0.08), transparent 26%),
          linear-gradient(180deg, #f8f2e7 0%, #f2e8d7 54%, #efe4d2 100%);
      }

      body::before,
      body::after {
        content: "";
        position: fixed;
        inset: auto;
        pointer-events: none;
        z-index: -1;
      }

      body::before {
        top: -160px;
        right: -140px;
        width: 420px;
        height: 420px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(223, 109, 56, 0.18), transparent 68%);
        filter: blur(12px);
      }

      body::after {
        left: -120px;
        bottom: -120px;
        width: 360px;
        height: 360px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(31, 138, 120, 0.16), transparent 68%);
        filter: blur(16px);
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      p,
      li {
        color: var(--ink-soft);
        line-height: 1.72;
      }

      p {
        margin: 0;
      }

      ul {
        margin: 0;
        padding-left: 20px;
      }

      .page-shell {
        width: min(1160px, calc(100% - 32px));
        margin: 0 auto;
        padding: 28px 0 72px;
      }

      .panel {
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 30px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
      }

      .panel-strong {
        background: var(--panel-strong);
      }

      .site-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 24px;
      }

      .brand-lockup {
        display: grid;
        gap: 8px;
      }

      .brand-mark {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        width: fit-content;
        padding: 9px 14px;
        border-radius: 999px;
        border: 1px solid rgba(18, 37, 63, 0.14);
        background: rgba(255, 255, 255, 0.6);
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .brand-mark::before {
        content: "";
        width: 12px;
        height: 12px;
        border-radius: 3px;
        background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%);
        box-shadow: 12px -6px 0 -3px rgba(31, 138, 120, 0.3);
      }

      .brand-note {
        max-width: 520px;
        font-size: 0.95rem;
      }

      .header-links {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .header-link {
        padding: 12px 16px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.5);
        color: var(--ink-strong);
        font-size: 0.94rem;
      }

      .header-link:hover,
      .header-link:focus-visible,
      .button:hover,
      .button:focus-visible,
      .jump-link:hover,
      .jump-link:focus-visible {
        transform: translateY(-1px);
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.88fr);
        gap: 24px;
        align-items: stretch;
      }

      .hero-copy,
      .hero-card,
      .section-card,
      .legal-sidebar,
      .legal-card,
      .footer {
        position: relative;
        overflow: hidden;
      }

      .hero-copy {
        padding: 38px;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        width: fit-content;
        padding: 9px 14px;
        border-radius: 999px;
        background: rgba(223, 109, 56, 0.12);
        color: var(--brand-deep);
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .eyebrow::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--brand);
      }

      h1,
      h2,
      h3 {
        margin: 0;
        color: var(--ink-strong);
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Times New Roman", serif;
      }

      h1 {
        margin-top: 18px;
        max-width: 760px;
        font-size: clamp(2.9rem, 7vw, 5.7rem);
        line-height: 0.94;
        letter-spacing: -0.05em;
      }

      h2 {
        font-size: clamp(2rem, 4.3vw, 3.4rem);
        line-height: 0.98;
        letter-spacing: -0.04em;
      }

      h3 {
        font-size: 1.35rem;
        line-height: 1.1;
      }

      .hero-lead {
        max-width: 710px;
        margin-top: 18px;
        font-size: 1.1rem;
      }

      .cta-group,
      .pill-row,
      .stat-grid,
      .feature-grid,
      .legal-grid,
      .footer-links {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
      }

      .cta-group {
        margin-top: 28px;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 0 22px;
        border-radius: 999px;
        font-weight: 700;
        transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
      }

      .button-primary {
        background: linear-gradient(135deg, var(--brand) 0%, #f09e56 100%);
        color: #fff9f1;
        box-shadow: 0 14px 30px rgba(223, 109, 56, 0.24);
      }

      .button-secondary {
        border: 1px solid rgba(18, 37, 63, 0.12);
        background: rgba(255, 255, 255, 0.64);
        color: var(--ink-strong);
      }

      .mini-note {
        margin-top: 18px;
        max-width: 660px;
        font-size: 0.96rem;
      }

      .pill-row {
        margin-top: 26px;
      }

      .pill {
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid rgba(18, 37, 63, 0.1);
        background: rgba(255, 255, 255, 0.56);
        color: var(--ink-strong);
        font-size: 0.92rem;
      }

      .hero-card {
        padding: 28px;
        background:
          linear-gradient(180deg, rgba(16, 32, 56, 0.98) 0%, rgba(12, 23, 40, 0.98) 100%);
        color: #f7f1e7;
        box-shadow: 0 28px 80px rgba(13, 24, 42, 0.28);
      }

      .hero-card::before {
        content: "";
        position: absolute;
        top: -40px;
        right: -30px;
        width: 180px;
        height: 180px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(223, 109, 56, 0.26), transparent 70%);
      }

      .hero-card::after {
        content: "";
        position: absolute;
        bottom: -50px;
        left: -30px;
        width: 210px;
        height: 210px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(31, 138, 120, 0.22), transparent 72%);
      }

      .hero-card > * {
        position: relative;
        z-index: 1;
      }

      .panel-label {
        color: rgba(255, 245, 233, 0.72);
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .command-display {
        display: grid;
        gap: 14px;
        margin-top: 20px;
      }

      .command-line {
        padding: 16px 18px;
        border-radius: 22px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.04);
      }

      .command-line strong {
        display: block;
        margin-bottom: 6px;
        font-size: 1rem;
        letter-spacing: 0.03em;
      }

      .command-line p,
      .signal-card p {
        color: rgba(244, 233, 220, 0.74);
      }

      .signal-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 18px;
      }

      .signal-card {
        padding: 16px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .signal-card strong {
        display: block;
        margin-bottom: 6px;
        color: #fff5ea;
        font-size: 0.98rem;
      }

      .section {
        margin-top: 24px;
      }

      .stat-band {
        padding: 18px;
      }

      .stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }

      .stat-card {
        padding: 18px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.48);
        border: 1px solid rgba(18, 37, 63, 0.08);
      }

      .stat-card small {
        display: block;
        margin-bottom: 10px;
        color: var(--brand-deep);
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .stat-card strong {
        display: block;
        color: var(--ink-strong);
        font-size: 1.04rem;
        line-height: 1.36;
      }

      .story-grid,
      .legal-shell {
        display: grid;
        grid-template-columns: minmax(0, 0.96fr) minmax(0, 1.04fr);
        gap: 24px;
      }

      .section-card {
        padding: 32px;
      }

      .section-card-ink {
        background: linear-gradient(180deg, rgba(16, 32, 56, 0.98) 0%, rgba(10, 20, 35, 0.98) 100%);
        color: #f7f1e7;
      }

      .section-card-ink h2,
      .section-card-ink h3,
      .section-card-ink p,
      .section-card-ink li,
      .section-card-ink .kicker,
      .section-card-ink .number-pill {
        color: inherit;
      }

      .section-card-ink .kicker {
        color: rgba(246, 232, 215, 0.74);
      }

      .section-card-ink .number-pill {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.1);
      }

      .section-card-warm {
        background: linear-gradient(180deg, rgba(255, 252, 247, 0.86) 0%, rgba(245, 236, 223, 0.92) 100%);
      }

      .kicker {
        display: inline-block;
        margin-bottom: 16px;
        color: var(--brand-deep);
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .stack {
        display: grid;
        gap: 18px;
      }

      .number-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 56px;
        min-height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.56);
        color: var(--ink-strong);
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.12em;
      }

      .feature-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }

      .feature-card {
        padding: 28px;
        border-radius: 28px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.58);
        box-shadow: 0 20px 60px rgba(18, 37, 63, 0.08);
      }

      .feature-card p {
        margin-top: 12px;
      }

      .list-tight {
        display: grid;
        gap: 10px;
        margin-top: 18px;
        padding-left: 20px;
      }

      .list-tight li {
        margin: 0;
      }

      .legal-sidebar {
        padding: 30px;
        align-self: start;
        position: sticky;
        top: 24px;
      }

      .legal-main {
        display: grid;
        gap: 18px;
      }

      .legal-title {
        margin-top: 16px;
      }

      .legal-meta {
        margin-top: 16px;
        font-size: 0.96rem;
      }

      .jump-links {
        display: grid;
        gap: 10px;
        margin-top: 24px;
      }

      .jump-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 14px 16px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.56);
        color: var(--ink-strong);
        transition: transform 180ms ease;
      }

      .jump-link::after {
        content: "->";
        color: var(--brand-deep);
        font-weight: 700;
      }

      .legal-card {
        padding: 28px;
      }

      .legal-card h2 {
        font-size: clamp(1.6rem, 3vw, 2.2rem);
      }

      .legal-card p + p,
      .legal-card p + ul,
      .legal-card ul + p {
        margin-top: 14px;
      }

      .support-panel {
        margin-top: 24px;
        padding: 18px;
        border-radius: 22px;
        background: rgba(31, 138, 120, 0.08);
        border: 1px solid rgba(31, 138, 120, 0.12);
      }

      .support-panel strong {
        display: block;
        margin-bottom: 8px;
        color: var(--ink-strong);
      }

      .footer {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 18px;
        margin-top: 24px;
        padding: 24px 28px;
      }

      .footer-copy {
        max-width: 520px;
      }

      .footer-links {
        align-items: center;
      }

      .footer-link {
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.52);
      }

      @media (max-width: 980px) {
        .hero,
        .story-grid,
        .legal-shell {
          grid-template-columns: 1fr;
        }

        .legal-sidebar {
          position: static;
        }
      }

      @media (max-width: 720px) {
        .page-shell {
          width: min(100%, calc(100% - 20px));
          padding: 20px 0 48px;
        }

        .site-header,
        .footer {
          flex-direction: column;
          align-items: stretch;
        }

        .hero-copy,
        .hero-card,
        .section-card,
        .legal-sidebar,
        .legal-card,
        .footer {
          padding: 24px;
          border-radius: 24px;
        }

        .signal-grid,
        .feature-grid,
        .stat-grid {
          grid-template-columns: 1fr;
        }

        .button,
        .header-link,
        .footer-link {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function renderSiteHeader(variant: "home" | "legal" = "home"): string {
  const links =
    variant === "home"
      ? [
          { href: "#how-it-works", label: "How it works" },
          { href: "#safeguards", label: "Safeguards" },
          { href: "/terms", label: "Terms" },
          { href: "/privacy", label: "Privacy" }
        ]
      : [
          { href: "/", label: "Home" },
          { href: "/terms", label: "Terms" },
          { href: "/privacy", label: "Privacy" }
        ];

  return `<header class="site-header">
    <div class="brand-lockup">
      <span class="brand-mark">Ifyrt</span>
      <p class="brand-note">Telegram-native trading simulation with deterministic backtests, live paper runs, and infrastructure built to keep real execution isolated.</p>
    </div>
    <nav class="header-links" aria-label="Primary">
      ${links
        .map((link) => `<a class="header-link" href="${link.href}">${link.label}</a>`)
        .join("")}
    </nav>
  </header>`;
}

function renderFooter(supportEmail: string): string {
  return `<footer class="panel footer">
    <div class="footer-copy">
      <span class="brand-mark">Ifyrt</span>
      <p class="mini-note">Built for simulation first. The public web surface explains the product, handles billing entry, and points users back to Telegram where the workflow lives.</p>
    </div>
    <div class="footer-links">
      <a class="footer-link" href="/terms">Terms</a>
      <a class="footer-link" href="/privacy">Privacy</a>
      <a class="footer-link" href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>
    </div>
  </footer>`;
}

export function renderLandingPage(options: LandingOptions): string {
  const ctaHref = options.stripeUrl ?? options.botUrl;
  const ctaLabel = options.stripeUrl ? "Start Subscription" : "Open Telegram Bot";

  return layout(
    "Ifyrt",
    "Telegram-native trading simulation with deterministic backtests, live paper trading, Stripe billing, and strict separation from live execution.",
    `<main class="page-shell">
      ${renderSiteHeader("home")}
      <section class="hero">
        <article class="panel panel-strong hero-copy">
          <span class="eyebrow">Telegram-native trading simulation</span>
          <h1>Pressure-test every strategy before real money ever meets the market.</h1>
          <p class="hero-lead">Ifyrt keeps the workflow focused: explore ideas in Telegram, replay them through deterministic backtests, move into live paper simulation, and manage billing without turning the public site into a bloated dashboard.</p>
          <div class="cta-group">
            <a class="button button-primary" href="${escapeHtml(ctaHref)}">${escapeHtml(ctaLabel)}</a>
            <a class="button button-secondary" href="${escapeHtml(options.botUrl)}">Open Telegram</a>
          </div>
          <p class="mini-note">Simulation is the flagship experience. Live trading remains gated, isolated, and deliberately separate from anything exposed on this page.</p>
          <div class="pill-row" aria-label="Highlights">
            <span class="pill">Deterministic backtests</span>
            <span class="pill">Real-time paper simulation</span>
            <span class="pill">Stripe-managed access</span>
            <span class="pill">Railway-hosted services</span>
          </div>
        </article>
        <aside class="hero-card" aria-label="Workflow overview">
          <span class="panel-label">Inside the workflow</span>
          <div class="command-display">
            <div class="command-line">
              <strong>/backtest</strong>
              <p>Replay historical conditions with the same execution contract the platform uses elsewhere.</p>
            </div>
            <div class="command-line">
              <strong>/simulate</strong>
              <p>Move from research into live paper runs fed by hosted market infrastructure.</p>
            </div>
            <div class="command-line">
              <strong>/status</strong>
              <p>Keep control in Telegram while the workers, orchestration, and billing hooks stay behind the scenes.</p>
            </div>
          </div>
          <div class="signal-grid">
            <div class="signal-card">
              <strong>Telegram first</strong>
              <p>The chat interface stays authoritative instead of becoming a thin wrapper around a web app.</p>
            </div>
            <div class="signal-card">
              <strong>Live stays isolated</strong>
              <p>Nothing on this page executes trades, stores keys, or bypasses the platform safeguards.</p>
            </div>
          </div>
        </aside>
      </section>

      <section class="panel stat-band section">
        <div class="stat-grid">
          <article class="stat-card">
            <small>Execution model</small>
            <strong>Shared contracts keep simulation logic aligned with the rest of the platform.</strong>
          </article>
          <article class="stat-card">
            <small>Control plane</small>
            <strong>Users stay in Telegram for actions, alerts, and product flow.</strong>
          </article>
          <article class="stat-card">
            <small>Infrastructure</small>
            <strong>Hosted services handle routing, workers, and payment state where they belong.</strong>
          </article>
          <article class="stat-card">
            <small>Risk posture</small>
            <strong>Simulation comes first and live execution is intentionally fenced off.</strong>
          </article>
        </div>
      </section>

      <section class="story-grid section" id="how-it-works">
        <article class="panel section-card section-card-warm">
          <span class="kicker">Why it feels different</span>
          <h2>Telegram on the surface. Deterministic systems underneath.</h2>
          <p class="hero-lead">The public site exists to orient users, explain the product, and provide clean billing and policy links. The actual experience lives in a tighter loop: chat commands, hosted orchestration, simulation workers, and carefully separated execution services.</p>
          <ul class="list-tight">
            <li>Research ideas without pretending paper gains equal live readiness.</li>
            <li>Move from historical replay into real-time simulation without changing the interface.</li>
            <li>Keep operational complexity off the public surface and inside the backend services designed for it.</li>
          </ul>
        </article>
        <div class="stack">
          <article class="panel section-card">
            <span class="number-pill">01</span>
            <h3>Shape the idea</h3>
            <p class="mini-note">Use Telegram commands to kick off backtests, inspect strategy behavior, and tighten your assumptions before a market is involved.</p>
          </article>
          <article class="panel section-card">
            <span class="number-pill">02</span>
            <h3>Simulate the pressure</h3>
            <p class="mini-note">Run real-time paper sessions against hosted data and execution plumbing so you can see how the strategy behaves in motion.</p>
          </article>
          <article class="panel section-card">
            <span class="number-pill">03</span>
            <h3>Keep the boundaries clear</h3>
            <p class="mini-note">Billing, orchestration, and user state stay server-side. Live execution remains a separate, protected concern rather than an accidental side effect.</p>
          </article>
        </div>
      </section>

      <section class="section" aria-label="Key capabilities">
        <div class="feature-grid">
          <article class="feature-card">
            <span class="kicker">Backtests</span>
            <h3>Repeatability you can trust</h3>
            <p>Deterministic historical runs make it easier to compare strategy changes without the noise of inconsistent execution behavior.</p>
          </article>
          <article class="feature-card">
            <span class="kicker">Paper trading</span>
            <h3>Practice against live conditions</h3>
            <p>Real-time simulation gives ideas a proving ground before any live workflow is even considered.</p>
          </article>
          <article class="feature-card">
            <span class="kicker">Billing</span>
            <h3>Clean access with Stripe</h3>
            <p>Subscriptions and checkout live in a dedicated payment surface instead of getting tangled up inside the bot or workers.</p>
          </article>
        </div>
      </section>

      <section class="story-grid section" id="safeguards">
        <article class="panel section-card section-card-ink">
          <span class="kicker">Safety by design</span>
          <h2>Real execution is not treated like a casual upgrade path.</h2>
          <p>Ifyrt is built around a strict separation between learning, simulating, and any live activity. That boundary is part of the product philosophy, not a note buried in the footer.</p>
        </article>
        <article class="panel section-card section-card-warm">
          <span class="kicker">What that means</span>
          <ul class="list-tight">
            <li>This site does not execute trades or collect exchange keys.</li>
            <li>Simulation remains the primary experience and the clearest path to product value.</li>
            <li>Hosted services own orchestration, worker isolation, and payment state.</li>
            <li>Users always have a support path at <a href="mailto:${escapeHtml(options.supportEmail)}">${escapeHtml(options.supportEmail)}</a>.</li>
          </ul>
        </article>
      </section>

      ${renderFooter(options.supportEmail)}
    </main>`
  );
}

export function renderTermsPage(options: Pick<LandingOptions, "supportEmail">): string {
  return layout(
    "Ifyrt Terms",
    "Terms of Service for Ifyrt.",
    `<main class="page-shell">
      ${renderSiteHeader("legal")}
      <section class="legal-shell">
        <aside class="panel panel-strong legal-sidebar">
          <span class="eyebrow">Terms of Service</span>
          <h1 class="legal-title">Plain-language rules for using Ifyrt.</h1>
          <p class="legal-meta">Effective date: March 30, 2026</p>
          <div class="jump-links" aria-label="Jump links">
            <a class="jump-link" href="#service">Service</a>
            <a class="jump-link" href="#eligibility">Eligibility</a>
            <a class="jump-link" href="#billing">Billing</a>
            <a class="jump-link" href="#risk">Risk disclosure</a>
            <a class="jump-link" href="#contact">Contact</a>
          </div>
          <div class="support-panel">
            <strong>Need help?</strong>
            <p>Questions about these terms can be sent to <a href="mailto:${escapeHtml(options.supportEmail)}">${escapeHtml(options.supportEmail)}</a>.</p>
          </div>
        </aside>
        <div class="legal-main">
          <section class="panel legal-card" id="service">
            <h2>Service</h2>
            <p>Ifyrt provides trading simulation, educational tooling, and related billing flows. It is not investment advice, does not guarantee outcomes, and should not be treated as a promise of live-market performance.</p>
          </section>
          <section class="panel legal-card" id="eligibility">
            <h2>Eligibility</h2>
            <p>You are responsible for complying with the laws, regulations, platform rules, and exchange requirements that apply to you. Do not use the service where doing so is prohibited.</p>
          </section>
          <section class="panel legal-card" id="billing">
            <h2>Billing</h2>
            <p>Paid access may renew automatically through Stripe until canceled. Pricing, trial details, and access windows are presented during checkout or inside the product experience.</p>
          </section>
          <section class="panel legal-card" id="risk">
            <h2>Risk Disclosure</h2>
            <p>Markets involve risk. Simulated performance, backtests, and paper results do not guarantee live results. You remain solely responsible for any live trading decisions and their consequences.</p>
          </section>
          <section class="panel legal-card" id="contact">
            <h2>Contact</h2>
            <p>Questions about these terms can be sent to <a href="mailto:${escapeHtml(options.supportEmail)}">${escapeHtml(options.supportEmail)}</a>.</p>
          </section>
        </div>
      </section>
      ${renderFooter(options.supportEmail)}
    </main>`
  );
}

export function renderPrivacyPage(options: Pick<LandingOptions, "supportEmail">): string {
  return layout(
    "Ifyrt Privacy",
    "Privacy Policy for Ifyrt.",
    `<main class="page-shell">
      ${renderSiteHeader("legal")}
      <section class="legal-shell">
        <aside class="panel panel-strong legal-sidebar">
          <span class="eyebrow">Privacy Policy</span>
          <h1 class="legal-title">A focused explanation of what we collect and why.</h1>
          <p class="legal-meta">Effective date: March 30, 2026</p>
          <div class="jump-links" aria-label="Jump links">
            <a class="jump-link" href="#collect">What we collect</a>
            <a class="jump-link" href="#use">How we use it</a>
            <a class="jump-link" href="#payments">Payments</a>
            <a class="jump-link" href="#security">Security</a>
            <a class="jump-link" href="#privacy-contact">Contact</a>
          </div>
          <div class="support-panel">
            <strong>Privacy questions?</strong>
            <p>Reach us at <a href="mailto:${escapeHtml(options.supportEmail)}">${escapeHtml(options.supportEmail)}</a>.</p>
          </div>
        </aside>
        <div class="legal-main">
          <section class="panel legal-card" id="collect">
            <h2>What We Collect</h2>
            <ul>
              <li>Telegram account identifiers needed to operate the bot and connect activity to your account.</li>
              <li>Subscription and billing metadata processed through Stripe.</li>
              <li>Simulation, trade, and usage data required to run the platform and support the product.</li>
            </ul>
          </section>
          <section class="panel legal-card" id="use">
            <h2>How We Use It</h2>
            <p>We use this information to operate the product, enforce access, process billing, support users, investigate issues, and improve platform reliability.</p>
          </section>
          <section class="panel legal-card" id="payments">
            <h2>Payments</h2>
            <p>Payment information is handled by Stripe. Ifyrt does not store full card details on its own servers.</p>
          </section>
          <section class="panel legal-card" id="security">
            <h2>Security</h2>
            <p>Ifyrt is designed to keep orchestration and sensitive workflows on hosted backend services instead of exposing them through lightweight public web pages.</p>
          </section>
          <section class="panel legal-card" id="privacy-contact">
            <h2>Contact</h2>
            <p>Questions about privacy can be sent to <a href="mailto:${escapeHtml(options.supportEmail)}">${escapeHtml(options.supportEmail)}</a>.</p>
          </section>
        </div>
      </section>
      ${renderFooter(options.supportEmail)}
    </main>`
  );
}
