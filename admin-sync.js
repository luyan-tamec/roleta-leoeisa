// admin-sync.js — v5
// Carrega configs do backend e aplica na roleta SEM precisar de F5.
// SSE recebe updates em tempo real quando algo é salvo no painel.
//
// v5:
//  - Atualização ao vivo da arena funciona (usa aplicarArenaConfig() do scrparena.js;
//    antes fazia window.X = ..., que não altera variáveis `let` globais).
//  - Volumes na mesma escala do backend/painel (0–1) → sliders 0–100.
//  - Cada endpoint tem timeout e falha isolada (um erro não derruba os outros).
//  - window.adminReady: promessa que resolve quando a 1ª sincronização termina;
//    o scrparena/code-vote esperam por ela para conectar no canal certo da Twitch.
//  - Reconexão do SSE refaz a sincronização (recupera eventos perdidos enquanto o
//    Render estava dormindo/reiniciando).
//  - Troca do canal da Twitch pelo painel reconecta chat da arena e votação.
//  - adminRegistrarVencedor(): grava o vencedor no histórico do backend.

const ADMIN_BACKEND_URL = "https://roleta-admin.onrender.com"; // ← troque pela URL do Render
const ADMIN_CANAL_PADRAO = "isaroza_";                          // usado até a config chegar do backend
const ADMIN_TIMEOUT_MS = 60000;                                 // Render free pode levar ~50 s para acordar

