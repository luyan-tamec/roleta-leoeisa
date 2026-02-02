const toggleBtn = document.getElementById('toggleChat');
const chatBox = document.getElementById('chatBox');

let chatVisivel = false;

toggleBtn.addEventListener('click', () => {
  chatVisivel = !chatVisivel;

  if (chatVisivel) {
    chatBox.style.display = 'block';
    toggleBtn.textContent = 'Escon. Chat';

  } else {
    chatBox.style.display = 'none';
    toggleBtn.textContent = 'Mostrar Chat';
  }
});

const btnOcultar = document.getElementById('btnOcultarPainel');
const btnMostrar = document.getElementById('btnMostrarPainel');


btnOcultar.addEventListener('click', () => {

  document.body.classList.add('painel-oculto');
  btnMostrar.style.display = 'block';


});

btnMostrar.addEventListener('click', () => {
  document.body.classList.remove('painel-oculto');
  btnMostrar.style.display = 'none';

  clearInterval(intervaloId);
  intervaloId = null;
  roleta.style.borderColor = '#f6f0f3ff';
  roleta.style.boxShadow = `0 0 0px #ffffffff`;
  roleta.style.backgroundColor = 'transparent';
  painel.style.boxShadow = `0 0 0px #ffffffff`;
  fundo.style.background = '#000000b8';

});

btninicio = document.getElementById('btnIniciar');
btnparar = document.getElementById('btnParar');


btninicio.addEventListener('click', () => {
  const checkOcultar = document.getElementById('meucheck');
  const nomes = JSON.parse(localStorage.getItem(PREFIX + 'nomes'));

  if (checkOcultar.checked) {
    if (nomes) {
      setTimeout(() => {
        document.body.classList.add('painel-oculto');
        btnMostrar.style.display = 'block';

        const roleta = document.getElementById('roleta');
        const painel = document.getElementById('painel');
        const fundo = document.getElementById('fundo');

        const intervaloId = setInterval(() => {
          const cor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`;
          roleta.style.borderColor = cor;
          localStorage.setItem("interval", intervaloId)

          roleta.style.boxShadow = `0 0 100px ${cor}`;

        }, 500);
      }, 1200);
    }

  }
});