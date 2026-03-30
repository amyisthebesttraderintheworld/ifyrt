function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

interface LandingOptions {
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
    <style>
      :root {
        color-scheme: dark;
        --bg: #07111f;
        --panel: rgba(8, 20, 37, 0.88);
        --panel-border: rgba(133, 176, 255, 0.18);
        --text: #e8f0ff;
        --muted: #a7bad6;
        --accent: #47c7ff;
        --accent-2: #8cf6d2;
        --shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Segoe UI", Arial, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(71, 199, 255, 0.18), transparent 32%),
          radial-gradient(circle at right 20%, rgba(140, 246, 210, 0.12), transparent 28%),
          linear-gradient(180deg, #081221 0%, #050b14 100%);
        color: var(--text);
      }

      a { color: inherit; }

      .shell {
        width: min(1040px, calc(100% - 32px));
        margin: 0 auto;
        padding: 40px 0 64px;
      }

      .panel {
        background: var(--panel);
        border: 1px solid var(--panel-border);
        border-radius: 28px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(20px);
      }

      .hero {
        padding: 48px;
        display: grid;
        gap: 32px;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(71, 199, 255, 0.12);
        color: var(--accent-2);
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        max-width: 720px;
        font-size: clamp(2.25rem, 6vw, 4.8rem);
        line-height: 0.95;
        letter-spacing: -0.05em;
      }

      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.7;
        font-size: 1rem;
      }

      .lead {
        max-width: 720px;
        font-size: 1.08rem;
      }

      .actions, .links, .grid {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 0 20px;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 600;
      }

      .button-primary {
        background: linear-gradient(135deg, var(--accent), #1f8dff);
        color: #03111f;
      }

      .button-secondary {
        border: 1px solid rgba(167, 186, 214, 0.24);
        color: var(--text);
        background: rgba(255, 255, 255, 0.03);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      .card {
        padding: 22px;
        border-radius: 20px;
        border: 1px solid rgba(167, 186, 214, 0.14);
        background: rgba(255, 255, 255, 0.03);
      }

      .card strong {
        display: block;
        margin-bottom: 10px;
        font-size: 0.95rem;
      }

      .fine {
        font-size: 0.92rem;
      }

      .footer {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 12px;
        margin-top: 24px;
        color: var(--muted);
        font-size: 0.92rem;
      }

      .legal {
        padding: 40px;
        display: grid;
        gap: 18px;
      }

      .legal h1 {
        font-size: clamp(2rem, 4vw, 3.4rem);
      }

      .legal h2 {
        margin: 8px 0 0;
        font-size: 1rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--accent-2);
      }

      ul {
        margin: 0;
        padding-left: 20px;
        color: var(--muted);
      }

      @media (max-width: 640px) {
        .hero, .legal {
          padding: 26px;
        }
      }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

export function renderLandingPage(options: LandingOptions): string {
  const ctaHref = options.stripeUrl ?? options.botUrl;
  const ctaLabel = options.stripeUrl ? "Start Subscription" : "Open Telegram Bot";

  return layout(
    "Ifyrt",
    "Telegram-native trading simulation with Railway-hosted services, Stripe billing, and strict separation between simulation and live execution.",
    `<main class="shell">
      <section class="panel hero">
        <span class="eyebrow">Telegram-native trading simulation</span>
        <div class="grid" style="grid-template-columns: 1.4fr 1fr; gap: 24px;">
          <div style="display:grid; gap:20px;">
            <h1>Ifyrt helps you test trading ideas before you put real money at risk.</h1>
            <p class="lead">Run deterministic backtests, paper trade against live market data, and manage billing through Stripe while the actual orchestration and workers stay on Railway.</p>
            <div class="actions">
              <a class="button button-primary" href="${escapeHtml(ctaHref)}">${escapeHtml(ctaLabel)}</a>
              <a class="button button-secondary" href="${escapeHtml(options.botUrl)}">Use Telegram</a>
            </div>
            <p class="fine">Simulation is the primary product. Live trading remains gated and isolated. Nothing on this page executes trades.</p>
          </div>
          <div class="card">
            <strong>Why this page exists</strong>
            <p>It gives Stripe and visitors a simple public-facing home with product context, support contact details, and links to terms and privacy while the product itself remains Railway-hosted service infrastructure.</p>
          </div>
        </div>
        <div class="grid">
          <div class="card">
            <strong>Backtesting first</strong>
            <p>Repeatable historical runs with shared execution contracts so simulation behavior stays consistent.</p>
          </div>
          <div class="card">
            <strong>Telegram control plane</strong>
            <p>The bot remains the main interface for users. The web surface is intentionally lightweight.</p>
          </div>
          <div class="card">
            <strong>Hosted on Railway</strong>
            <p>Scanning, orchestration, workers, billing hooks, and service state stay server-side where they belong.</p>
          </div>
        </div>
        <div class="footer">
          <div class="links">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
          </div>
          <div>Support: <a href="mailto:${escapeHtml(options.supportEmail)}">${escapeHtml(options.supportEmail)}</a></div>
        </div>
      </section>
    </main>`
  );
}

export function renderTermsPage(options: Pick<LandingOptions, "supportEmail">): string {
  return layout(
    "Ifyrt Terms",
    "Basic terms for Ifyrt.",
    `<main class="shell">
      <section class="panel legal">
        <a href="/">Back to home</a>
        <h1>Terms of Service</h1>
        <p>Effective date: March 30, 2026</p>
        <h2>Service</h2>
        <p>Ifyrt provides trading simulation, educational tooling, and related billing flows. The service is not investment advice and does not guarantee outcomes.</p>
        <h2>Eligibility</h2>
        <p>You are responsible for complying with the laws and exchange rules that apply to you. Do not use the service where it is prohibited.</p>
        <h2>Billing</h2>
        <p>Paid access may renew automatically through Stripe until canceled. Fees, trials, and access windows are shown during checkout or inside the product.</p>
        <h2>Risk disclosure</h2>
        <p>Markets are risky. Simulated performance does not guarantee live results. You are solely responsible for any live trading decisions.</p>
        <h2>Contact</h2>
        <p>Questions about these terms can be sent to <a href="mailto:${escapeHtml(options.supportEmail)}">${escapeHtml(options.supportEmail)}</a>.</p>
      </section>
    </main>`
  );
}

export function renderPrivacyPage(options: Pick<LandingOptions, "supportEmail">): string {
  return layout(
    "Ifyrt Privacy",
    "Basic privacy notice for Ifyrt.",
    `<main class="shell">
      <section class="panel legal">
        <a href="/">Back to home</a>
        <h1>Privacy Policy</h1>
        <p>Effective date: March 30, 2026</p>
        <h2>What we collect</h2>
        <ul>
          <li>Telegram account identifiers needed to operate the bot</li>
          <li>Subscription and billing metadata processed through Stripe</li>
          <li>Simulation, trade, and service usage data needed to run the platform</li>
        </ul>
        <h2>How we use it</h2>
        <p>We use this information to run the product, enforce access, process billing, support users, and improve reliability.</p>
        <h2>Payments</h2>
        <p>Payment information is handled by Stripe. We do not store full card details on our servers.</p>
        <h2>Security</h2>
        <p>Ifyrt is designed to keep orchestration and sensitive workflows on hosted backend services instead of exposing them in client-side surfaces.</p>
        <h2>Contact</h2>
        <p>Questions about privacy can be sent to <a href="mailto:${escapeHtml(options.supportEmail)}">${escapeHtml(options.supportEmail)}</a>.</p>
      </section>
    </main>`
  );
}
