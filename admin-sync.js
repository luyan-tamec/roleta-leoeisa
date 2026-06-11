// admin-sync.js — v3
// Carrega configs do backend e aplica na roleta SEM precisar de F5.
// SSE recebe updates em tempo real quando algo é salvo no painel.

const ADMIN_BACKEND_URL = "https://roleta-admin.onrender.com"; // ← troque pela URL do Render

// ─── FETCH INICIAL ────────────────────────────────────────────────────────────
async function syncAdmin() {
  try {
    const [cfgRes, arenaRes, sonsRes, imgRes, visRes] = await Promise.all([
      fetch(`${ADMIN_BACKEND_URL}/api/config`),
      fetch(`${ADMIN_BACKEND_URL}/api/arena`),
      fetch(`${ADMIN_BACKEND_URL}/api/sons`),
      fetch(`${ADMIN_BACKEND_URL}/api/imagens/bonecos`),
      fetch(`${ADMIN_BACKEND_URL}/api/visual`),
    ]);
    const [cfg, arena, sons, imgs, vis] = await Promise.all([
      cfgRes.json(), arenaRes.json(), sonsRes.json(), imgRes.json(), visRes.json(),
    ]);
    if (cfg.ok)   sessionStorage.setItem("admin_config",  JSON.stringify(cfg.data));
    if (arena.ok) sessionStorage.setItem("admin_arena",   JSON.stringify(arena.data));
    if (sons.ok)  sessionStorage.setItem("admin_sons",    JSON.stringify(sons.data));
    if (imgs.ok)  sessionStorage.setItem("admin_bonecos", JSON.stringify(imgs.data));
    if (vis.ok)   sessionStorage.setItem("admin_visual",  JSON.stringify(vis.data));
    console.log("[admin-sync] ✅ Configs carregadas.");
  } catch (e) {
    console.warn("[admin-sync] ⚠️ Backend offline, usando configs locais.", e.message);
  }
}

// ─── SSE ─────────────────────────────────────────────────────────────────────
function connectSSE() {
  const sse = new EventSource(`${ADMIN_BACKEND_URL}/api/events`);

  sse.addEventListener("config",       e => { sessionStorage.setItem("admin_config",  e.data); applyConfig(JSON.parse(e.data)); });
  sse.addEventListener("sons",         e => { sessionStorage.setItem("admin_sons",    e.data); applySons(JSON.parse(e.data)); });
  sse.addEventListener("arena",        e => { sessionStorage.setItem("admin_arena",   e.data); applyArena(JSON.parse(e.data)); });
  sse.addEventListener("visual",       e => { sessionStorage.setItem("admin_visual",  e.data); applyVisual(JSON.parse(e.data)); });
  sse.addEventListener("imagens",      e => { applyImagens(JSON.parse(e.data)); });
  sse.addEventListener("bonecos",      e => { sessionStorage.setItem("admin_bonecos", e.data); applyBonecos(JSON.parse(e.data)); });
  sse.addEventListener("arena_limpar", () => { limparArena(); });

  sse.onerror = () => { sse.close(); setTimeout(connectSSE, 5000); };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function adminGetConfig()  { return JSON.parse(sessionStorage.getItem("admin_config")  || "null"); }
function adminGetArena()   { return JSON.parse(sessionStorage.getItem("admin_arena")   || "null"); }
function adminGetSons()    { return JSON.parse(sessionStorage.getItem("admin_sons")    || "null"); }
function adminGetBonecos() { return JSON.parse(sessionStorage.getItem("admin_bonecos") || "null"); }
function adminGetVisual()  { return JSON.parse(sessionStorage.getItem("admin_visual")  || "null"); }

// ─── APPLY CONFIG ─────────────────────────────────────────────────────────────
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
  }
}

