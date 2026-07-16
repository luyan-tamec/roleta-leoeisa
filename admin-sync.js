// admin-sync.js — v2
// Carrega configs do backend e aplica na roleta SEM precisar de F5.
// Usa SSE (Server-Sent Events) para receber atualizações em tempo real.

const ADMIN_BACKEND_URL = "https://roleta-admin.onrender.com"; // ← troque pela URL do Render

// ─── FETCH INICIAL ────────────────────────────────────────────────────────────
async function syncAdmin() {
  try {
    const [cfgRes, arenaRes, sonsRes, imgRes] = await Promise.all([
      fetch(`${ADMIN_BACKEND_URL}/api/config`),
      fetch(`${ADMIN_BACKEND_URL}/api/arena`),
      fetch(`${ADMIN_BACKEND_URL}/api/sons`),
      fetch(`${ADMIN_BACKEND_URL}/api/imagens/bonecos`),
    ]);
    const [cfg, arena, sons, imgs] = await Promise.all([
      cfgRes.json(), arenaRes.json(), sonsRes.json(), imgRes.json(),
    ]);
    if (cfg.ok)   sessionStorage.setItem("admin_config",  JSON.stringify(cfg.data));
    if (arena.ok) sessionStorage.setItem("admin_arena",   JSON.stringify(arena.data));
    if (sons.ok)  sessionStorage.setItem("admin_sons",    JSON.stringify(sons.data));
    if (imgs.ok)  sessionStorage.setItem("admin_bonecos", JSON.stringify(imgs.data));
    console.log("[admin-sync] ✅ Configs carregadas do backend.");
  } catch (e) {
    console.warn("[admin-sync] ⚠️ Backend offline, usando configs locais.", e.message);
  }
}

