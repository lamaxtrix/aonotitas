let colorActual = "#ffff00";
let resaltados = {};

// Variables para el arrastre
let arrastrando = false;
let offsetX = 0;
let offsetY = 0;

//Helpers
const generarId = () => "res_" + Math.random().toString(36).substr(2, 9);

const guardarResaltados = () => chrome.storage.local.set({ resaltados });

const cargarResaltados = () => {
  chrome.storage.local.get("resaltados", (data) => {
    if (data.resaltados) {
      resaltados = data.resaltados;
      restaurarResaltados();
    }
  });
};

// Función para hacer el panel arrastrable
const hacerArrastrable = (panel) => {
  const header = panel.querySelector('.panel-header');
  
  header.addEventListener('mousedown', (e) => {
    arrastrando = true;
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    header.style.cursor = 'grabbing';
    panel.classList.add('arrastrando');
  });

  document.addEventListener('mousemove', (e) => {
    if (!arrastrando) return;
    
    e.preventDefault();
    
    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;
    
    const panelRect = panel.getBoundingClientRect();
    const maxX = window.innerWidth - panelRect.width;
    const maxY = window.innerHeight - panelRect.height;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    panel.style.left = newX + 'px';
    panel.style.top = newY + 'px';
    panel.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (arrastrando) {
      arrastrando = false;
      header.style.cursor = 'grab';
      panel.classList.remove('arrastrando');
      
      const rect = panel.getBoundingClientRect();
      chrome.storage.local.set({
        panelPosition: {
          x: rect.left,
          y: rect.top
        }
      });
    }
  });
};

// Función para restaurar la posición del panel
const restaurarPosicionPanel = (panel) => {
  chrome.storage.local.get("panelPosition", (data) => {
    if (data.panelPosition) {
      panel.style.left = data.panelPosition.x + 'px';
      panel.style.top = data.panelPosition.y + 'px';
      panel.style.right = 'auto';
    }
  });
};

//Panel flotante
const crearPanelFlotante = () => {
  if (document.getElementById("panel-flotante")) return;

  const panel = document.createElement("div");
  panel.id = "panel-flotante";
  panel.innerHTML = `
    <div class="panel-header">
      <h4>AOnotita</h4>
      <span class="drag-indicator">⋮⋮</span>
    </div>
    <div class="panel-content">
      <label for="selector-color">Color:</label>
      <input type="color" id="selector-color" value="${colorActual}">
      <div class="instrucciones">
        <p><b>Instrucciones:</b></p>
        <ul>
          <li>Selecciona texto y presiona <b>1</b> para resaltar.</li>
          <li>Añade anotación (opcional) en el prompt.</li>
          <li>Selecciona texto resaltado y presiona <b>2</b> para borrar.</li>
        </ul>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  hacerArrastrable(panel);
  restaurarPosicionPanel(panel);

  document.getElementById("selector-color").addEventListener("input", (e) => {
    colorActual = e.target.value;
    chrome.storage.sync.set({ colorActual });
  });
};

//Resaltar
const resaltar = () => {
  const seleccion = window.getSelection();
  if (!seleccion.rangeCount) return;

  const rango = seleccion.getRangeAt(0);
  const texto = seleccion.toString().trim();
  if (!texto) return;

  const span = document.createElement("span");
  span.className = "resaltado";
  span.style.backgroundColor = colorActual;
  const id = generarId();
  span.dataset.id = id;

  const nota = prompt("¿Quieres añadir una anotación? (opcional)") || "";
  if (nota) span.title = nota;

  try {
    rango.surroundContents(span);
  } catch {
    alert("No se pudo resaltar. Selecciona dentro de un mismo párrafo.");
    return;
  }

  seleccion.removeAllRanges();

  resaltados[id] = { id, color: colorActual, nota, texto };
  guardarResaltados();
};

// Borrar
const borrarResaltado = () => {
  const seleccion = window.getSelection();
  if (!seleccion.rangeCount) return;

  const parent = seleccion.getRangeAt(0).commonAncestorContainer.parentNode;

  if (parent.classList?.contains("resaltado")) {
    const id = parent.dataset.id;
    parent.replaceWith(document.createTextNode(parent.textContent));

    if (id) {
      delete resaltados[id];
      guardarResaltados();
    }
  }
};

//Restaurar todos los resaltados
const restaurarResaltados = () => {
  const nodosTexto = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let nodo;
  while ((nodo = walker.nextNode())) nodosTexto.push(nodo);

  Object.values(resaltados).forEach(({ id, color, nota, texto }) => {
    for (const tn of nodosTexto) {
      const idx = tn.textContent.indexOf(texto);
      if (idx !== -1) {
        const rango = document.createRange();
        rango.setStart(tn, idx);
        rango.setEnd(tn, idx + texto.length);

        const span = document.createElement("span");
        span.className = "resaltado";
        span.style.backgroundColor = color;
        span.dataset.id = id;
        if (nota) span.title = nota;

        try { rango.surroundContents(span); } catch {}
        break;
      }
    }
  });
};

//Inicialización
chrome.storage.sync.get("colorActual", (data) => {
  if (data.colorActual) colorActual = data.colorActual;
});

crearPanelFlotante();
cargarResaltados();

//Atajos de teclado
document.addEventListener("keydown", (e) => {
  const tecla = e.key;
  if (tecla === "1") { 
    e.preventDefault(); 
    resaltar(); 
  }
  if (tecla === "2") { 
    e.preventDefault(); 
    borrarResaltado(); 
  }
});
