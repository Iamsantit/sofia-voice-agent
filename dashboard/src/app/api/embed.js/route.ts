import { NextResponse } from "next/server";

/**
 * Drop-in embed snippet for any website.
 *
 * Usage on the customer's site:
 *   <script
 *     src="https://sofia-voice-agent.vercel.app/api/embed.js"
 *     data-agent-id="agent_xxxxxx"
 *     data-position="bottom-right"
 *     defer
 *   ></script>
 *
 * Behavior:
 *  - Injects a small floating amber button at the configured position.
 *  - Click → opens an iframe that loads /embed/{agent_id}.
 *  - Click outside or X → closes.
 *  - Mobile: full-screen takeover.
 *
 * Security: the script reads only its own data-* attributes. No 3rd-party
 * tracking, no cookies, no global pollution beyond window.__quantixaWidget.
 */

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const js = `(function(){
  try {
    if (window.__quantixaWidget) return;
    window.__quantixaWidget = true;
    var s = document.currentScript || (function(){
      var all = document.getElementsByTagName('script');
      return all[all.length - 1];
    })();
    var agentId = s && s.getAttribute('data-agent-id');
    var position = (s && s.getAttribute('data-position')) || 'bottom-right';
    var label = (s && s.getAttribute('data-label')) || 'Háblanos';
    if (!agentId) {
      console.warn('[QuantixaAI] data-agent-id missing on <script> tag');
      return;
    }

    var ORIGIN = ${JSON.stringify(origin)};
    var IFRAME_URL = ORIGIN + '/embed/' + encodeURIComponent(agentId)
      + '?source=' + encodeURIComponent(location.host);

    var pos = {
      'bottom-right': 'right:20px;bottom:20px;',
      'bottom-left':  'left:20px;bottom:20px;',
      'top-right':    'right:20px;top:20px;',
      'top-left':     'left:20px;top:20px;'
    }[position] || 'right:20px;bottom:20px;';

    // Floating button
    var btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Abrir formulario de contacto');
    btn.style.cssText =
      'position:fixed;z-index:2147483646;' + pos +
      'display:flex;align-items:center;gap:8px;' +
      'padding:14px 18px;border:none;border-radius:9999px;' +
      'background:linear-gradient(135deg,#FCD34D,#F97316);' +
      'color:#0a0a0a;font-weight:700;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      'box-shadow:0 8px 24px -8px rgba(251,191,36,0.5);cursor:pointer;' +
      'transition:transform .2s ease;';
    btn.innerHTML = '<span style="font-size:18px;">💬</span><span>' + label + '</span>';
    btn.onmouseover = function(){ btn.style.transform = 'translateY(-2px)'; };
    btn.onmouseout  = function(){ btn.style.transform = 'translateY(0)'; };

    // Backdrop + iframe wrapper
    var backdrop = document.createElement('div');
    backdrop.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;' +
      'background:rgba(0,0,0,.55);backdrop-filter:blur(4px);' +
      'display:none;align-items:center;justify-content:center;padding:20px;';

    var frame = document.createElement('iframe');
    frame.src = IFRAME_URL;
    frame.style.cssText =
      'width:100%;max-width:480px;height:min(640px,90vh);' +
      'border:none;border-radius:16px;background:#0a0a0a;' +
      'box-shadow:0 20px 60px -15px rgba(0,0,0,.8);';

    var close = document.createElement('button');
    close.setAttribute('aria-label', 'Cerrar');
    close.innerHTML = '✕';
    close.style.cssText =
      'position:absolute;top:24px;right:24px;width:36px;height:36px;' +
      'border:none;border-radius:50%;background:rgba(255,255,255,.1);' +
      'color:#fff;font-size:18px;cursor:pointer;';

    backdrop.appendChild(frame);
    backdrop.appendChild(close);

    function open(){ backdrop.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
    function shut(){ backdrop.style.display = 'none'; document.body.style.overflow = ''; }
    btn.onclick = open;
    close.onclick = shut;
    backdrop.addEventListener('click', function(e){ if (e.target === backdrop) shut(); });

    document.body.appendChild(btn);
    document.body.appendChild(backdrop);
  } catch (e) {
    console.warn('[QuantixaAI] embed init failed', e);
  }
})();`;

  return new NextResponse(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
