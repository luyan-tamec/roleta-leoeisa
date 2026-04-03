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

  
    if (nomes) {
      setTimeout(() => {
      if (checkOcultar.checked) {  
        document.body.classList.add('painel-oculto');
        btnMostrar.style.display = 'block';
      }
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
});

const extra = document.getElementById("extra");
extra.className = "esconder"

const esconder_btn = document.getElementById("esconder-btn");


esconder_btn.addEventListener("click", () => {
  if (extra.classList == "esconder") {
    extra.className = "extras"
  } else if (extra.classList == "extras") {
    extra.className = "esconder"
  }
})
const bloco_top = document.getElementById("bloco-top");
bloco_top.className = "esconder"

const esconder_btn_top = document.getElementById("esconder-btn-top");


esconder_btn_top.addEventListener("click", () => {
  if (bloco_top.classList == "esconder") {
    bloco_top.className = "extras"
  } else if (bloco_top.classList == "extras") {
    bloco_top.className = "esconder"
  }
})

const span =document.getElementById("tempo-msc");
const barraTempo= document.getElementById("span-tempo");
span.addEventListener("mouseenter",()=>{
    barraTempo.style.visibility="visible"
})
span.addEventListener("mouseleave",()=>{
    barraTempo.style.visibility="hidden"
})

  