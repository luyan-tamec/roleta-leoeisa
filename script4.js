const toggleBtn = document.getElementById('toggleChat');
const chatBox = document.getElementById('chatBox');
let chatVisivel = false;

toggleBtn.addEventListener('click', () => {
  chatVisivel = !chatVisivel;
  chatBox.style.display = chatVisivel ? 'block' : 'none';
  toggleBtn.textContent = chatVisivel ? 'Escon. Chat' : 'Mostrar Chat';
});

const btnOcultar = document.getElementById('btnOcultarPainel');
const btnMostrar = document.getElementById('btnMostrarPainel');

btnOcultar.addEventListener('click', () => {
  document.body.classList.add('painel-oculto');
  btnMostrar.style.display = 'block';
});

function resetarEstiloRoleta() {
  const roleta = document.getElementById('roleta');
  const painel = document.getElementById('painel');
  const fundo = document.getElementById('fundo');
  roleta.style.borderColor = '#f6f0f3ff';
  roleta.style.boxShadow = '0 0 0px #ffffffff';
  roleta.style.backgroundColor = 'transparent';
  painel.style.boxShadow = '0 0 0px #ffffffff';
  fundo.style.background = '#000000b8';
}

btnMostrar.addEventListener('click', () => {
  document.body.classList.remove('painel-oculto');
  btnMostrar.style.display = 'none';
  resetarEstiloRoleta();
});

let intervaloAnimacaoRoleta = null;

const btninicio = document.getElementById('btnIniciar');
const btnparar = document.getElementById('btnParar');

btninicio.addEventListener('click', () => {
  const checkOcultar = document.getElementById('meucheck');
  const nomesStr = localStorage.getItem(PREFIX + 'nomes');
  if (!nomesStr) return;

  setTimeout(() => {
    if (checkOcultar.checked) {
      document.body.classList.add('painel-oculto');
      btnMostrar.style.display = 'block';
    }
    const roleta = document.getElementById('roleta');
    intervaloAnimacaoRoleta = setInterval(() => {
      const cor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`;
      roleta.style.borderColor = cor;
      roleta.style.boxShadow = `0 0 100px ${cor}`;
    }, 500);
  }, 1200);
});

// Limpa o intervalo quando a roleta para (chamado de script2.js)
function pararAnimacaoRoleta() {
  if (intervaloAnimacaoRoleta) {
    clearInterval(intervaloAnimacaoRoleta);
    intervaloAnimacaoRoleta = null;
  }
  resetarEstiloRoleta();
}

const extra = document.getElementById("extra");
extra.className = "esconder";

document.getElementById("esconder-btn").addEventListener("click", () => {
  extra.className = extra.className === "esconder" ? "extras" : "esconder";
});

const bloco_top = document.getElementById("bloco-top");
bloco_top.className = "esconder";

document.getElementById("esconder-btn-top").addEventListener("click", () => {
  bloco_top.className = bloco_top.className === "esconder" ? "extras" : "esconder";
});

const barraTempo = document.getElementById("span-tempo");
document.getElementById("tempo-msc").addEventListener("mouseenter", () => {
  barraTempo.style.visibility = "visible";
});
document.getElementById("tempo-msc").addEventListener("mouseleave", () => {
  barraTempo.style.visibility = "hidden";
});
