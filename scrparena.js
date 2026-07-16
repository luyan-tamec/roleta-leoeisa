/* ===== CONFIG IMAGENS ===== */
// Valores padrão — sobrescritos pelo backend se disponível

const BONECOS_PATH = "bonecos/";
let BONECOS_LIST = [
    "image (1).png",  "image (2).png",  "image (3).png",  "image (4).png",
    "image (5).png",  "image (6).png",  "image (7).png",  "image (8).png",
    "image (9).png",  "image (10).png", "image (11).png", "image (12).png",
    "image (13).png", "image (14).png", "image (15).png", "image (16).png",
    "image (17).png", "image (18).png", "image (19).png", "image (20).png",
    "image (21).png", "image (22).png", "image (23).png", "image (24).png",
    "image (25).png", "image (26).png", "image (27).png", "image (28).png",
    "image (29).png", "image (30).png", "image (31).png", "image (32).png"
];
// URLs completas dos bonecos do backend (se disponível)
let BONECOS_REMOTE = null;

const channelName = (typeof adminGetConfig === "function" && adminGetConfig()?.channelName)
    || "isaroza_";

// Lê configs da arena do backend, com fallback nos valores originais
const _arenaAdmin = (typeof adminGetArena === "function") ? adminGetArena() : null;
let USER_COOLDOWN   = _arenaAdmin?.userCooldown   ?? 15000;
let GLOBAL_COOLDOWN = _arenaAdmin?.globalCooldown ?? 5000;
let MAX_BONECOS     = _arenaAdmin?.maxBonecos     ?? 30;

// Posição dos bonecos via backend
if (_arenaAdmin?.posicaoBoneco) {
    const arena = document.getElementById("arena");
    const sel   = document.getElementById("indexboneco");
    if (_arenaAdmin.posicaoBoneco === "frente")     { if (arena) arena.style.zIndex = "999";  if (sel) sel.value = "z-index: 999;"; }
    if (_arenaAdmin.posicaoBoneco === "atras")      { if (arena) arena.style.zIndex = "-2";   if (sel) sel.value = "z-index:-2;"; }
    if (_arenaAdmin.posicaoBoneco === "desativado") { if (arena) arena.style.zIndex = "-3";   if (sel) sel.value = "z-index:-3;"; }
}

// Bonecos remotos — se o backend tiver lista, usa as URLs diretas
const _bonemosAdmin = (typeof adminGetBonecos === "function") ? adminGetBonecos() : null;
if (_bonemosAdmin && _bonemosAdmin.length > 0) {
    BONECOS_REMOTE = _bonemosAdmin; // [{filename, url}, ...]
}

// URL do backend admin (definida no admin-sync.js)
// Usamos window para evitar conflito de redeclaração
if (typeof window.ADMIN_BACKEND_URL === "undefined") {
    window.ADMIN_BACKEND_URL = "https://roleta-admin.onrender.com";
}

// Modo de imagem dos bonecos
let MODO_IMAGEM      = _arenaAdmin?.modoImagem     ?? "boneco"; // "boneco" | "perfil" | "aleatorio"
let TWITCH_CLIENT_ID = _arenaAdmin?.twitchClientId ?? "x4qevszaoxnscv462g6913dzo3m71t";

// Cache de fotos de perfil para não repetir requests
const _perfilCache = new Map();

// URL do backend — lida pelo admin-sync
const _backendUrl = (typeof window.ADMIN_BACKEND_URL !== "undefined")
    ? window.ADMIN_BACKEND_URL
    : "https://roleta-admin.onrender.com";

async function buscarFotoPerfil(username) {
    if (_perfilCache.has(username)) return _perfilCache.get(username);
    try {
        // Usa o proxy do backend — não expõe o Client Secret no frontend
        const res  = await fetch(`${_backendUrl}/api/twitch/perfil?login=${encodeURIComponent(username)}`);
        const json = await res.json();
        const url  = json?.data?.[0]?.profile_image_url || null;
        _perfilCache.set(username, url);
        return url;
    } catch (e) {
        _perfilCache.set(username, null);
        return null;
    }
}

