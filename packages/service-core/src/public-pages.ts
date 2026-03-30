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
    <meta name="theme-color" content="#040807" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #050908;
        --bg-deep: #020504;
        --panel: rgba(9, 15, 13, 0.84);
        --panel-strong: rgba(7, 11, 10, 0.94);
        --panel-soft: rgba(10, 18, 15, 0.74);
        --line: rgba(137, 171, 156, 0.14);
        --line-strong: rgba(72, 240, 139, 0.22);
        --text: #eef5f0;
        --text-soft: #9cab9f;
        --text-faint: #6f8077;
        --accent: #43ea87;
        --accent-deep: #21b760;
        --accent-glow: rgba(67, 234, 135, 0.24);
        --warm: #ff8f6e;
        --gold: #d4d58a;
        --shadow: 0 28px 80px rgba(0, 0, 0, 0.38);
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
        font-family: "Manrope", "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at 18% 0%, rgba(20, 83, 51, 0.24), transparent 28%),
          radial-gradient(circle at 82% 14%, rgba(255, 143, 110, 0.1), transparent 24%),
          linear-gradient(180deg, #070b0a 0%, var(--bg) 42%, var(--bg-deep) 100%);
      }

      body::before,
      body::after {
        content: "";
        position: fixed;
        pointer-events: none;
        z-index: -1;
      }

      body::before {
        inset: -14% auto auto 12%;
        width: 54vw;
        height: 54vw;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(67, 234, 135, 0.14), transparent 68%);
        filter: blur(60px);
        animation: drift 14s ease-in-out infinite;
      }

      body::after {
        right: 6%;
        bottom: 4%;
        width: 32vw;
        height: 32vw;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 143, 110, 0.08), transparent 70%);
        filter: blur(72px);
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      p,
      li {
        margin: 0;
        color: var(--text-soft);
        line-height: 1.72;
      }

      ul {
        margin: 0;
        padding-left: 20px;
      }

      h1,
      h2,
      h3 {
        margin: 0;
        color: var(--text);
        font-family: "Space Grotesk", "Segoe UI", sans-serif;
        letter-spacing: -0.04em;
      }

      h1 {
        font-size: clamp(3rem, 8vw, 5.9rem);
        line-height: 0.94;
      }

      h2 {
        font-size: clamp(2rem, 4.6vw, 3.45rem);
        line-height: 0.98;
      }

      h3 {
        font-size: clamp(1.28rem, 2.1vw, 1.7rem);
        line-height: 1.06;
      }

      .page-shell {
        width: min(1180px, calc(100% - 32px));
        margin: 0 auto;
        padding: 24px 0 76px;
      }

      .panel {
        border: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(10, 16, 14, 0.94) 0%, rgba(6, 10, 9, 0.9) 100%);
        border-radius: 32px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
      }

      .panel-strong {
        background: linear-gradient(180deg, rgba(8, 12, 11, 0.98) 0%, rgba(4, 8, 7, 0.98) 100%);
      }

      .site-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        align-items: center;
        gap: 20px;
        padding: 14px 18px;
        margin-bottom: 20px;
        border: 1px solid rgba(137, 171, 156, 0.1);
        border-radius: 999px;
        background: rgba(5, 8, 7, 0.72);
        backdrop-filter: blur(18px);
        position: sticky;
        top: 18px;
        z-index: 20;
      }

      .brand-lockup {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .brand-mark {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        font-family: "Space Grotesk", "Segoe UI", sans-serif;
        font-size: 0.94rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .brand-mark::before {
        content: "";
        width: 14px;
        height: 14px;
        border-radius: 4px;
        background: linear-gradient(135deg, var(--warm) 0%, var(--accent) 100%);
        box-shadow: 0 0 0 4px rgba(67, 234, 135, 0.08), 0 0 22px rgba(67, 234, 135, 0.22);
      }

      .brand-note {
        color: var(--text-faint);
        font-size: 0.84rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .site-nav,
      .cta-group,
      .footer-links {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .site-nav {
        justify-content: center;
      }

      .nav-link {
        padding: 10px 16px;
        border-radius: 999px;
        color: var(--text-soft);
        font-size: 0.94rem;
        transition: color 180ms ease, background 180ms ease, transform 180ms ease;
      }

      .nav-link:hover,
      .nav-link:focus-visible,
      .button:hover,
      .button:focus-visible,
      .jump-link:hover,
      .jump-link:focus-visible,
      .footer-link:hover,
      .footer-link:focus-visible {
        transform: translateY(-1px);
      }

      .nav-link:hover,
      .nav-link:focus-visible {
        color: var(--text);
        background: rgba(255, 255, 255, 0.04);
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 54px;
        padding: 0 22px;
        border-radius: 999px;
        border: 1px solid transparent;
        font-weight: 800;
        font-size: 0.98rem;
        letter-spacing: -0.01em;
        transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
      }

      .button-small {
        min-height: 44px;
        padding: 0 18px;
        font-size: 0.92rem;
      }

      .button-primary {
        color: #071109;
        background: linear-gradient(135deg, #4ef191 0%, var(--accent) 100%);
        box-shadow: 0 0 0 1px rgba(72, 240, 139, 0.28) inset, 0 18px 38px rgba(25, 177, 92, 0.26);
      }

      .button-secondary {
        border-color: var(--line);
        background: rgba(255, 255, 255, 0.02);
        color: var(--text);
      }

      .header-action {
        justify-self: end;
      }

      .hero {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: calc(100vh - 190px);
        margin-top: 22px;
      }

      .hero-shell {
        width: min(940px, 100%);
        padding: 72px 40px 42px;
        text-align: center;
        overflow: hidden;
        position: relative;
      }

      .hero-shell::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 50% 0%, rgba(67, 234, 135, 0.12), transparent 42%),
          radial-gradient(circle at 50% 100%, rgba(255, 143, 110, 0.06), transparent 36%);
        pointer-events: none;
      }

      .hero-shell::after {
        content: "";
        position: absolute;
        inset: 11% 23%;
        border-radius: 42px;
        border: 1px solid rgba(72, 240, 139, 0.08);
        background: linear-gradient(180deg, rgba(10, 18, 15, 0.26), rgba(10, 18, 15, 0));
        pointer-events: none;
      }

      .hero-shell > * {
        position: relative;
        z-index: 1;
      }

      .eyebrow,
      .hero-badge,
      .price-callout {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        width: fit-content;
        padding: 10px 16px;
        border-radius: 999px;
        border: 1px solid rgba(72, 240, 139, 0.16);
        background: rgba(10, 22, 15, 0.66);
        color: #8ddfb1;
        font-size: 0.84rem;
        font-weight: 700;
        letter-spacing: 0.05em;
      }

      .eyebrow::before,
      .hero-badge::before,
      .price-callout::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: linear-gradient(135deg, #66f7a5 0%, var(--accent) 100%);
        box-shadow: 0 0 16px var(--accent-glow);
      }

      .hero-title {
        max-width: 760px;
        margin: 26px auto 0;
      }

      .hero-title span {
        background: linear-gradient(90deg, var(--warm) 0%, var(--gold) 36%, #7ce4a2 70%, var(--accent) 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }

      .hero-lead {
        max-width: 650px;
        margin: 22px auto 0;
        font-size: 1.08rem;
      }

      .cta-group {
        justify-content: center;
        margin-top: 32px;
      }

      .mini-note {
        margin-top: 18px;
        font-size: 0.95rem;
        color: var(--text-faint);
      }

      .proof-strip,
      .step-grid,
      .feature-grid,
      .pricing-shell,
      .showcase-grid,
      .legal-shell {
        display: grid;
        gap: 18px;
      }

      .proof-strip {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-top: 40px;
      }

      .proof-card,
      .step-card,
      .feature-card,
      .pricing-card,
      .legal-sidebar,
      .legal-card,
      .footer {
        position: relative;
        overflow: hidden;
      }

      .proof-card,
      .step-card,
      .feature-card,
      .pricing-card,
      .legal-sidebar,
      .legal-card {
        padding: 28px;
      }

      .proof-card {
        border-radius: 24px;
        border: 1px solid var(--line);
        background: rgba(10, 16, 14, 0.7);
        text-align: left;
      }

      .proof-card strong,
      .price-point strong {
        display: block;
        color: var(--text);
        font-size: 1rem;
      }

      .proof-card span {
        display: block;
        margin-top: 10px;
        color: var(--text-soft);
      }

      .section {
        margin-top: 28px;
      }

      .section-intro {
        max-width: 720px;
        margin-bottom: 20px;
      }

      .kicker {
        display: inline-block;
        margin-bottom: 16px;
        color: #8ddfb1;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .section-intro p {
        margin-top: 16px;
      }

      .step-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .number-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 60px;
        min-height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid var(--line-strong);
        background: rgba(11, 28, 18, 0.8);
        color: #8ddfb1;
        font-size: 0.8rem;
        font-weight: 800;
        letter-spacing: 0.12em;
      }

      .step-card p,
      .feature-card p,
      .pricing-card p {
        margin-top: 14px;
      }

      .step-card h3,
      .feature-card h3,
      .pricing-card h3,
      .legal-title {
        margin-top: 18px;
      }

      .showcase-grid,
      .pricing-shell {
        grid-template-columns: minmax(0, 1.02fr) minmax(320px, 0.98fr);
      }

      .feature-grid {
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }

      .signal-cluster {
        display: grid;
        gap: 14px;
        margin-top: 20px;
      }

      .command-line {
        padding: 18px 18px 16px;
        border-radius: 24px;
        border: 1px solid rgba(72, 240, 139, 0.08);
        background: rgba(255, 255, 255, 0.02);
      }

      .command-line strong {
        display: block;
        margin-bottom: 8px;
        color: var(--text);
        font-size: 1rem;
        letter-spacing: 0.02em;
      }

      .list-tight {
        display: grid;
        gap: 12px;
        margin-top: 18px;
        padding-left: 20px;
      }

      .price-points {
        display: grid;
        gap: 16px;
        margin-top: 22px;
      }

      .price-point {
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr);
        gap: 14px;
        align-items: start;
      }

      .price-point::before {
        content: "";
        width: 10px;
        height: 10px;
        margin-top: 8px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--warm) 0%, var(--accent) 100%);
        box-shadow: 0 0 18px rgba(67, 234, 135, 0.18);
      }

      .legal-shell {
        grid-template-columns: minmax(280px, 0.82fr) minmax(0, 1.18fr);
        margin-top: 24px;
      }

      .legal-sidebar {
        align-self: start;
        position: sticky;
        top: 104px;
      }

      .legal-main {
        display: grid;
        gap: 18px;
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

      .jump-link,
      .footer-link {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.03);
        transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
      }

      .jump-link::after {
        content: "->";
        color: #8ddfb1;
        font-weight: 700;
      }

      .support-panel {
        margin-top: 24px;
        padding: 18px;
        border-radius: 22px;
        border: 1px solid rgba(72, 240, 139, 0.12);
        background: rgba(13, 26, 19, 0.72);
      }

      .support-panel strong {
        display: block;
        margin-bottom: 8px;
        color: var(--text);
      }

      .footer {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 18px;
        margin-top: 28px;
        padding: 24px 26px;
      }

      .footer-copy {
        max-width: 560px;
      }

      .footer-copy p {
        margin-top: 14px;
      }

      @keyframes drift {
        0%,
        100% {
          transform: translate3d(0, 0, 0) scale(1);
        }

        50% {
          transform: translate3d(1.5%, -1.5%, 0) scale(1.04);
        }
      }

      @media (max-width: 980px) {
        .site-header,
        .proof-strip,
        .step-grid,
        .showcase-grid,
        .pricing-shell,
        .legal-shell {
          grid-template-columns: 1fr;
        }

        .site-header {
          padding: 18px;
          border-radius: 30px;
        }

        .site-nav {
          justify-content: flex-start;
        }

        .header-action {
          justify-self: start;
        }

        .hero {
          min-height: auto;
        }

        .legal-sidebar {
          position: static;
        }
      }

      @media (max-width: 720px) {
        .page-shell {
          width: min(100%, calc(100% - 20px));
          padding: 16px 0 48px;
        }

        .site-header {
          top: 12px;
        }

        .brand-note {
          display: none;
        }

        .hero-shell {
          padding: 48px 22px 30px;
          border-radius: 28px;
        }

        .site-nav,
        .cta-group,
        .footer-links {
          flex-direction: column;
          align-items: stretch;
        }

        .button,
        .nav-link,
        .footer-link {
          width: 100%;
          justify-content: center;
        }

        .proof-card,
        .step-card,
        .feature-card,
        .pricing-card,
        .legal-sidebar,
        .legal-card,
        .footer {
          padding: 22px;
          border-radius: 24px;
        }

        .footer {
          flex-direction: column;
          align-items: stretch;
        }

        .hero-title {
          font-size: clamp(2.7rem, 15vw, 3.9rem);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        html {
          scroll-behavior: auto;
        }

        *,
        *::before,
        *::after {
          animation: none !important;
          transition: none !important;
        }
      }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function renderSiteHeader(variant: "home" | "legal" = "home", actionHref?: string): string {
  const links =
    variant === "home"
      ? [
          { href: "#how-it-works", label: "How It Works" },
          { href: "#pricing", label: "Pricing" }
        ]
      : [
          { href: "/", label: "Home" },
          { href: "/terms", label: "Terms" },
          { href: "/privacy", label: "Privacy" }
        ];

  const action =
    variant === "home"
      ? `<a class="button button-primary button-small header-action" href="${escapeHtml(actionHref ?? "#pricing")}">Start Trading</a>`
      : `<a class="button button-secondary button-small header-action" href="/">Back Home</a>`;

  return `<header class="site-header">
    <div class="brand-lockup">
      <span class="brand-mark">Ifyrt</span>
      <span class="brand-note">Telegram-native strategy simulation and paper execution</span>
    </div>
    <nav class="site-nav" aria-label="Primary">
      ${links.map((link) => `<a class="nav-link" href="${link.href}">${link.label}</a>`).join("")}
    </nav>
    ${action}
  </header>`;
}

function renderFooter(supportEmail: string): string {
  return `<footer class="panel footer">
    <div class="footer-copy">
      <span class="brand-mark">Ifyrt</span>
      <p>Professional-grade strategy simulation and algorithmic trading execution, managed entirely through Telegram. Focus on your edge while we handle the infrastructure.</p>
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
  const hasStripe = Boolean(options.stripeUrl);

  const heroPrimaryLabel = hasStripe ? "Upgrade to Pro" : "Start Free Trial";
  const heroPrimaryHref = ctaHref;

  const pricingPrimaryLabel = hasStripe ? "Upgrade to Pro" : "Open Telegram";
  const pricingPrimaryHref = ctaHref;

  const pricingSecondaryLabel = hasStripe ? "Start Free Trial" : "How It Works";
  const pricingSecondaryHref = hasStripe ? options.botUrl : "#how-it-works";

  return layout(
    "Ifyrt",
    "Telegram-native trading simulation with deterministic backtests, paper execution, and professional-grade strategy validation.",
    `<main class="page-shell">
      ${renderSiteHeader("home", ctaHref)}

      <section class="hero">
        <div class="panel panel-strong hero-shell">
          <span class="hero-badge">7-Day Free Trial Available</span>
          <h1 class="hero-title">Algorithmic trading, <span>orchestrated from Telegram</span></h1>
          <p class="hero-lead">High-fidelity backtesting and real-time paper trading for serious strategy development. Start with a <strong>7-day free trial</strong> and validate your ideas before transitioning to live execution.</p>
          <div class="cta-group">
            <a class="button button-primary" href="${escapeHtml(heroPrimaryHref)}">${escapeHtml(heroPrimaryLabel)}</a>
            <a class="button button-secondary" href="#how-it-works">How It Works</a>
          </div>
          <p class="mini-note">Full access to simulation and backtesting during your trial. Live trading is isolated behind secure risk controls.</p>
          <div class="proof-strip" aria-label="Highlights">
            <article class="proof-card">
              <strong>Deterministic backtests</strong>
              <span>Verify strategy performance with repeatable historical replays and precise fill modeling.</span>
            </article>
            <article class="proof-card">
              <strong>Live paper sessions</strong>
              <span>Bridge the gap between research and reality with real-time simulation using live market data.</span>
            </article>
            <article class="proof-card">
              <strong>Secure live execution</strong>
              <span>Deploy to live markets with isolated key management and automated risk safeguards.</span>
            </article>
          </div>
        </div>
      </section>

      <section class="section" id="how-it-works">
        <div class="section-intro">
          <span class="kicker">How It Works</span>
          <h2>A powerful trading engine behind a simple interface.</h2>
          <p>Ifyrt provides the tools you need to research, test, and execute algorithmic strategies without the overhead of traditional trading platforms.</p>
        </div>
        <div class="step-grid">
          <article class="panel step-card">
            <span class="number-pill">01</span>
            <h3>Connect in Telegram</h3>
            <p>Launch your first simulation in seconds. Telegram serves as your unified command center for deployment and monitoring.</p>
          </article>
          <article class="panel step-card">
            <span class="number-pill">02</span>
            <h3>Backtest & Validate</h3>
            <p>Verify your edge with high-fidelity historical data and order-book-aware simulation before committing capital.</p>
          </article>
          <article class="panel step-card">
            <span class="number-pill">03</span>
            <h3>Execute with Confidence</h3>
            <p>Transition to paper trading or live execution using identical logic, protected by server-side risk controls.</p>
          </article>
        </div>
      </section>

      <section class="section" aria-label="Product overview">
        <div class="showcase-grid">
          <article class="panel feature-card">
            <span class="kicker">Integrated Workflow</span>
            <h3>Command-driven precision for every stage of your strategy.</h3>
            <div class="signal-cluster">
              <div class="command-line">
                <strong>/backtest</strong>
                <p>Execute historical simulations to refine entry logic and risk parameters.</p>
              </div>
              <div class="command-line">
                <strong>/simulate</strong>
                <p>Monitor live paper trading sessions with real-time exchange data and fees.</p>
              </div>
              <div class="command-line">
                <strong>/status</strong>
                <p>Track performance, open positions, and subscription state instantly from your chat.</p>
              </div>
            </div>
          </article>
          <article class="panel feature-card">
            <span class="kicker">Architecture</span>
            <h3>Designed for reliability and performance.</h3>
            <p>Ifyrt is built with a clear separation between research and execution, ensuring your live funds are always protected by robust safeguards.</p>
            <ul class="list-tight">
              <li>High-fidelity matching engine with real slippage modeling.</li>
              <li>Secure, encrypted API key management via Supabase Vault.</li>
              <li>Subscription-based access with transparent pricing.</li>
              <li>Direct support available at <a href="mailto:${escapeHtml(options.supportEmail)}">${escapeHtml(options.supportEmail)}</a>.</li>
            </ul>
          </article>
        </div>
      </section>

      <section class="section" id="pricing">
        <div class="pricing-shell">
          <article class="panel pricing-card">
            <span class="kicker">Pricing</span>
            <h2>Simple, transparent pricing for serious traders.</h2>
            <p>Start with a 7-day free trial of all simulation features. Upgrade to Pro for live execution and full platform capabilities.</p>
            <div class="price-points">
              <div class="price-point">
                <div>
                  <strong>7-Day Free Trial</strong>
                  <p>Full access to backtesting and real-time paper simulation. No credit card required to start in Telegram.</p>
                </div>
              </div>
              <div class="price-point">
                <div>
                  <strong>Pro Subscription — $6.99/month</strong>
                  <p>Unlocks live trading execution, secure key management, and professional risk controls.</p>
                </div>
              </div>
              <div class="price-point">
                <div>
                  <strong>Unified Command Surface</strong>
                  <p>Control your entire trading lifecycle through a streamlined, professional Telegram interface.</p>
                </div>
              </div>
            </div>
          </article>
          <aside class="panel panel-strong pricing-card">
            <span class="price-callout">Ready to begin?</span>
            <h3>Join the future of algorithmic strategy development.</h3>
            <p>${hasStripe ? "Upgrade to Pro for $6.99/month to gain full access to live execution and professional risk controls." : "Open the bot and start your 7-day trial immediately with full access to simulation features."}</p>
            <div class="cta-group">
              <a class="button button-primary" href="${escapeHtml(pricingPrimaryHref)}">${escapeHtml(pricingPrimaryLabel)}</a>
              <a class="button button-secondary" href="${escapeHtml(pricingSecondaryHref)}">${escapeHtml(pricingSecondaryLabel)}</a>
            </div>
            <p class="mini-note">Have questions? Contact our team at <a href="mailto:${escapeHtml(options.supportEmail)}">${escapeHtml(options.supportEmail)}</a>.</p>
          </aside>
        </div>
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
            <p>Ifyrt employs industry-standard security practices, ensuring all sensitive data and trading operations are handled within our secure, isolated backend infrastructure.</p>
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