// ─── FETCH INICIAL ────────────────────────────────────────────────────────────
async function _fetchAdmin(caminho) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ADMIN_TIMEOUT_MS);
  try {
    const res = await fetch(`${ADMIN_BACKEND_URL}${caminho}`, { signal: ctrl.signal });
    return await res.json();
  } catch (e) {
    console.warn(`[admin-sync] ⚠️ ${caminho} indisponível:`, e.message);
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function syncAdmin() {
  const [cfg, arena, sons, imgs, vis, part, playlist, filmes] = await Promise.all([
    _fetchAdmin("/api/config"),
    _fetchAdmin("/api/arena"),
    _fetchAdmin("/api/sons"),
    _fetchAdmin("/api/imagens/bonecos"),
    _fetchAdmin("/api/visual"),
    _fetchAdmin("/api/participantes"),
    _fetchAdmin("/api/musicas"),
    _fetchAdmin("/api/filmes/config"),
  ]);
  const guardar = (chave, res) => {
    if (!res || !res.ok) return false;
    try { sessionStorage.setItem(chave, JSON.stringify(res.data)); } catch (_) {}
    return true;
  };
  const ok = [
    guardar("admin_config",        cfg),
    guardar("admin_arena",         arena),
    guardar("admin_sons",          sons),
    guardar("admin_bonecos",       imgs),
    guardar("admin_visual",        vis),
    guardar("admin_participantes", part),
    guardar("admin_playlist",      playlist),
    guardar("admin_filmes",        filmes),
  ].filter(Boolean).length;
  if (ok) console.log(`[admin-sync] ✅ ${ok}/8 configs carregadas.`);
  else    console.warn("[admin-sync] ⚠️ Backend offline, usando configs locais.");
}

// Promessa que nunca rejeita: resolve quando a 1ª sincronização termina (com ou sem sucesso).
window.adminReady = syncAdmin().catch(e => console.warn("[admin-sync] sync:", e.message));

// ─── SSE ─────────────────────────────────────────────────────────────────────
let _sseCaiu = false;
function connectSSE() {
  const sse = new EventSource(`${ADMIN_BACKEND_URL}/api/events`);

  // Se a conexão tinha caído, refaz a sincronização (eventos enviados nesse meio-tempo foram perdidos).
  sse.onopen = () => {
    if (!_sseCaiu) return;
    _sseCaiu = false;
    console.log("[admin-sync] 🔄 SSE reconectado — ressincronizando.");
    syncAdmin().then(aplicarTudo);
  };

  sse.addEventListener("config",          e => { sessionStorage.setItem("admin_config",        e.data); applyConfig(JSON.parse(e.data)); });
  sse.addEventListener("filmes",          e => { sessionStorage.setItem("admin_filmes",        e.data); });
  sse.addEventListener("sons",            e => { sessionStorage.setItem("admin_sons",          e.data); applySons(JSON.parse(e.data)); });
  sse.addEventListener("arena",           e => { sessionStorage.setItem("admin_arena",         e.data); applyArena(JSON.parse(e.data)); });
  sse.addEventListener("visual",          e => { sessionStorage.setItem("admin_visual",        e.data); applyVisual(JSON.parse(e.data)); });
  sse.addEventListener("imagens",         e => { applyImagens(JSON.parse(e.data)); });
  sse.addEventListener("bonecos",         e => { sessionStorage.setItem("admin_bonecos",       e.data); try { applyBonecos(JSON.parse(e.data)); } catch (err) { console.warn("[admin-sync] applyBonecos:", err.message); } });
  sse.addEventListener("playlist",        e => { sessionStorage.setItem("admin_playlist",      e.data); try { applyPlaylist(JSON.parse(e.data)); } catch (err) { console.warn("[admin-sync] applyPlaylist:", err.message); } });
  sse.addEventListener("participantes",   e => {
    const lista = JSON.parse(e.data);
    sessionStorage.setItem("admin_participantes", e.data);
    if (lista.length === 0) {
      // Limpa direto sem confirm() — zera os arrays globais e chama as funções do script3.js
      if (typeof nomes !== "undefined") {
        nomes.length = 0;
        cores.length = 0;
        // Remove do localStorage usando o mesmo PREFIX do script3.js
        if (typeof PREFIX !== "undefined") {
          localStorage.removeItem(PREFIX + "nomes");
          localStorage.removeItem(PREFIX + "cores");
        }
        if (typeof gerarBuffer     === "function") gerarBuffer();
        if (typeof desenhar        === "function") desenhar();
        if (typeof atualizar       === "function") atualizar();
        if (typeof atualizarCentro === "function") atualizarCentro();
        console.log("[admin-sync] 🗑️ Roleta limpa pelo painel admin.");
      }
    } else {
      applyParticipantes(lista);
    }
  });
  sse.addEventListener("arena_limpar",    () => { limparArena(); });
  sse.addEventListener("reload",          () => { location.reload(); });

  sse.onerror = () => { _sseCaiu = true; sse.close(); setTimeout(connectSSE, 5000); };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function adminGetConfig()        { return JSON.parse(sessionStorage.getItem("admin_config")        || "null"); }
function adminGetArena()         { return JSON.parse(sessionStorage.getItem("admin_arena")         || "null"); }
function adminGetSons()          { return JSON.parse(sessionStorage.getItem("admin_sons")          || "null"); }
function adminGetBonecos()       { return JSON.parse(sessionStorage.getItem("admin_bonecos")       || "null"); }
function adminGetVisual()        { return JSON.parse(sessionStorage.getItem("admin_visual")        || "null"); }
function adminGetParticipantes() { return JSON.parse(sessionStorage.getItem("admin_participantes") || "null"); }
function adminGetPlaylist()      { return JSON.parse(sessionStorage.getItem("admin_playlist")      || "null"); }
function adminGetFilmes()        { return JSON.parse(sessionStorage.getItem("admin_filmes")        || "null"); }

// Canal da Twitch vigente (config do painel → padrão). Usado por arena, votação e chat.
function adminGetCanal() {
  const cfg = adminGetConfig();
  return ((cfg && cfg.channelName) || ADMIN_CANAL_PADRAO).replace(/^#/, "").toLowerCase();
}

// Grava o vencedor no histórico do painel (POST público, limitado por IP no backend).
function adminRegistrarVencedor(nome, item) {
  if (!nome) return;
  fetch(`${ADMIN_BACKEND_URL}/api/historico`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: String(nome), item: item ? String(item) : "" }),
  }).catch(() => { /* backend fora do ar: não bloqueia a roleta */ });
}

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
  // Canal da Twitch alterado no painel → reconecta chat da arena e votação (sem F5)
  if (cfg.channelName) {
    if (typeof mudarCanalTwitch === "function")   mudarCanalTwitch(cfg.channelName);
    if (typeof mudarCanalVotacao === "function")  mudarCanalVotacao(cfg.channelName);
  }
}

