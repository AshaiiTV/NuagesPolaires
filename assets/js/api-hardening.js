/* Nuages Polaires — API Hardening v274
   Goal: make DB/Auth failures visible, non-destructive and less likely to crash the UI.
*/
(function(){
  'use strict';

  var VERSION = 'v274';
  var STYLE_ID = 'np-api-hardening-style-v259';
  var BANNER_ID = 'np-api-status-banner';
  var TOAST_ID = 'np-api-toast-stack';
  var CHECK_TIMER = null;
  var WRAP_TIMER = null;
  var LAST_WARN_AT = {};
  var STATE = {
    online: true,
    db: 'unknown',
    auth: 'unknown',
    lastError: '',
    lastStatus: 0,
    lastCheckAt: 0,
    failures: 0
  };

  function isLoggedOrPrivateAppVisible(){
    try{
      if(window.CU && window.CU.role) return true;
      var app = document.getElementById('s-app');
      if(app && app.classList && app.classList.contains('active')) return true;
      if(document.body && document.body.classList && document.body.classList.contains('logged-in')) return true;
    }catch(e){}
    return false;
  }

  function now(){ return Date.now(); }

  function throttle(key, ms){
    var t = now();
    if(LAST_WARN_AT[key] && t - LAST_WARN_AT[key] < ms) return false;
    LAST_WARN_AT[key] = t;
    return true;
  }

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    var css = `
#${BANNER_ID}{
  position:fixed;
  left:50%;
  top:12px;
  transform:translateX(-50%);
  z-index:2147482500;
  width:min(780px,calc(100vw - 24px));
  display:none;
  align-items:center;
  gap:10px;
  padding:10px 12px;
  border-radius:16px;
  border:1px solid rgba(242,198,109,.22);
  background:linear-gradient(135deg,rgba(33,24,10,.94),rgba(18,13,8,.94));
  color:#fff4d6;
  box-shadow:0 16px 42px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.08);
  backdrop-filter:blur(16px) saturate(120%);
  font-size:13px;
  line-height:1.35;
}
#${BANNER_ID}.show{display:flex;}
#${BANNER_ID}.bad{
  border-color:rgba(227,76,98,.26);
  background:linear-gradient(135deg,rgba(42,9,16,.95),rgba(18,6,9,.95));
  color:#ffdce3;
}
#${BANNER_ID}.ok{
  border-color:rgba(82,210,122,.20);
  background:linear-gradient(135deg,rgba(12,37,22,.94),rgba(7,18,12,.94));
  color:#dcffe7;
}
.np-api-banner-dot{
  width:10px;height:10px;border-radius:999px;
  background:#f2c66d;
  box-shadow:0 0 18px rgba(242,198,109,.55);
  flex:0 0 auto;
}
#${BANNER_ID}.bad .np-api-banner-dot{background:#e34c62;box-shadow:0 0 18px rgba(227,76,98,.55);}
#${BANNER_ID}.ok .np-api-banner-dot{background:#52d27a;box-shadow:0 0 18px rgba(82,210,122,.45);}
.np-api-banner-text{flex:1 1 auto;min-width:0;}
.np-api-banner-actions{display:flex;gap:8px;align-items:center;flex:0 0 auto;}
.np-api-banner-btn{
  min-height:30px;
  padding:0 10px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.07);
  color:inherit;
  font-weight:850;
  cursor:pointer;
}
#${TOAST_ID}{
  position:fixed;
  right:16px;
  top:70px;
  z-index:2147482400;
  display:grid;
  gap:8px;
  width:min(360px,calc(100vw - 32px));
  pointer-events:none;
}
.np-api-toast{
  pointer-events:auto;
  border-radius:14px;
  padding:10px 12px;
  border:1px solid rgba(126,184,212,.18);
  background:linear-gradient(180deg,rgba(18,24,40,.94),rgba(8,12,22,.94));
  color:#f5f7fb;
  box-shadow:0 14px 34px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.08);
  font-size:13px;
  line-height:1.38;
  animation:npApiToastIn .16s ease-out both;
}
.np-api-toast.warn{border-color:rgba(242,198,109,.22);color:#fff4d6;}
.np-api-toast.bad{border-color:rgba(227,76,98,.26);color:#ffdce3;}
.np-api-toast.ok{border-color:rgba(82,210,122,.20);color:#dcffe7;}
@keyframes npApiToastIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@media(max-width:640px){
  #${BANNER_ID}{top:8px;font-size:12px;padding:9px 10px;}
  #${TOAST_ID}{right:8px;top:62px;width:calc(100vw - 16px);}
  .np-api-banner-actions{display:none;}
}
    `;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function ensureToastStack(){
    var stack = document.getElementById(TOAST_ID);
    if(stack) return stack;
    stack = document.createElement('div');
    stack.id = TOAST_ID;
    document.body.appendChild(stack);
    return stack;
  }

  function toast(message, kind, ttl){
    injectStyle();
    if(!document.body) return;
    kind = kind || 'warn';
    ttl = ttl || 5200;
    var stack = ensureToastStack();
    var el = document.createElement('div');
    el.className = 'np-api-toast ' + kind;
    el.textContent = String(message || '');
    stack.appendChild(el);
    setTimeout(function(){
      try{
        el.style.opacity = '0';
        el.style.transform = 'translateY(-5px)';
        setTimeout(function(){ el.remove(); }, 180);
      }catch(e){}
    }, ttl);
  }

  function ensureBanner(){
    injectStyle();
    var banner = document.getElementById(BANNER_ID);
    if(banner) return banner;
    banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.innerHTML = [
      '<span class="np-api-banner-dot"></span>',
      '<span class="np-api-banner-text"></span>',
      '<span class="np-api-banner-actions">',
        '<button class="np-api-banner-btn" type="button" data-api-action="retry">Réessayer</button>',
        '<button class="np-api-banner-btn" type="button" data-api-action="diag">Diag</button>',
        '<button class="np-api-banner-btn" type="button" data-api-action="hide">×</button>',
      '</span>'
    ].join('');
    banner.addEventListener('click', function(e){
      var btn = e.target.closest('[data-api-action]');
      if(!btn) return;
      var action = btn.getAttribute('data-api-action');
      if(action === 'retry') checkServices(true);
      if(action === 'diag'){
        try{
          if(window.npDiagnostics && typeof window.npDiagnostics.open === 'function') window.npDiagnostics.open();
          else if(typeof window.npDiag === 'function') window.npDiag();
        }catch(err){}
      }
      if(action === 'hide') hideBanner();
    });
    document.body.appendChild(banner);
    return banner;
  }

  function showBanner(message, kind){
    if(!document.body) return;
    var banner = ensureBanner();
    banner.classList.remove('ok','bad','show');
    if(kind) banner.classList.add(kind);
    banner.querySelector('.np-api-banner-text').textContent = String(message || '');
    banner.classList.add('show');
  }

  function hideBanner(){
    var banner = document.getElementById(BANNER_ID);
    if(banner) banner.classList.remove('show');
  }

  function emitDiag(type, message, data){
    try{
      if(window.npDiagnostics && typeof window.npDiagnostics.events === 'function'){
        // diagnostics.js keeps its internal event function private; opening is enough for access.
      }
    }catch(e){}
    try{
      window.dispatchEvent(new CustomEvent('np:api-status', { detail:{ type:type, message:message, data:data || null, state:Object.assign({}, STATE) } }));
    }catch(e){}
  }

  function safeErrorPayload(status, error, extra){
    return Object.assign({
      ok:false,
      offline:true,
      status:status || 0,
      error:error || 'service_unavailable',
      source:'api-hardening',
      at:Date.now()
    }, extra || {});
  }

  function classifyFunctionUrl(url){
    url = String(url || '');
    if(url.indexOf('/.netlify/functions/db') >= 0) return 'db';
    if(url.indexOf('/.netlify/functions/auth') >= 0) return 'auth';
    return '';
  }

  function handleFailure(service, status, message){
    service = service || 'api';
    STATE.online = false;
    STATE[service] = 'bad';
    STATE.lastStatus = status || 0;
    STATE.lastError = message || 'Erreur API';
    STATE.failures += 1;

    var human = service === 'db'
      ? 'DB indisponible'
      : (service === 'auth' ? 'Auth indisponible' : 'Service indisponible');

    var msg = human + (status ? ' — HTTP ' + status : '') + '. Le site reste ouvert, mais certaines données peuvent ne pas se sauvegarder.';
    showBanner(msg, status >= 500 || !status ? 'bad' : 'warn');

    if(throttle(service + ':' + status + ':' + message, 7000)){
      toast(msg, status >= 500 || !status ? 'bad' : 'warn');
    }

    emitDiag('error', msg, { service:service, status:status, message:message });
  }

  function handleRecovery(service){
    service = service || 'api';
    STATE[service] = 'ok';
    if((STATE.db === 'ok' || STATE.db === 'unknown') && (STATE.auth === 'ok' || STATE.auth === 'unknown')){
      STATE.online = true;
      STATE.failures = 0;
      showBanner('Connexion aux services rétablie.', 'ok');
      if(throttle('recovery', 8000)) toast('Connexion aux services rétablie.', 'ok', 3500);
      setTimeout(hideBanner, 3800);
    }
  }

  function wrapFetch(){
    if(!window.fetch || window.fetch.__npApiHardeningV259) return;
    var nativeFetch = window.fetch;
    var wrapped = function(input, init){
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      var service = classifyFunctionUrl(url);

      return nativeFetch.apply(this, arguments).then(function(res){
        if(service){
          if(res.status >= 500 || res.status === 503){
            handleFailure(service, res.status, 'Erreur serveur');
          }else if(res.ok){
            if(service === 'db') STATE.db = 'ok';
            if(service === 'auth') STATE.auth = 'ok';
          }
        }
        return res;
      }).catch(function(err){
        if(service){
          handleFailure(service, 0, err && err.message ? err.message : String(err));
        }
        throw err;
      });
    };
    wrapped.__npApiHardeningV259 = true;
    window.fetch = wrapped;
  }

  function normalizeResult(data, service, payload){
    if(!data || typeof data !== 'object') return data;
    if(data.status >= 500 || data.status === 503 || data.offline){
      handleFailure(service, data.status || 0, data.error || 'service_unavailable');
    }else if(data.ok !== false && data.status && data.status < 500){
      if(service === 'db') STATE.db = 'ok';
      if(service === 'auth') STATE.auth = 'ok';
    }
    return data;
  }

  function wrapApiFunctions(){
    if(WRAP_TIMER) clearTimeout(WRAP_TIMER);

    function wrap(name, service){
      try{
        var fn = window[name];
        if(typeof fn !== 'function' || fn.__npApiHardeningV259) return false;
        var wrapped = function(payload, opts){
          var ctx = this;
          var args = Array.prototype.slice.call(arguments);
          opts = opts || {};
          return Promise.resolve()
            .then(function(){ return fn.apply(ctx, args); })
            .then(function(data){ return normalizeResult(data, service, payload); })
            .catch(function(err){
              var message = err && err.message ? err.message : String(err);
              handleFailure(service, 0, message);
              if(opts && opts.throwOnError) throw err;
              return safeErrorPayload(0, message, { action: payload && payload.action });
            });
        };
        wrapped.__npApiHardeningV259 = true;
        window[name] = wrapped;
        return true;
      }catch(e){
        return false;
      }
    }

    var did = false;
    did = wrap('_dbCall', 'db') || did;
    did = wrap('_authCall', 'auth') || did;
    did = wrap('_jsonPost', 'api') || did;

    if(!did){
      WRAP_TIMER = setTimeout(wrapApiFunctions, 300);
    }
  }

  async function rawPost(url, payload){
    var started = Date.now();
    try{
      var res = await fetch(url, {
        method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload || {})
      });
      var text = await res.text();
      var data = null;
      try{ data = text ? JSON.parse(text) : null; }catch(e){}
      return { ok:res.ok, status:res.status, data:data, timeMs:Date.now()-started };
    }catch(e){
      return { ok:false, status:0, data:null, error:e && e.message ? e.message : String(e), timeMs:Date.now()-started };
    }
  }

  async function checkServices(manual){
    STATE.lastCheckAt = Date.now();
    if(manual) toast('Vérification des services…', 'warn', 2200);

    // v274: before login, stay passive. Do not call auth verify/session-like endpoints
    // automatically because they can clear cookies or pollute the login flow.
    var privateVisible = isLoggedOrPrivateAppVisible();

    var db = await rawPost('/.netlify/functions/db', { action:'ping' });
    if(db.ok && db.data && db.data.ok !== false){
      STATE.db = 'ok';
    }else{
      STATE.db = 'bad';
      handleFailure('db', db.status || 0, (db.data && db.data.error) || db.error || 'db_unavailable');
    }

    var auth = { ok:false, status:0, skipped:!privateVisible, data:null, timeMs:0 };
    if(privateVisible || manual){
      auth = await rawPost('/.netlify/functions/auth', { action:'verify' });
      if(auth.ok){
        STATE.auth = 'ok';
      }else if(auth.status === 401){
        STATE.auth = 'warn';
        // Not logged in is not a real service failure.
      }else{
        STATE.auth = 'bad';
        handleFailure('auth', auth.status || 0, (auth.data && auth.data.error) || auth.error || 'auth_unavailable');
      }
    }else{
      STATE.auth = 'idle';
    }

    if(STATE.db === 'ok' && (STATE.auth === 'ok' || STATE.auth === 'warn' || STATE.auth === 'idle')){
      handleRecovery('api');
    }

    return Object.assign({}, STATE, { dbCheck:db, authCheck:auth });
  }

  function patchVisibilityEvents(){
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState === 'visible'){
        checkServices(false);
      }
    });
    window.addEventListener('online', function(){
      toast('Réseau navigateur de retour. Vérification des services…', 'ok', 2800);
      checkServices(false);
    });
    window.addEventListener('offline', function(){
      STATE.online = false;
      showBanner('Réseau navigateur hors ligne. Les sauvegardes peuvent échouer.', 'bad');
      toast('Réseau hors ligne : les sauvegardes peuvent échouer.', 'bad');
    });
  }

  function installGlobalHooks(){
    window.addEventListener('unhandledrejection', function(e){
      var reason = e.reason;
      var msg = reason && reason.message ? reason.message : String(reason || '');
      if(/db_unavailable|auth_unavailable|Failed to fetch|service_unavailable|NetworkError/i.test(msg)){
        handleFailure('api', 0, msg);
      }
    });
  }

  function boot(){
    injectStyle();
    if(document.body) ensureToastStack();
    wrapFetch();
    wrapApiFunctions();
    patchVisibilityEvents();
    installGlobalHooks();

    CHECK_TIMER = setTimeout(function(){ checkServices(false); }, 1200);

    window.npApiHardening = {
      version:VERSION,
      state:function(){ return Object.assign({}, STATE); },
      check:checkServices,
      retry:function(){ return checkServices(true); },
      toast:toast,
      showBanner:showBanner,
      hideBanner:hideBanner
    };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
