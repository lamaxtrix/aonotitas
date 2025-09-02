let colorActual = "#ffff00";
let resaltados = {};

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

//Panel flotante
const crearPanelFlotante = () => {
  if (document.getElementById("panel-flotante")) return;

  const panel = document.createElement("div");
  panel.id = "panel-flotante";
  panel.innerHTML = `
    <h4>AOnotita</h4>
    <label for="selector-color">Color:</label>
    <input type="color" id="selector-color" value="${colorActual}">
    <div class="instrucciones">
      <p><b>Instrucciones:</b></p>
      <ul>
        <li>Selecciona texto y presiona <b>H</b> para resaltar.</li>
        <li>Añade anotación (opcional) en el prompt.</li>
        <li>Selecciona texto resaltado y presiona <b>D</b> para borrar.</li>
      </ul>
    </div>
  `;
  document.body.appendChild(panel);

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
  const tecla = e.key.toLowerCase();
  if (tecla === "h") { e.preventDefault(); resaltar(); }
  if (tecla === "d") { e.preventDefault(); borrarResaltado(); }
});
