const searchInput = document.getElementById("search")

// Função reutilizável que aplica o filtro
function aplicarFiltroSearch() {
  const value = formatString(searchInput.value);
  const items = document.querySelectorAll(".tagNome");
  
  items.forEach(item => {
    if (formatString(item.textContent).indexOf(value) !== -1) {
      item.style.display = "block";
    } else {
      item.style.display = "none";
    }
  });
}

// Listener para quando o usuário digita no search
searchInput.addEventListener("input", aplicarFiltroSearch);

// Reaplica o filtro quando a lista é atualizada (ex: ao deletar um nome)
// Monitora mudanças na div #lista
const listaDiv = document.getElementById("lista");
if (listaDiv) {
  const observer = new MutationObserver(() => {
    if (searchInput.value.trim()) {
      setTimeout(aplicarFiltroSearch, 0);
    }
  });
  observer.observe(listaDiv, { childList: true });
}

function formatString(value) {
    return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}