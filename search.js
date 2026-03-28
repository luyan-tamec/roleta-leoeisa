const searchInput = document.getElementById("search")

searchInput.addEventListener("input",(event)=>{
    const value= formatString(event.target.value)  ;
    const items = document.querySelectorAll(".tagNome")

    items.forEach(item => {
        if(formatString(item.textContent).indexOf(value) !== -1) {
            item.style.display= "block"
        } else {
             item.style.display= "none"
        }
        
    })
    
})

function formatString(value) {
    return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}