// ─── APPLY SONS ───────────────────────────────────────────────────────────────
function applySons(sons) {
  sons = sons || adminGetSons();
  if (!sons) return;
  if (typeof sons.volumeMusica === "number") {
    localStorage.setItem("r1_volumeMusica", sons.volumeMusica);
    const el = document.getElementById("volumeMusica"); // slider 0–100
    if (el) { el.value = Math.round(sons.volumeMusica * 100); el.dispatchEvent(new Event("input")); }
  }
  if (typeof sons.volumeTick === "number") {
    localStorage.setItem("r1_volumeTick", sons.volumeTick);
    const el = document.getElementById("volTick"); // slider 0–100
    if (el) { el.value = Math.round(sons.volumeTick * 100); el.dispatchEvent(new Event("input")); }
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

  // As variáveis da arena são `let` globais do scrparena.js. Atribuir window.X = ... NÃO
  // as altera (cria uma propriedade separada), então o scrparena.js expõe um setter.
  if (typeof aplicarArenaConfig === "function") aplicarArenaConfig(arena);

  if (typeof arena.modoTeste === "boolean") _atualizarModoteste();
}

// ─── APPLY VISUAL ─────────────────────────────────────────────────────────────
function applyVisual(vis) {
  vis = vis || adminGetVisual();
  if (!vis) return;
  const blur   = vis.fundoBlur   ?? 2;
  const brilho = vis.fundoBrilho ?? 0.6;
  _injectStyle("admin-visual-fundo",
    `body::before { filter: blur(${blur}px) brightness(${brilho}) !important; }`
  );
}

// ─── APPLY BONECOS ────────────────────────────────────────────────────────────
function applyBonecos(bonecos) {
  if (typeof definirBonecosRemotos === "function" && Array.isArray(bonecos)) {
    definirBonecosRemotos(bonecos);
  }
}

// ─── APPLY PLAYLIST ───────────────────────────────────────────────────────────
// Acrescenta as músicas enviadas pelo painel (Supabase Storage) no fim da lista
// fixa que já existe em script.js — sem precisar reescrever o player.
// musicas[] e select (#sons) são globais definidos em script.js.
let _playlistAplicada = 0;
function applyPlaylist(playlist) {
  playlist = playlist || adminGetPlaylist();
  if (!playlist || !Array.isArray(playlist)) return;
  if (typeof musicas === "undefined" || typeof select === "undefined") return;

  // Remove as opções da playlist adicionadas anteriormente antes de reaplicar
  // (evita duplicar quando chega um novo evento SSE de playlist).
  if (_playlistAplicada > 0) {
    for (let i = 0; i < _playlistAplicada; i++) {
      const opt = select.querySelector(`option[data-playlist="1"]`);
      if (opt) opt.remove();
    }
  }

  const baseLen = musicas.length - _playlistAplicada;
  musicas.length = baseLen;

  playlist.forEach((track, i) => {
    musicas[baseLen + i] = track.url;
    const opt = document.createElement("option");
    opt.value = baseLen + i;
    opt.dataset.playlist = "1";
    opt.textContent = `🎶 ${track.nome}`;
    select.appendChild(opt);
  });
  _playlistAplicada = playlist.length;
}

// ─── APPLY PARTICIPANTES ──────────────────────────────────────────────────────
// Injeta os nomes importados via CSV direto no array nomes[] da roleta (script3.js)
function applyParticipantes(lista) {
  lista = lista || adminGetParticipantes();

  if (!lista || !lista.length) return;

  // nomes[] e cores[] são globais do script3.js
  if (typeof nomes === "undefined" || typeof cores === "undefined") return;

  const modo = localStorage.getItem("r1_modoCor") ||
               localStorage.getItem("roleta1_modoCor") || "colorido";

  // Adiciona sem duplicatas
  const existentes = new Set(nomes.map(n => n.toLowerCase()));
  let adicionados = 0;
  for (const nm of lista) {
    if (!existentes.has(nm.toLowerCase())) {
      nomes.push(nm);
      if (typeof corAleatoria === "function" && modo === "colorido") {
        cores.push(corAleatoria());
      } else if (typeof paletaNeutra !== "undefined") {
        cores.push(paletaNeutra[Math.floor(Math.random() * paletaNeutra.length)]);
      } else {
        cores.push("#ffffff");
      }
      existentes.add(nm.toLowerCase());
      adicionados++;
    }
  }

  if (adicionados === 0) return;

  // Redesenha a roleta com os novos nomes
  if (typeof salvar        === "function") salvar();
  if (typeof gerarBuffer   === "function") gerarBuffer();
  if (typeof desenhar      === "function") desenhar();
  if (typeof embaralhar    === "function") embaralhar();
  if (typeof atualizarCentro === "function") atualizarCentro();
  if (typeof atualizar     === "function") atualizar();

  console.log(`[admin-sync] ✅ ${adicionados} participante(s) adicionado(s) à roleta.`);
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

// Monta url('...') seguro para CSS (escapa aspas, parênteses, barras e espaços).
function _cssUrl(u) {
  // encodeURIComponent NÃO escapa ' ( ) — por isso o percent-encode manual.
  const pct = c => "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
  return `url("${String(u).replace(/["'()\\\s]/g, pct)}")`;
}

function _applyImageSlots(slots) {
  if (slots.centro) {
    const el = document.querySelector(".centro");
    if (el) el.src = slots.centro;
    if (typeof imagemCentro !== "undefined") imagemCentro.src = slots.centro;
  }
  if (slots.leoeisa) {
    _injectStyle("admin-leoeisa",
      `body::before { background: ${_cssUrl(slots.leoeisa)} center/cover no-repeat !important; }`
    );
  }
  if (slots.back) {
    _injectStyle("admin-back",
      `body.painel-oculto::before { background-image: ${_cssUrl(slots.back)} !important; }`
    );
  }
  if (slots.gato1) {
    _injectStyle("admin-gato1",
      `.centrochat { background-image: ${_cssUrl(slots.gato1)} !important; }`
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
      handleJoin(nome, true);
    }
  }, intervalo);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
// Cada etapa isolada em try/catch: script.js/script3.js podem ainda não ter
// terminado de rodar quando a API responde rápido demais (variáveis como
// `musicas`/`nomes` existem mas ainda não foram inicializadas — TDZ). Sem o
// isolamento, um erro numa etapa derrubava todas as seguintes.
function _seguro(fn, nome) {
  try { fn(); } catch (e) { console.warn(`[admin-sync] ⚠️ Falha em ${nome}, tentando de novo em breve:`, e.message); return false; }
  return true;
}

function aplicarTudo() {
  _seguro(applyConfig, "applyConfig");
  _seguro(applySons, "applySons");
  _seguro(applyArena, "applyArena");
  _seguro(applyVisual, "applyVisual");
  _seguro(applyImagens, "applyImagens");
  _seguro(() => applyBonecos(adminGetBonecos()), "applyBonecos");

  // Playlist e participantes dependem de variáveis (`musicas`, `select`, `nomes`)
  // definidas em script.js/script3.js — damos uma folga e tentamos de novo se
  // ainda não estiverem prontas.
  const tentarPlaylist = () => { if (!_seguro(applyPlaylist, "applyPlaylist")) setTimeout(tentarPlaylist, 500); };
  setTimeout(tentarPlaylist, 300);
  const tentarParticipantes = () => { if (!_seguro(applyParticipantes, "applyParticipantes")) setTimeout(tentarParticipantes, 500); };
  setTimeout(tentarParticipantes, 500);
}

// Aplica só depois do evento `load`: os scripts com `defer` (script.js … scrparena.js)
// já rodaram, então setters e globais existem. Antes, o `apply` podia disparar com o
// documento em "interactive" e antes desses scripts — e a config simplesmente se perdia.
window.adminReady.then(() => {
  const iniciar = () => { aplicarTudo(); connectSSE(); };
  if (document.readyState === "complete") iniciar();
  else window.addEventListener("load", iniciar, { once: true });
});
