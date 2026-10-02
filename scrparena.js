/* ===== CONFIG — sobrescritos pelo admin-sync.js via backend ===== */

const BONECOS_PATH = "bonecos/";
let BONECOS_LIST = [
  "image001.png",
  "image002.png",
  "image003.png",
  "image004.png",
  "image005.png",
  "image006.png",
  "image007.png",
  "image008.png",
  "image009.png",
  "image010.png",
  "image011.png",
  "image012.png",
  "image013.png",
  "image014.png",
  "image015.png",
  "image016.png",
  "image017.png",
  "image018.png",
  "image019.png",
  "image020.png",
  "image021.png",
  "image022.png",
  "image023.png",
  "image024.png",
  "image025.png",
  "image026.png",
  "image027.png",
  "image028.png",
  "image029.png",
  "image030.png",
  "image031.png",
  "image032.png",
  "image033.png",
  "image034.png"
];
let BONECOS_REMOTE = null;

// ── Valores padrão (a config do painel sobrescreve via aplicarArenaConfig) ──
const CANAL_PADRAO = "isaroza_";

// Twitch
let COMANDO_ENTRAR  = "!entrar";

// Cooldowns
let USER_COOLDOWN   = 15000;
let GLOBAL_COOLDOWN = 5000;
let MAX_BONECOS     = 30;

// Visual
let ESCALA_BONECO     = 1.0;
let VEL_MULTIPLICADOR = 1.0;
let TEMPO_VIDA        = 0;        // ms (0 = infinito)
let ANIM_ENTRADA      = "normal";

// Nomes
let NOME_COR_MODO = "aleatorio";
let NOME_COR_FIXA = "#ffffff";
let NOME_PALETA   = [];
let NOME_FONTE    = "Arial";
let NOME_TAMANHO  = 13;

// Modo teste
let MODO_TESTE      = false;
let TESTE_INTERVALO = 3000;

const PALETA_PADRAO = [
    "#ff6b9d","#c084fc","#67e8f9","#86efac","#fde68a",
    "#fb923c","#f87171","#a78bfa","#34d399","#60a5fa",
    "#f472b6","#facc15","#4ade80","#38bdf8","#e879f9",
];

/**
 * Aplica a config da arena vinda do backend (cache do sessionStorage no load e SSE ao vivo).
 * Vive AQUI porque as variáveis acima são `let` globais deste script: o admin-sync.js não
 * consegue alterá-las com `window.X = ...` (isso cria outra propriedade e o código continua
 * enxergando o valor antigo) — por isso ele chama esta função.
 */
function aplicarArenaConfig(a) {
    if (!a) return;
    if (a.comando        != null) COMANDO_ENTRAR    = a.comando;
    if (a.userCooldown   != null) USER_COOLDOWN     = a.userCooldown;
    if (a.globalCooldown != null) GLOBAL_COOLDOWN   = a.globalCooldown;
    if (a.maxBonecos     != null) MAX_BONECOS       = a.maxBonecos;
    if (a.escala         != null) ESCALA_BONECO     = a.escala;
    if (a.velocidade     != null) VEL_MULTIPLICADOR = a.velocidade;
    if (a.tempoVida      != null) TEMPO_VIDA        = a.tempoVida * 1000;
    if (a.animEntrada    != null) ANIM_ENTRADA      = a.animEntrada;
    if (a.nomeCores      != null) NOME_COR_MODO     = a.nomeCores;
    if (a.nomeCorFixa    != null) NOME_COR_FIXA     = a.nomeCorFixa;
    if (a.nomePaleta     != null) NOME_PALETA       = a.nomePaleta;
    if (a.nomeFonte      != null) NOME_FONTE        = a.nomeFonte;
    if (a.nomeTamanho    != null) NOME_TAMANHO      = a.nomeTamanho;
    if (typeof a.modoTeste === "boolean") MODO_TESTE = a.modoTeste;
    if (a.testeIntervalo != null) TESTE_INTERVALO   = a.testeIntervalo * 1000;

    // Posição (z-index) da arena + seletor manual sincronizado
    if (a.posicaoBoneco) {
        const el  = document.getElementById("arena");
        const sel = document.getElementById("indexboneco");
        if (a.posicaoBoneco === "frente")     { if (el) el.style.zIndex = "999"; if (sel) sel.value = "z-index: 999;"; }
        if (a.posicaoBoneco === "atras")      { if (el) el.style.zIndex = "-2";  if (sel) sel.value = "z-index:-2;"; }
        if (a.posicaoBoneco === "desativado") { if (el) el.style.zIndex = "-3";  if (sel) sel.value = "z-index:-3;"; }
    }
}

// Bonecos enviados pelo painel (Supabase Storage). Lista vazia → volta aos bonecos locais.
function definirBonecosRemotos(lista) {
    BONECOS_REMOTE = (Array.isArray(lista) && lista.length > 0) ? lista : null;
}

// Config já em cache (sessionStorage) no momento do load
aplicarArenaConfig((typeof adminGetArena === "function") ? adminGetArena() : null);
definirBonecosRemotos((typeof adminGetBonecos === "function") ? adminGetBonecos() : null);

/* ========================================== */

const arena = document.getElementById("arena");
const activeUsers  = new Map();
const userCooldowns = new Map();
let lastGlobalSpawn = 0;

/* ── Z-INDEX manual ── */
const pos_bonecos = document.getElementById("indexboneco");
pos_bonecos.addEventListener("change", () => { arena.style = `${pos_bonecos.value}`; });

/* ── Twitch TMI ── */
// O canal vem da config do painel. Se ela ainda não chegou (1ª carga da sessão), esperamos
// até 4 s pela sincronização antes de conectar — assim não entramos no canal errado.
// Se o canal mudar depois (painel/SSE), mudarCanalTwitch() reconecta.
let twitchClient = null;
let canalTwitch  = null;