// ─── APPLY SONS ───────────────────────────────────────────────────────────────
function applySons(sons) {
  sons = sons || adminGetSons();
  if (!sons) return;
  if (typeof sons.volumeMusica === "number") {
    localStorage.setItem("r1_volumeMusica", sons.volumeMusica);
    const el = document.getElementById("volumeMusica");
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

// ─── APPLY ARENA ──────────────────────────────────────────────────────────────
function applyArena(arena) {
  arena = arena || adminGetArena();
  if (!arena) return;

  // Cooldowns / limites
  if (arena.userCooldown   != null && typeof USER_COOLDOWN   !== "undefined") window.USER_COOLDOWN   = arena.userCooldown;
  if (arena.globalCooldown != null && typeof GLOBAL_COOLDOWN !== "undefined") window.GLOBAL_COOLDOWN = arena.globalCooldown;
  if (arena.maxBonecos     != null && typeof MAX_BONECOS     !== "undefined") window.MAX_BONECOS     = arena.maxBonecos;

  // Comando
  if (arena.comando != null && typeof COMANDO_ENTRAR !== "undefined") window.COMANDO_ENTRAR = arena.comando;

  // Posição
  if (arena.posicaoBoneco) {
    const el = document.getElementById("arena");
    if (el) {
      if (arena.posicaoBoneco === "frente")     el.style.zIndex = "999";
      if (arena.posicaoBoneco === "atras")      el.style.zIndex = "-2";
      if (arena.posicaoBoneco === "desativado") el.style.zIndex = "-3";
    }
  }

  // Visual dos bonecos
  if (arena.escala     != null && typeof ESCALA_BONECO    !== "undefined") window.ESCALA_BONECO    = arena.escala;
  if (arena.velocidade != null && typeof VEL_MULTIPLICADOR !== "undefined") window.VEL_MULTIPLICADOR = arena.velocidade;
  if (arena.tempoVida  != null && typeof TEMPO_VIDA       !== "undefined") window.TEMPO_VIDA       = arena.tempoVida * 1000;
  if (arena.animEntrada != null && typeof ANIM_ENTRADA    !== "undefined") window.ANIM_ENTRADA     = arena.animEntrada;

  // Nomes
  if (arena.nomeCores   != null && typeof NOME_COR_MODO !== "undefined") window.NOME_COR_MODO = arena.nomeCores;
  if (arena.nomeCorFixa != null && typeof NOME_COR_FIXA !== "undefined") window.NOME_COR_FIXA = arena.nomeCorFixa;
  if (arena.nomePaleta  != null && typeof NOME_PALETA   !== "undefined") window.NOME_PALETA   = arena.nomePaleta;
  if (arena.nomeFonte   != null && typeof NOME_FONTE    !== "undefined") window.NOME_FONTE    = arena.nomeFonte;
  if (arena.nomeTamanho != null && typeof NOME_TAMANHO  !== "undefined") window.NOME_TAMANHO  = arena.nomeTamanho;

  // Modo teste
  if (typeof arena.modoTeste === "boolean" && typeof MODO_TESTE !== "undefined") {
    window.MODO_TESTE = arena.modoTeste;
    if (arena.testeIntervalo != null && typeof TESTE_INTERVALO !== "undefined")
      window.TESTE_INTERVALO = arena.testeIntervalo * 1000;
    _atualizarModoteste();
  }
}

// ─── APPLY VISUAL (fundo) ─────────────────────────────────────────────────────
function applyVisual(vis) {
  vis = vis || adminGetVisual();
  if (!vis) return;
  const blur    = vis.fundoBlur    ?? 2;
  const brilho  = vis.fundoBrilho  ?? 0.6;
  _injectStyle("admin-visual-fundo",
    `body::before { filter: blur(${blur}px) brightness(${brilho}) !important; }`
  );
}

// ─── APPLY BONECOS ────────────────────────────────────────────────────────────
function applyBonecos(bonecos) {
  if (typeof BONECOS_REMOTE !== "undefined" && Array.isArray(bonecos)) {
    window.BONECOS_REMOTE = bonecos.length > 0 ? bonecos : null;
  }
}

// ─── LIMPAR ARENA ─────────────────────────────────────────────────────────────
function limparArena() {
  const el = document.getElementById("arena");
  if (el) el.innerHTML = "";
  if (typeof activeUsers !== "undefined") activeUsers.clear();
}

// ─── APPLY IMAGENS ────────────────────────────────────────────────────────────
function applyImagens(slots) {
  if (slots) { _applyImageSlots(slots); }
  else {
    fetch(`${ADMIN_BACKEND_URL}/api/imagens/estaticas`)
      .then(r => r.json()).then(res => { if (res.ok) _applyImageSlots(res.data); })
      .catch(() => {});
  }
}

function _applyImageSlots(slots) {
  if (slots.centro) {
    const el = document.querySelector(".centro");
    if (el) el.src = slots.centro;
    if (typeof imagemCentro !== "undefined") imagemCentro.src = slots.centro;
  }
  if (slots.leoeisa) {
    _injectStyle("admin-leoeisa",
      `body::before { background: url('${slots.leoeisa}') center/cover no-repeat !important; }`
    );
  }
  if (slots.back) {
    _injectStyle("admin-back",
      `body.painel-oculto::before { background-image: url('${slots.back}') !important; }`
    );
  }
  if (slots.gato1) {
    _injectStyle("admin-gato1",
      `.centrochat { background-image: url('${slots.gato1}') !important; }`
    );
  }
  if (slots.will) {
    const fav = document.querySelector("link[rel*='icon']");
    if (fav) fav.href = slots.will;
  }
}

function _injectStyle(id, css) {
  let el = document.getElementById(id);
  if (!el) { el = document.createElement("style"); el.id = id; document.head.appendChild(el); }
  el.textContent = css;
}

// ─── MODO TESTE ───────────────────────────────────────────────────────────────
let _testeTimer = null;
const NOMES_TESTE = ["StreamerPro","GamerXPT","NinjaFan","CavaloJr","Bobesponja",
  "TwitchKing","Luyan","isaroza_","RadarFPS","MaestroGG"];

function _atualizarModoteste() {
  clearInterval(_testeTimer);
  if (typeof MODO_TESTE === "undefined" || !MODO_TESTE) return;
  const intervalo = (typeof TESTE_INTERVALO !== "undefined" ? TESTE_INTERVALO : 3000);
  _testeTimer = setInterval(() => {
    if (typeof handleJoin === "function") {
      const nome = NOMES_TESTE[Math.floor(Math.random() * NOMES_TESTE.length)] + "_" + Math.floor(Math.random()*99);
      handleJoin(nome, true); // true = forçado (ignora cooldowns)
    }
  }, intervalo);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
syncAdmin().then(() => {
  const apply = () => {
    applyConfig();
    applySons();
    applyArena();
    applyVisual();
    applyImagens();
    connectSSE();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();
});
