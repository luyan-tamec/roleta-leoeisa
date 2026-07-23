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
  "image027.png"
];
let BONECOS_REMOTE = null;

const _cfg   = (typeof adminGetConfig  === "function") ? adminGetConfig()  : null;
const _arena = (typeof adminGetArena   === "function") ? adminGetArena()   : null;

// Twitch
let COMANDO_ENTRAR  = _arena?.comando        ?? "!entrar";
const channelName   = _cfg?.channelName      ?? "isaroza_";

// Cooldowns
let USER_COOLDOWN   = _arena?.userCooldown   ?? 15000;
let GLOBAL_COOLDOWN = _arena?.globalCooldown ?? 5000;
let MAX_BONECOS     = _arena?.maxBonecos     ?? 30;

// Visual
let ESCALA_BONECO     = _arena?.escala      ?? 1.0;
let VEL_MULTIPLICADOR = _arena?.velocidade  ?? 1.0;
let TEMPO_VIDA        = (_arena?.tempoVida  ?? 0) * 1000; // ms (0 = infinito)
let ANIM_ENTRADA      = _arena?.animEntrada ?? "normal";

// Nomes
let NOME_COR_MODO = _arena?.nomeCores    ?? "aleatorio";
let NOME_COR_FIXA = _arena?.nomeCorFixa  ?? "#ffffff";
let NOME_PALETA   = _arena?.nomePaleta   ?? [];
let NOME_FONTE    = _arena?.nomeFonte    ?? "Arial";
let NOME_TAMANHO  = _arena?.nomeTamanho  ?? 13;

// Modo teste
let MODO_TESTE     = _arena?.modoTeste      ?? false;
let TESTE_INTERVALO= (_arena?.testeIntervalo ?? 3) * 1000;

const PALETA_PADRAO = [
    "#ff6b9d","#c084fc","#67e8f9","#86efac","#fde68a",
    "#fb923c","#f87171","#a78bfa","#34d399","#60a5fa",
    "#f472b6","#facc15","#4ade80","#38bdf8","#e879f9",
];

// Bonecos remotos
const _bonemosAdmin = (typeof adminGetBonecos === "function") ? adminGetBonecos() : null;
if (_bonemosAdmin && _bonemosAdmin.length > 0) BONECOS_REMOTE = _bonemosAdmin;

// Posição via backend
if (_arena?.posicaoBoneco) {
    const el  = document.getElementById("arena");
    const sel = document.getElementById("indexboneco");
    if (_arena.posicaoBoneco === "frente")     { if (el) el.style.zIndex = "999";  if (sel) sel.value = "z-index: 999;"; }
    if (_arena.posicaoBoneco === "atras")      { if (el) el.style.zIndex = "-2";   if (sel) sel.value = "z-index:-2;"; }
    if (_arena.posicaoBoneco === "desativado") { if (el) el.style.zIndex = "-3";   if (sel) sel.value = "z-index:-3;"; }
}

/* ========================================== */

const arena = document.getElementById("arena");
const activeUsers  = new Map();
const userCooldowns = new Map();
let lastGlobalSpawn = 0;

/* ── Z-INDEX manual ── */
const pos_bonecos = document.getElementById("indexboneco");
pos_bonecos.addEventListener("change", () => { arena.style = `${pos_bonecos.value}`; });

/* ── Twitch TMI ── */
const client = new tmi.Client({
    connection: { secure: true, reconnect: true },
    channels: [channelName]
});
client.connect();

client.on("message", (channel, tags, message, self) => {
    if (self) return;
    if (message.trim().toLowerCase() === COMANDO_ENTRAR.toLowerCase()) {
        handleJoin(tags["display-name"]);
    }
});

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
