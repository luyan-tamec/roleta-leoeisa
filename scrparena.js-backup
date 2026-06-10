/* ===== CONFIG IMAGENS ===== */

const BONECOS_PATH = "bonecos/";
const BONECOS_LIST = [
    "image (1).png",
    "image (2).png",
    "image (3).png",
    "image (4).png",
    "image (5).png",
    "image (6).png",
    "image (7).png",
    "image (8).png",
    "image (9).png",
    "image (10).png",
    "image (11).png",
    "image (12).png",
    "image (13).png",
    "image (14).png",
    "image (15).png",
    "image (16).png",
    "image (17).png",
    "image (18).png",
    "image (19).png",
    "image (20).png",
    "image (21).png",
    "image (22).png",
    "image (23).png",
    "image (24).png",
    "image (25).png",
    "image (26).png",
    "image (27).png",
    "image (28).png",
    "image (29).png",
    "image (30).png",
    "image (31).png",
    "image (32).png"
];


const channelName = "isaroza_";

const USER_COOLDOWN = 15000; // 15s por usuário
const GLOBAL_COOLDOWN = 5000; // 5s entre spawns globais
const MAX_BONECOS = 30;

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

    if (message.trim().toLowerCase() === "!entrar") {
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

function spawnBoneco(username) {

    const boneco = document.createElement("div");
    boneco.classList.add("boneco");
    const nome = document.createElement("p");
    nome.classList.add("nome");
    nome.textContent = username

    // Escolhe imagem aleatória
    const randomImg = BONECOS_LIST[
        Math.floor(Math.random() * BONECOS_LIST.length)
    ];

    const img = document.createElement("img");
    img.src = BONECOS_PATH + randomImg;
    img.alt = username;

    boneco.appendChild(img);
    boneco.appendChild(nome)

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