function _imagemBonecoAleatorio() {
    if (BONECOS_REMOTE && BONECOS_REMOTE.length > 0) {
        return BONECOS_REMOTE[Math.floor(Math.random() * BONECOS_REMOTE.length)].url;
    }
    return BONECOS_PATH + BONECOS_LIST[Math.floor(Math.random() * BONECOS_LIST.length)];
}

/* ========================================== */

const arena = document.getElementById("arena");

const activeUsers = new Map();    
const userCooldowns = new Map();  
let lastGlobalSpawn = 0;

/* ================= Z-INDEX DA ARENA OU DIV ================= */
const pos_bonecos = document.getElementById("indexboneco");

pos_bonecos.addEventListener("change", () => {
    arena.style = `${pos_bonecos.value}`
})

/* ================= TMI da conexao ================= */

const client = new tmi.Client({
    connection: { secure: true, reconnect: true },
    channels: [channelName]
});

client.connect();

client.on("message", (channel, tags, message, self) => {
    if (self) return;

    const cmd = (typeof COMANDO_ENTRAR !== "undefined" ? COMANDO_ENTRAR : "!entrar").toLowerCase();
    if (message.trim().toLowerCase() === cmd) {
        handleJoin(tags["display-name"]);
    }
});

/* ============== LÓGICA PRINCIPAL ============== */

function handleJoin(username) {
    const now = Date.now();

    // Anti-spam geralzao
    if (now - lastGlobalSpawn < GLOBAL_COOLDOWN) return;

    // Anti-spam
    if (userCooldowns.has(username)) {
        if (now - userCooldowns.get(username) < USER_COOLDOWN) return;
        
    }

    // Limite de 1 boneco por usuário
    if (activeUsers.has(username)) return;

    // Limite máximo total
    if (activeUsers.size >= MAX_BONECOS) return;

    spawnBoneco(username);

    userCooldowns.set(username, now);
    lastGlobalSpawn = now;
}

/* ============== SPAWNAR ============== */

async function spawnBoneco(username) {

    const boneco = document.createElement("div");
    boneco.classList.add("boneco");
    const nome = document.createElement("p");
    nome.classList.add("nome");
    nome.textContent = username;

    // ── Escolhe imagem conforme o modo configurado ──────────────────────────
    const img = document.createElement("img");
    img.alt = username;

    const usarPerfil = MODO_IMAGEM === "perfil" ||
        (MODO_IMAGEM === "aleatorio" && Math.random() < 0.5);

    if (usarPerfil) {
        // Foto de perfil redonda da Twitch
        img.src = _imagemBonecoAleatorio(); // placeholder enquanto carrega
        img.style.borderRadius = "50%";
        img.style.border = "2px solid #9146ff";
        buscarFotoPerfil(username).then(url => {
            if (url) img.src = url;
            // se não encontrar, mantém o boneco aleatório já carregado
        });
    } else {
        img.src = _imagemBonecoAleatorio();
        img.style.borderRadius = "";
        img.style.border = "";
    }

    boneco.appendChild(img);
    boneco.appendChild(nome);

    boneco.style.left = Math.random() * (window.innerWidth - 80) + "px";
    boneco.style.top = Math.random() * 200 + "px";

    arena.appendChild(boneco);

    const data = {
        element: boneco,
        x: parseFloat(boneco.style.left),
        y: parseFloat(boneco.style.top),
        vx: (Math.random() * 2 + 1) * (Math.random() < 0.5 ? -1 : 1),
        vy: (Math.random() * 2 + 1) * (Math.random() < 0.5 ? -1 : 1)
    };

    activeUsers.set(username, data);
}

/* ============== VAI E VOLTA ============== */

function update() {

    activeUsers.forEach((data, username) => {

        data.x += data.vx;
        data.y += data.vy;

        // colisão lateral
        if (data.x <= 0 || data.x >= window.innerWidth - 80) {
            data.vx *= -1;
        }

        // colisão vertical
        if (data.y <= 0 || data.y >= 270) {
            data.vy *= -1;
        }

        //ALTERAÇÃO DE LADO
        const img = data.element.querySelector("img");

        if (data.vx > 0) {
            img.style.transform = "scaleX(-1)";
        } else {
            img.style.transform = "scaleX(1)";
        }

        data.element.style.left = data.x + "px";
        data.element.style.top = data.y + "px";
    });

    requestAnimationFrame(update);
}
update();