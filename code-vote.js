(function () {

    const CHANNEL = "isaroza_";

    const div = document.getElementById('vote-widget');

    let votes = { sim: 0, nao: 0 };
    let voters = new Set();
    let capturing = false;

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


    const ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");

    ws.onopen = () => {
        ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
        ws.send("PASS SCHMOOPIIE");
        ws.send("NICK justinfan" + Math.floor(Math.random() * 100000));
        ws.send("JOIN #" + CHANNEL);

        console.log("Conectado ao chat");
    };

    ws.onmessage = (event) => {
        const msg = event.data;

        if (msg.includes("PING")) {
            ws.send("PONG :tmi.twitch.tv");
            return;
        }

        if (!capturing) return;

        const match = msg.match(/:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.+)/);
        if (!match) return;

        const username = match[1];
        const text = match[2].toLowerCase().trim();

        if (voters.has(username)) return;


        if (text === "sim" || text === "SIM" || text === "s" || text === "ss" || text === "S" || text === "SS" || text === "Ss") {
            votes.sim++;
            voters.add(username);
        }

        if (text === "nao" || text === "não" || text === "NAO" || text === "n" || text === "nn" || text === "N" || text === "Nn" || text === "NN") {
            votes.nao++;
            voters.add(username);
        }

        updateUI();

    };

})();

const btn_voto = document.getElementById("btn-voto")
const div = document.getElementById('vote-widget');
div.className="sumir"

btn_voto.addEventListener("click", () => {
    if (div.classList == "sumir") {
        div.className = "votos-widget"
    } else if (div.classList == "votos-widget") {
        div.className = "sumir"
    }
})