// ─── SSE — recebe push do backend ao salvar no painel ─────────────────────────
function connectSSE() {
  const sse = new EventSource(`${ADMIN_BACKEND_URL}/api/events`);

  sse.addEventListener("config",  e => { sessionStorage.setItem("admin_config",  e.data); applyConfig(JSON.parse(e.data)); });
  sse.addEventListener("sons",    e => { sessionStorage.setItem("admin_sons",    e.data); applySons(JSON.parse(e.data)); });
  sse.addEventListener("arena",   e => { sessionStorage.setItem("admin_arena",   e.data); applyArena(JSON.parse(e.data)); });
  sse.addEventListener("imagens", e => { applyImagens(JSON.parse(e.data)); });
  sse.addEventListener("bonecos", e => { sessionStorage.setItem("admin_bonecos", e.data); applyBonecos(JSON.parse(e.data)); });

  sse.onerror = () => {
    // Reconecta automaticamente após 5s se cair
    sse.close();
    setTimeout(connectSSE, 5000);
  };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function adminGetConfig()  { return JSON.parse(sessionStorage.getItem("admin_config")  || "null"); }
function adminGetArena()   { return JSON.parse(sessionStorage.getItem("admin_arena")   || "null"); }
function adminGetSons()    { return JSON.parse(sessionStorage.getItem("admin_sons")    || "null"); }
function adminGetBonecos() { return JSON.parse(sessionStorage.getItem("admin_bonecos") || "null"); }

// ─── APLICAR CONFIG GERAL ────────────────────────────────────────────────────
function applyConfig(cfg) {
  cfg = cfg || adminGetConfig();
  if (!cfg) return;

  if (cfg.titulo) {
    const el = document.getElementById("titulo");
    if (el) el.textContent = cfg.titulo;
    document.title = cfg.titulo;
  }
  if (cfg.tempoPadrao) {
    const el = document.getElementById("tempo");
    if (el) el.value = cfg.tempoPadrao;
    localStorage.setItem("r1_tempoPadrao", cfg.tempoPadrao);
  }
  if (cfg.modoCor) {
    const el = document.getElementById("modoCor");
    if (el) { el.value = cfg.modoCor; el.dispatchEvent(new Event("change")); }
    localStorage.setItem("r1_modoCor", cfg.modoCor);
  }
  if (typeof cfg.autoRemoverVencedor === "boolean") {
    const el = document.getElementById("checkAutoRemover");
    if (el) el.checked = cfg.autoRemoverVencedor;
  }
  if (typeof cfg.autoOcultarPainel === "boolean") {
    const el = document.getElementById("meucheck");
    if (el) el.checked = cfg.autoOcultarPainel;
  }
  if (typeof cfg.temaAutoRotar === "boolean") {
    const el = document.getElementById("checkTemaRotar");
    if (el) el.checked = cfg.temaAutoRotar;
    localStorage.setItem("r1_temaAutoRotar", cfg.temaAutoRotar);
  }
}

// ─── APLICAR SONS ────────────────────────────────────────────────────────────
function applySons(sons) {
  sons = sons || adminGetSons();
  if (!sons) return;

  if (typeof sons.volumeMusica === "number") {
    localStorage.setItem("r1_volumeMusica", sons.volumeMusica);
    const el = document.getElementById("volumeMusica");
    // slider vai de 0–10 no HTML
    if (el) { el.value = Math.round(sons.volumeMusica * 10); el.dispatchEvent(new Event("input")); }
  }
  if (typeof sons.volumeTick === "number") {
    localStorage.setItem("r1_volumeTick", sons.volumeTick);
    const el = document.getElementById("volTick");
    if (el) { el.value = Math.round(sons.volumeTick * 10); el.dispatchEvent(new Event("input")); }
  }
  if (typeof sons.musicaSelecionada === "number") {
    const el = document.getElementById("sons");
    if (el) { el.value = sons.musicaSelecionada; el.dispatchEvent(new Event("change")); }
  }
  if (typeof sons.tocarMusicaAoGirar === "boolean") {
    const el = document.getElementById("meucheckmusic");
    if (el) el.checked = sons.tocarMusicaAoGirar;
  }
}

// ─── APLICAR ARENA ───────────────────────────────────────────────────────────
function applyArena(arena) {
  arena = arena || adminGetArena();
  if (!arena) return;
  // As variáveis USER_COOLDOWN etc. são declaradas em scrparena.js — atualiza direto
  if (typeof USER_COOLDOWN !== "undefined"   && arena.userCooldown)   window.USER_COOLDOWN   = arena.userCooldown;
  if (typeof GLOBAL_COOLDOWN !== "undefined" && arena.globalCooldown) window.GLOBAL_COOLDOWN = arena.globalCooldown;
  if (typeof MAX_BONECOS !== "undefined"     && arena.maxBonecos)     window.MAX_BONECOS     = arena.maxBonecos;

  if (arena.posicaoBoneco) {
    const arenaEl = document.getElementById("arena");
    if (arenaEl) {
      if (arena.posicaoBoneco === "frente")     arenaEl.style.zIndex = "999";
      if (arena.posicaoBoneco === "atras")      arenaEl.style.zIndex = "-2";
      if (arena.posicaoBoneco === "desativado") arenaEl.style.zIndex = "-3";
    }
  }
  if (arena.modoImagem     !== undefined && typeof MODO_IMAGEM      !== "undefined") window.MODO_IMAGEM      = arena.modoImagem;
  if (arena.twitchClientId !== undefined && typeof TWITCH_CLIENT_ID !== "undefined") window.TWITCH_CLIENT_ID = arena.twitchClientId;
}

// ─── APLICAR BONECOS ─────────────────────────────────────────────────────────
function applyBonecos(bonecos) {
  // Atualiza a variável BONECOS_REMOTE em scrparena.js
  if (typeof BONECOS_REMOTE !== "undefined" && Array.isArray(bonecos)) {
    window.BONECOS_REMOTE = bonecos.length > 0 ? bonecos : null;
  }
}

// ─── APLICAR IMAGENS (CSS pseudo-elements + img) ─────────────────────────────
function applyImagens(slots) {
  // Se chamado via SSE recebe slots direto; senão busca do backend
  if (slots) {
    _applyImageSlots(slots);
  } else {
    fetch(`${ADMIN_BACKEND_URL}/api/imagens/estaticas`)
      .then(r => r.json())
      .then(res => { if (res.ok) _applyImageSlots(res.data); })
      .catch(() => {});
  }
}

function _applyImageSlots(slots) {
  // ── centro.png → <img class="centro"> + canvas imagemCentro ──────────────
  if (slots.centro) {
    const el = document.querySelector(".centro");
    if (el) el.src = slots.centro;
    if (typeof imagemCentro !== "undefined") {
      imagemCentro.src = slots.centro;
    }
  }

  // ── leoeisa.png → body::before (CSS) — injetamos <style> ─────────────────
  if (slots.leoeisa) {
    _injectStyle("admin-leoeisa",
      `body::before { background: url('${slots.leoeisa}') center/cover no-repeat !important; }`
    );
  }

  // ── back.png → body.painel-oculto::before (CSS) ───────────────────────────
  if (slots.back) {
    _injectStyle("admin-back",
      `body.painel-oculto::before { background-image: url('${slots.back}') !important; }`
    );
  }

  // ── gato1.png → .centrochat (CSS) ─────────────────────────────────────────
  if (slots.gato1) {
    _injectStyle("admin-gato1",
      `.centrochat { background-image: url('${slots.gato1}') !important; }`
    );
  }

  // ── will.png → favicon ────────────────────────────────────────────────────
  if (slots.will) {
    const fav = document.querySelector("link[rel*='icon']");
    if (fav) fav.href = slots.will;
  }
}

// Injeta ou substitui uma tag <style> identificada por id
function _injectStyle(id, css) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
syncAdmin().then(() => {
  document.addEventListener("DOMContentLoaded", () => {
    applyConfig();
    applySons();
    applyArena();
    applyImagens();
    connectSSE();
  });
  // Se DOMContentLoaded já disparou (script sem defer)
  if (document.readyState !== "loading") {
    applyConfig();
    applySons();
    applyArena();
    applyImagens();
    connectSSE();
  }
});

