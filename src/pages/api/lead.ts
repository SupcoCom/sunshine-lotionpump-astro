/**
 * POST /api/lead — the only dynamic endpoint in the otherwise fully static site.
 *
 * It validates the submission, then forwards it to the WordPress Contact Form 7
 * REST endpoint that already owns the client's mail + Flamingo + HubSpot
 * pipeline. WordPress therefore stays the single source of truth for leads and
 * the static host needs no PHP.
 *
 * Runs as a Cloudflare Worker function (adapter: @astrojs/cloudflare).
 */
import type { APIRoute } from 'astro';
import { LEAD } from '@/config/site';
import cf7Meta from '@/data/cf7.json';

export const prerender = false;

interface Cf7Meta {
  formId?: string;
  version?: string;
  locale?: string;
}

const META: Cf7Meta[] = Array.isArray(cf7Meta) ? (cf7Meta as Cf7Meta[]) : [];
const FORM_ID = META[0]?.formId || String(LEAD.wpFormId);
const FORM_VERSION = META[0]?.version || '6.1.7';
const FORM_LOCALE = META[0]?.locale || 'en_US';

const MAX_NAME = 200;
const MAX_MESSAGE = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const strip = (value: unknown, max: number): string =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max);

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export const POST: APIRoute = async ({ request }) => {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, message: 'Malformed request.' }, 400);
  }

  // Honeypot — silently accept so bots do not learn anything.
  if (strip(payload.website, 50)) {
    return json({ ok: true, message: 'Thanks — we will be in touch.' });
  }

  const name = strip(payload['your-name'], MAX_NAME);
  const email = strip(payload['your-email'], MAX_NAME);
  const message = strip(payload['your-message'], MAX_MESSAGE);
  const source = strip(payload['lp-source'], 80) || 'site';
  const group = strip(payload['lp-group'], 120);
  const pageUrl = strip(payload.page_url, 300);

  const errors: string[] = [];
  if (name.length < 2) errors.push('name');
  if (!EMAIL_RE.test(email)) errors.push('email');
  if (message.length < 10) errors.push('message');
  if (errors.length) {
    return json(
      { ok: false, message: 'Please check the highlighted fields and try again.', fields: errors },
      422,
    );
  }

  // Forward to WordPress / Contact Form 7.
  const forward = new FormData();
  forward.set('_wpcf7', FORM_ID);
  forward.set('_wpcf7_version', FORM_VERSION);
  forward.set('_wpcf7_locale', FORM_LOCALE);
  forward.set('_wpcf7_unit_tag', `wpcf7-f${FORM_ID}-o1`);
  forward.set('_wpcf7_container_post', '0');
  forward.set('your-name', name);
  forward.set('your-email', email);
  forward.set('your-message', message);
  forward.set('lp-source', source);
  forward.set('lp-group', group);
  forward.set('page_url', pageUrl);

  const endpoint = `${LEAD.wpEndpoint}/${FORM_ID}/feedback`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const upstream = await fetch(endpoint, {
      method: 'POST',
      body: forward,
      headers: { accept: 'application/json' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const raw = await upstream.text();
    let parsed: { status?: string; message?: string } = {};
    try {
      parsed = JSON.parse(raw) as { status?: string; message?: string };
    } catch {
      /* CF7 occasionally returns HTML on hard failures */
    }

    const status = parsed.status ?? (upstream.ok ? 'mail_sent' : 'upstream_error');
    const plain = (parsed.message ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    if (status === 'mail_sent') {
      return json({
        ok: true,
        message: plain || 'Thanks — your inquiry reached our team. We reply within 24 hours.',
      });
    }

    if (status === 'validation_failed') {
      return json({ ok: false, message: plain || 'Please check the form and try again.' }, 422);
    }

    if (status === 'spam') {
      return json({ ok: true, message: 'Thanks — we will be in touch.' });
    }

    console.error('lead upstream failure', { status, raw: raw.slice(0, 500) });
    return json(
      {
        ok: false,
        message:
          plain ||
          'We could not deliver your message right now. Please email info@sunshine-lotionpump.com directly.',
      },
      502,
    );
  } catch (error) {
    console.error('lead forward error', String(error));
    return json(
      {
        ok: false,
        message:
          'Network problem while sending. Please email info@sunshine-lotionpump.com directly — we will respond within 24 hours.',
      },
      502,
    );
  }
};

export const GET: APIRoute = () =>
  json({ ok: false, message: 'Use POST to submit an inquiry.' }, 405);
