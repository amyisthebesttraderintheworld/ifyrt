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
    <meta name="theme-color" content="#08060f" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,300&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #08060f;
        --bg-deep: #050310;
        --panel: rgba(14, 10, 24, 0.88);
        --panel-strong: rgba(10, 7, 20, 0.96);
        --line: rgba(160, 130, 220, 0.12);
        --line-strong: rgba(180, 140, 255, 0.2);
        --text: #f0ecff;
        --text-soft: #b8aed4;
        --text-faint: #7a6f99;
        --accent: #c084fc;
        --accent-2: #a78bfa;
        --accent-pink: #f0abfc;
        --accent-soft: #f9a8d4;
        --accent-glow: rgba(192, 132, 252, 0.18);
        --accent-glow-strong: rgba(192, 132, 252, 0.32);
        --shadow: 0 40px 100px rgba(0, 0, 0, 0.7);
        --shadow-glow: 0 0 80px rgba(167, 139, 250, 0.08);
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
        font-family: "DM Sans", "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(ellipse at 20% -10%, rgba(139, 92, 246, 0.22) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 10%, rgba(240, 171, 252, 0.1) 0%, transparent 40%),
          radial-gradient(ellipse at 50% 90%, rgba(109, 40, 217, 0.12) 0%, transparent 50%),
          linear-gradient(160deg, #0c0818 0%, #08060f 45%, #050310 100%);
      }

      body::before,
      body::after {
        content: "";
        position: fixed;
        pointer-events: none;
        z-index: -1;
      }

      body::before {
        inset: -20% auto auto 5%;
        width: 60vw;
        height: 60vw;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(139, 92, 246, 0.14), transparent 65%);
        filter: blur(72px);
        animation: drift 18s ease-in-out infinite;
      }

      body::after {
        right: 4%;
        bottom: 8%;
        width: 36vw;
        height: 36vw;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(240, 171, 252, 0.09), transparent 68%);
        filter: blur(80px);
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
        font-family: "Syne", "Segoe UI", sans-serif;
        letter-spacing: -0.03em;
      }

      h1 {
        font-size: clamp(2.8rem, 8vw, 5.6rem);
        line-height: 0.94;
        font-weight: 800;
      }

      h2 {
        font-size: clamp(1.9rem, 4.4vw, 3.2rem);
        line-height: 1;
        font-weight: 700;
      }

      h3 {
        font-size: clamp(1.2rem, 2vw, 1.55rem);
        line-height: 1.1;
        font-weight: 700;
      }

      .page-shell {
        width: min(1180px, calc(100% - 32px));
        margin: 0 auto;
        padding: 20px 0 72px;
      }

      .panel {
        border: 1px solid var(--line);
        background: linear-gradient(160deg, rgba(14, 10, 24, 0.95) 0%, rgba(8, 5, 18, 0.92) 100%);
        border-radius: 28px;
        box-shadow: var(--shadow), var(--shadow-glow);
        backdrop-filter: blur(20px);
      }

      .panel-strong {
        background: linear-gradient(160deg, rgba(12, 8, 22, 0.99) 0%, rgba(6, 3, 16, 0.98) 100%);
      }

      .site-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        align-items: center;
        gap: 20px;
        padding: 10px 18px;
        margin-bottom: 20px;
        border: 1px solid rgba(160, 130, 220, 0.1);
        border-radius: 999px;
        background: rgba(8, 5, 18, 0.75);
        backdrop-filter: blur(24px);
        position: sticky;
        top: 18px;
        z-index: 20;
      }

      .brand-lockup {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      .brand-logo {
        height: 26px;
        width: auto;
      }

      .brand-mark {
        font-family: "Syne", sans-serif;
        font-size: 0.92rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        background: linear-gradient(90deg, var(--accent-soft) 0%, var(--accent) 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }

      .brand-note {
        color: var(--text-faint);
        font-size: 0.83rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .site-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        justify-content: center;
      }

      .nav-link {
        padding: 9px 16px;
        border-radius: 999px;
        color: var(--text-soft);
        font-size: 0.92rem;
        font-weight: 500;
        transition: color 180ms ease, background 180ms ease, transform 180ms ease;
      }

      .nav-link:hover,
      .nav-link:focus-visible {
        color: var(--text);
        background: rgba(192, 132, 252, 0.08);
        transform: translateY(-1px);
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 0 24px;
        border-radius: 999px;
        border: 1px solid transparent;
        font-weight: 700;
        font-size: 0.96rem;
        letter-spacing: 0.01em;
        transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease, border-color 200ms ease;
        cursor: pointer;
      }

      .button:hover,
      .button:focus-visible,
      .jump-link:hover,
      .jump-link:focus-visible,
      .footer-link:hover,
      .footer-link:focus-visible {
        transform: translateY(-2px);
      }

      .button-small {
        min-height: 42px;
        padding: 0 18px;
        font-size: 0.9rem;
      }

      .button-primary {
        color: #0e0618;
        background: linear-gradient(135deg, var(--accent-soft) 0%, var(--accent) 50%, var(--accent-2) 100%);
        box-shadow: 0 0 0 1px rgba(192, 132, 252, 0.3) inset, 0 14px 40px rgba(139, 92, 246, 0.3);
      }

      .button-primary:hover,
      .button-primary:focus-visible {
        box-shadow: 0 0 0 1px rgba(192, 132, 252, 0.4) inset, 0 18px 50px rgba(139, 92, 246, 0.42);
      }

      .button-secondary {
        border-color: var(--line);
        background: rgba(192, 132, 252, 0.04);
        color: var(--text);
      }

      .button-secondary:hover,
      .button-secondary:focus-visible {
        background: rgba(192, 132, 252, 0.09);
        border-color: var(--line-strong);
      }

      .header-action {
        justify-self: end;
      }

      .hero {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: calc(100vh - 180px);
        margin-top: 16px;
      }

      .hero-shell {
        width: min(960px, 100%);
        padding: 68px 44px 44px;
        text-align: center;
        overflow: hidden;
        position: relative;
      }

      .hero-shell::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(ellipse at 50% 0%, rgba(167, 139, 250, 0.14), transparent 48%),
          radial-gradient(ellipse at 50% 100%, rgba(240, 171, 252, 0.06), transparent 40%);
        pointer-events: none;
      }

      .hero-shell::after {
        content: "";
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(160, 130, 220, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(160, 130, 220, 0.04) 1px, transparent 1px);
        background-size: 48px 48px;
        pointer-events: none;
        mask-image: radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%);
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
        padding: 8px 16px;
        border-radius: 999px;
        border: 1px solid rgba(192, 132, 252, 0.2);
        background: rgba(14, 8, 28, 0.7);
        color: var(--accent);
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .eyebrow::before,
      .hero-badge::before,
      .price-callout::before {
        content: "";
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--accent-soft), var(--accent));
        box-shadow: 0 0 12px var(--accent-glow-strong);
        animation: pulse 2.4s ease-in-out infinite;
      }

      .hero-title {
        max-width: 800px;
        margin: 28px auto 0;
      }

      .hero-title span {
        background: linear-gradient(100deg, var(--accent-soft) 0%, var(--accent) 40%, var(--accent-2) 80%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }

      .hero-lead {
        max-width: 640px;
        margin: 22px auto 0;
        font-size: 1.07rem;
        font-weight: 300;
      }

      .cta-group {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 12px;
        margin-top: 34px;
        align-items: center;
      }

      .stripe-wrap {
        display: flex;
        justify-content: center;
        width: 100%;
      }

      .mini-note {
        margin-top: 20px;
        font-size: 0.88rem;
        color: var(--text-faint);
      }

      .proof-strip,
      .step-grid,
      .showcase-grid,
      .pricing-shell,
      .legal-shell {
        display: grid;
        gap: 16px;
      }

      .proof-strip {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-top: 44px;
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
        border-radius: 20px;
        border: 1px solid var(--line);
        background: rgba(10, 7, 22, 0.65);
        text-align: left;
      }

      .proof-card::before,
      .legal-card::before,
      .legal-sidebar::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(192, 132, 252, 0.3), transparent);
      }

      .proof-card strong,
      .price-point strong,
      .support-panel strong {
        display: block;
        color: var(--text);
        font-size: 0.97rem;
        font-weight: 700;
      }

      .proof-card span {
        display: block;
        margin-top: 8px;
        color: var(--text-soft);
        font-size: 0.9rem;
      }

      .section {
        margin-top: 32px;
      }

      .section-intro {
        max-width: 700px;
        margin-bottom: 22px;
      }

      .section-intro p {
        margin-top: 14px;
      }

      .kicker {
        display: inline-block;
        margin-bottom: 14px;
        color: var(--accent);
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .step-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .step-card::after,
      .feature-card::after,
      .pricing-card::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 20px;
        right: 20px;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(192, 132, 252, 0.2), transparent);
      }

      .number-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 52px;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid var(--line-strong);
        background: rgba(139, 92, 246, 0.12);
        color: var(--accent);
        font-size: 0.76rem;
        font-weight: 800;
        letter-spacing: 0.14em;
      }

      .step-card h3,
      .feature-card h3,
      .pricing-card h3,
      .legal-title {
        margin-top: 18px;
      }

      .step-card p,
      .feature-card p,
      .pricing-card p {
        margin-top: 12px;
      }

      .showcase-grid,
      .pricing-shell {
        grid-template-columns: minmax(0, 1fr) minmax(300px, 0.95fr);
      }

      .signal-cluster {
        display: grid;
        gap: 12px;
        margin-top: 22px;
      }

      .command-line {
        padding: 16px 18px 14px;
        border-radius: 18px;
        border: 1px solid rgba(167, 139, 250, 0.1);
        background: rgba(139, 92, 246, 0.05);
      }

      .command-line strong {
        display: block;
        margin-bottom: 6px;
        color: var(--accent);
        font-size: 0.97rem;
        font-family: "Courier New", monospace;
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
        gap: 18px;
        margin-top: 24px;
      }

      .price-point {
        display: grid;
        grid-template-columns: 20px minmax(0, 1fr);
        gap: 14px;
        align-items: start;
      }

      .price-point::before {
        content: "";
        width: 9px;
        height: 9px;
        margin-top: 9px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--accent-soft) 0%, var(--accent-2) 100%);
        box-shadow: 0 0 14px rgba(192, 132, 252, 0.28);
      }

      .legal-shell {
        grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.1fr);
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
        margin-top: 14px;
        font-size: 0.92rem;
        color: var(--text-faint);
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
        gap: 8px;
        padding: 10px 16px;
        border-radius: 16px;
        border: 1px solid var(--line);
        background: rgba(192, 132, 252, 0.03);
        font-size: 0.88rem;
        color: var(--text-soft);
        transition: background 180ms ease, border-color 180ms ease, transform 180ms ease;
      }

      .jump-link::after {
        content: "→";
        color: var(--accent);
        font-weight: 700;
      }

      .jump-link:hover,
      .jump-link:focus-visible,
      .footer-link:hover,
      .footer-link:focus-visible {
        background: rgba(192, 132, 252, 0.08);
        border-color: var(--line-strong);
        color: var(--text);
      }

      .support-panel {
        margin-top: 22px;
        padding: 18px;
        border-radius: 18px;
        border: 1px solid rgba(192, 132, 252, 0.16);
        background: rgba(14, 8, 28, 0.48);
      }

      .support-panel p {
        margin-top: 8px;
      }

      .footer {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 18px;
        margin-top: 24px;
        padding: 24px 30px;
      }

      .footer::before {
        content: "";
        position: absolute;
        top: 0;
        left: 40px;
        right: 40px;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(192, 132, 252, 0.25), transparent);
      }

      .footer-copy {
        max-width: 540px;
      }

      .footer-copy p {
        margin-top: 12px;
      }

      .footer-links {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }

      .animate-on-scroll {
        opacity: 0;
        transform: translateY(28px);
        transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .animate-on-scroll.visible {
        opacity: 1;
        transform: translateY(0);
      }

      @keyframes drift {
        0%,
        100% {
          transform: translate3d(0, 0, 0) scale(1);
        }

        50% {
          transform: translate3d(2%, -2%, 0) scale(1.06);
        }
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }

        50% {
          opacity: 0.5;
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
          padding: 16px;
          border-radius: 28px;
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
          padding: 14px 0 48px;
        }

        .site-header {
          top: 10px;
        }

        .brand-note {
          display: none;
        }

        .hero-shell {
          padding: 44px 22px 30px;
          border-radius: 24px;
        }

        .cta-group {
          flex-direction: column;
          align-items: stretch;
        }

        .site-nav,
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
          padding: 20px;
          border-radius: 20px;
        }

        .footer {
          flex-direction: column;
          align-items: stretch;
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
    <script async src="https://js.stripe.com/v3/buy-button.js"></script>
  </head>
  <body>
    ${body}
    <script>
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

      document.querySelectorAll('.animate-on-scroll').forEach((element) => {
        observer.observe(element);
      });
    </script>
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
      <img src="/assets/brand/ifyrt-logo-primary.png" alt="Ifyrt logo" class="brand-logo" />
      <span class="brand-mark">Ifyrt</span>
      <span class="brand-note">Telegram-native strategy simulation</span>
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
  const hasStripe = Boolean(options.stripeUrl);
  const pricingSecondaryLabel = hasStripe ? "Start Free Trial" : "How It Works";
  const pricingSecondaryHref = hasStripe ? options.botUrl : "#how-it-works";

  return layout(
    "Ifyrt",
    "Telegram-native trading simulation with deterministic backtests, paper execution, and professional-grade strategy validation.",
    `<main class="page-shell">
      ${renderSiteHeader("home", "#pricing")}

      <section class="hero">
        <div class="panel panel-strong hero-shell animate-on-scroll">
          <span class="hero-badge">7-Day Free Trial Available</span>
          <h1 class="hero-title">Algorithmic trading, <span>orchestrated from Telegram</span></h1>
          <p class="hero-lead">High-fidelity backtesting and real-time paper trading for serious strategy development. Start with a <strong>7-day free trial</strong> and validate your ideas before transitioning to live execution.</p>
          <div class="cta-group">
            <div class="stripe-wrap">
              <stripe-buy-button
                buy-button-id="buy_btn_1TGkOd8xqBofAeppPtBiwcVh"
                publishable-key="pk_live_51TGiY98xqBofAeppqQCoN7ryX23nOjwx5Q0SccQ8ppQleLz2qFASDfp0t2kHegluOnbp63mv079Xo1dCz0ssAA8e00pVGiQE7s"
              ></stripe-buy-button>
            </div>
            <a class="button button-secondary" href="${escapeHtml(options.botUrl)}">Open in Telegram</a>
            <a class="button button-secondary" href="#how-it-works">How It Works</a>
          </div>
          <p class="mini-note">Full access to simulation and backtesting during your trial. Live trading is isolated behind secure risk controls.</p>
          <div class="proof-strip" aria-label="Highlights">
            <article class="proof-card animate-on-scroll">
              <strong>Deterministic backtests</strong>
              <span>Verify strategy performance with repeatable historical replays and precise fill modeling.</span>
            </article>
            <article class="proof-card animate-on-scroll">
              <strong>Live paper sessions</strong>
              <span>Bridge the gap between research and reality with real-time simulation using live market data.</span>
            </article>
            <article class="proof-card animate-on-scroll">
              <strong>Secure live execution</strong>
              <span>Deploy to live markets with isolated key management and automated risk safeguards.</span>
            </article>
          </div>
        </div>
      </section>

      <section class="section" id="how-it-works">
        <div class="section-intro animate-on-scroll">
          <span class="kicker">How It Works</span>
          <h2>A powerful trading engine behind a simple interface.</h2>
          <p>Ifyrt provides the tools you need to research, test, and execute algorithmic strategies without the overhead of traditional trading platforms.</p>
        </div>
        <div class="step-grid">
          <article class="panel step-card animate-on-scroll">
            <span class="number-pill">01</span>
            <h3>Connect in Telegram</h3>
            <p>Launch your first simulation in seconds. Telegram serves as your unified command center for deployment and monitoring.</p>
          </article>
          <article class="panel step-card animate-on-scroll">
            <span class="number-pill">02</span>
            <h3>Backtest & Validate</h3>
            <p>Verify your edge with high-fidelity historical data and order-book-aware simulation before committing capital.</p>
          </article>
          <article class="panel step-card animate-on-scroll">
            <span class="number-pill">03</span>
            <h3>Execute with Confidence</h3>
            <p>Transition to paper trading or live execution using identical logic, protected by server-side risk controls.</p>
          </article>
        </div>
      </section>

      <section class="section" aria-label="Product overview">
        <div class="showcase-grid">
          <article class="panel feature-card animate-on-scroll">
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
          <article class="panel feature-card animate-on-scroll">
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
          <article class="panel pricing-card animate-on-scroll">
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
          <aside class="panel panel-strong pricing-card animate-on-scroll">
            <span class="price-callout">Ready to begin?</span>
            <h3>Join the future of algorithmic strategy development.</h3>
            <p>${hasStripe ? "Upgrade to Pro for $6.99/month to gain full access to live execution and professional risk controls." : "Open the bot and start your 7-day trial immediately with full access to simulation features."}</p>
            <div class="cta-group">
              <div class="stripe-wrap">
                <stripe-buy-button
                  buy-button-id="buy_btn_1TGkOd8xqBofAeppPtBiwcVh"
                  publishable-key="pk_live_51TGiY98xqBofAeppqQCoN7ryX23nOjwx5Q0SccQ8ppQleLz2qFASDfp0t2kHegluOnbp63mv079Xo1dCz0ssAA8e00pVGiQE7s"
                ></stripe-buy-button>
              </div>
              <a class="button button-primary" href="${escapeHtml(options.botUrl)}">Open in Telegram</a>
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