function conectarTwitch(canal) {
    canal = String(canal || "").replace(/^#/, "").toLowerCase();
    if (!canal || canal === canalTwitch) return;

    if (twitchClient) { try { twitchClient.disconnect(); } catch (_) {} }
    canalTwitch = canal;
    twitchClient = new tmi.Client({
        connection: { secure: true, reconnect: true },
        channels: [canal]
    });
    twitchClient.on("message", (channel, tags, message, self) => {
        if (self) return;
        if (message.trim().toLowerCase() === COMANDO_ENTRAR.toLowerCase()) {
            handleJoin(tags["display-name"] || tags.username);
        }
    });
    twitchClient.connect().catch(e => console.warn("[arena] Twitch:", e));
    console.log(`[arena] Conectando ao chat de #${canal}`);
}
function mudarCanalTwitch(canal) { conectarTwitch(canal); }

(function iniciarTwitch() {
    const canalDaConfig = () =>
        (typeof adminGetCanal === "function") ? adminGetCanal() : CANAL_PADRAO;
    const pronto = window.adminReady
        ? Promise.race([window.adminReady, new Promise(r => setTimeout(r, 4000))])
        : Promise.resolve();
    pronto.then(() => conectarTwitch(canalDaConfig()));
})();

/* ── Lógica principal ── */
function handleJoin(username, forcado = false) {
    const now = Date.now();
    if (!forcado) {
        if (now - lastGlobalSpawn < GLOBAL_COOLDOWN) return;
        if (userCooldowns.has(username) && now - userCooldowns.get(username) < USER_COOLDOWN) return;
        if (activeUsers.has(username)) return;
        if (activeUsers.size >= MAX_BONECOS) return;
    }
    spawnBoneco(username);
    userCooldowns.set(username, now);
    lastGlobalSpawn = now;
}

/* ── Spawn ── */
function spawnBoneco(username) {
    const boneco = document.createElement("div");
    boneco.classList.add("boneco");

    // ── Nome ──
    const nome = document.createElement("p");
    nome.classList.add("nome");
    nome.textContent = username;
    nome.style.fontFamily = NOME_FONTE;
    nome.style.fontSize   = NOME_TAMANHO + "px";

    if (NOME_COR_MODO === "aleatorio") {
        const paleta = NOME_PALETA.length > 0 ? NOME_PALETA : PALETA_PADRAO;
        nome.style.color = paleta[Math.floor(Math.random() * paleta.length)];
    } else if (NOME_COR_MODO === "fixo") {
        nome.style.color = NOME_COR_FIXA;
    }

    // ── Imagem ──
    const img = document.createElement("img");
    if (BONECOS_REMOTE && BONECOS_REMOTE.length > 0) {
        img.src = BONECOS_REMOTE[Math.floor(Math.random() * BONECOS_REMOTE.length)].url;
    } else {
        img.src = BONECOS_PATH + BONECOS_LIST[Math.floor(Math.random() * BONECOS_LIST.length)];
    }
    img.alt = username;

    // ── Escala ──
    boneco.style.transform = `scale(${ESCALA_BONECO})`;
    boneco.style.transformOrigin = "bottom center";

    // ── Posição inicial ──
    let startX = Math.random() * (window.innerWidth - 80);
    let startY = Math.random() * 200;

    // ── Animação de entrada ──
    if (ANIM_ENTRADA === "queda") {
        startY = -100;
        boneco.style.transition = "top 0.5s ease-out";
        setTimeout(() => { boneco.style.transition = ""; }, 600);
    } else if (ANIM_ENTRADA === "fade") {
        boneco.style.opacity = "0";
        boneco.style.transition = "opacity 0.5s";
        setTimeout(() => { boneco.style.opacity = "1"; boneco.style.transition = ""; }, 50);
    } else if (ANIM_ENTRADA === "bounce") {
        boneco.style.transform = `scale(0)`;
        boneco.style.transition = "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)";
        setTimeout(() => {
            boneco.style.transform = `scale(${ESCALA_BONECO})`;
            setTimeout(() => { boneco.style.transition = ""; }, 450);
        }, 50);
    }

    boneco.style.left = startX + "px";
    boneco.style.top  = startY + "px";

    boneco.appendChild(img);
    boneco.appendChild(nome);
    arena.appendChild(boneco);

    const vel = (Math.random() * 2 + 1) * VEL_MULTIPLICADOR;
    const data = {
        element: boneco,
        x: startX, y: startY,
        vx: vel * (Math.random() < 0.5 ? -1 : 1),
        vy: vel * (Math.random() < 0.5 ? -1 : 1),
    };
    activeUsers.set(username, data);

    // Tempo de vida
    if (TEMPO_VIDA > 0) {
        setTimeout(() => {
            boneco.style.transition = "opacity 0.5s";
            boneco.style.opacity = "0";
            setTimeout(() => {
                boneco.remove();
                activeUsers.delete(username);
            }, 500);
        }, TEMPO_VIDA);
    }
}

/* ── Loop de movimento ── */
function update() {
    activeUsers.forEach((data, username) => {
        data.x += data.vx;
        data.y += data.vy;

        if (data.x <= 0 || data.x >= window.innerWidth - 80)  data.vx *= -1;
        if (data.y <= 0 || data.y >= 270) data.vy *= -1;

        const img = data.element.querySelector("img");
        if (img) img.style.transform = data.vx > 0 ? "scaleX(-1)" : "scaleX(1)";

        data.element.style.left = data.x + "px";
        data.element.style.top  = data.y + "px";
    });
    requestAnimationFrame(update);
}
update();
