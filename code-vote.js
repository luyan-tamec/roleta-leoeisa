(function () {

    const CANAL_PADRAO = "isaroza_";

    const div = document.getElementById('vote-widget');

    let votes = { sim: 0, nao: 0 };
    let voters = new Set();
    let capturing = false;

    // Aceita variações comuns (o texto é comparado em minúsculas)
    const VOTOS_SIM = new Set(["sim", "s", "ss"]);
    const VOTOS_NAO = new Set(["nao", "não", "n", "nn"]);

    div.innerHTML = `

    <button id="toggleBtn" class="start">▶ INICIAR VOTAÇÃO</button>
    <div class="status" id="status">Parado</div>

    <div class="label">
      <span>👍 SIM</span>
      <span id="simCount">0</span>
    </div>
    <div class="bar sim" id="simBar"></div>

    <div class="label" style="margin-top:10px;">
      <span>👎 NÃO</span>
      <span id="naoCount">0</span>
    </div>
    <div class="bar nao" id="naoBar"></div>
  `;

    const simCount = div.querySelector('#simCount');
    const naoCount = div.querySelector('#naoCount');
    const simBar = div.querySelector('#simBar');
    const naoBar = div.querySelector('#naoBar');
    const toggleBtn = div.querySelector('#toggleBtn');
    const status = div.querySelector('#status');

    function updateUI() {
        const total = votes.sim + votes.nao || 1;

        const simPercent = (votes.sim / total) * 100;
        const naoPercent = (votes.nao / total) * 100;

        simCount.innerText = votes.sim;
        naoCount.innerText = votes.nao;

        simBar.style.width = simPercent + '%';
        naoBar.style.width = naoPercent + '%';
    }

    toggleBtn.onclick = () => {
        capturing = !capturing;

        if (capturing) {
            toggleBtn.innerText = "⏹ PARAR VOTAÇÃO";
            toggleBtn.className = "stop";
            status.innerText = "Capturando votos...";
        } else {
            toggleBtn.innerText = "▶ INICIAR VOTAÇÃO";
            toggleBtn.className = "start";
            status.innerText = "Parado";
            votes = { sim: 0, nao: 0 }
            voters.clear()
            updateUI()
        }
    };

    // ── Conexão com o chat (WebSocket anônimo) ────────────────────────────────
    let ws = null;
    let canal = null;

    function canalDaConfig() {
        return (typeof adminGetCanal === "function") ? adminGetCanal() : CANAL_PADRAO;
    }

    function conectar() {
        ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
        const meuWs = ws;

        meuWs.onopen = () => {
            meuWs.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
            meuWs.send("PASS SCHMOOPIIE");
            meuWs.send("NICK justinfan" + Math.floor(Math.random() * 100000));
            if (canal) meuWs.send("JOIN #" + canal);
            console.log("[votação] Conectado ao chat de #" + canal);
        };

        meuWs.onmessage = (event) => {
            // A Twitch pode agrupar VÁRIAS mensagens no mesmo frame (separadas por \r\n).
            // Antes só a primeira era lida e os votos das demais se perdiam.
            for (const linha of String(event.data).split("\r\n")) {
                if (!linha) continue;

                // PING do servidor (as linhas de chat começam com "@tags" ou ":user", nunca com "PING")
                if (linha.startsWith("PING")) {
                    meuWs.send("PONG :tmi.twitch.tv");
                    continue;
                }

                if (!capturing) continue;

                const match = linha.match(/:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.+)$/);
                if (!match) continue;

                const username = match[1].toLowerCase();
                const text = match[2].toLowerCase().trim();

                if (voters.has(username)) continue;

                if (VOTOS_SIM.has(text)) {
                    votes.sim++;
                    voters.add(username);
                } else if (VOTOS_NAO.has(text)) {
                    votes.nao++;
                    voters.add(username);
                }
            }

            updateUI();
        };

        // Reconecta sozinho se a conexão cair (o `meuWs !== ws` evita reconectar um socket já substituído)
        meuWs.onclose = () => {
            if (meuWs !== ws) return;
            setTimeout(conectar, 5000);
        };
    }

    // Troca de canal pelo painel: sai do antigo e entra no novo, mantendo a conexão
    window.mudarCanalVotacao = function (novoCanal) {
        novoCanal = String(novoCanal || "").replace(/^#/, "").toLowerCase();
        if (!novoCanal || novoCanal === canal) return;
        const anterior = canal;
        canal = novoCanal;
        voters.clear();
        if (ws && ws.readyState === WebSocket.OPEN) {
            if (anterior) ws.send("PART #" + anterior);
            ws.send("JOIN #" + canal);
            console.log("[votação] Canal alterado para #" + canal);
        }
    };

    // Espera até 4 s pela config do painel (canal correto) antes da 1ª conexão
    const pronto = window.adminReady
        ? Promise.race([window.adminReady, new Promise(r => setTimeout(r, 4000))])
        : Promise.resolve();
    pronto.then(() => { canal = canalDaConfig(); conectar(); });

})();

(function () {
    const btn_voto = document.getElementById("btn-voto");
    const div = document.getElementById('vote-widget');
    div.className = "sumir";

    btn_voto.addEventListener("click", () => {
        div.className = div.classList.contains("sumir") ? "votos-widget" : "sumir";
    });
})();
