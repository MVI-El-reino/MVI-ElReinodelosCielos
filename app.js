// ==========================================
// 1. VARIABLES GLOBALES Y EXPORTACIONES
// ==========================================
let inventarioCanciones = [];
let listaDominical = [];
let cancionActualId = null; 
let cancionActualDia = null; 
let viendoListaDominical = false;
let pasosActuales = 0; 
let letraActual = "";

// Al usar módulos, necesitamos exponer estas funciones para el HTML
window.abrirDiccionario = abrirDiccionario;
window.cerrarDiccionario = cerrarDiccionario;

// ==========================================
// 2. INICIALIZACIÓN Y CONEXIÓN A FIREBASE (REALTIME DATABASE)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBYrKSwxlndFu-1KI6MV3z4WwCnqPiLm6k",
  authDomain: "alabanzas-mvi.firebaseapp.com",
  databaseURL: "https://alabanzas-mvi-default-rtdb.firebaseio.com",
  projectId: "alabanzas-mvi",
  storageBucket: "alabanzas-mvi.firebasestorage.app",
  messagingSenderId: "36436624706",
  appId: "1:36436624706:web:3a56a5bbdec6d78cec34db"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
window.dbInstance = db;

document.addEventListener('DOMContentLoaded', async () => {
    await cargarCancionesDesdeFirebase();
});

async function cargarCancionesDesdeFirebase() {
    try {
        const dbRef = ref(db); // Apuntamos a la raíz de tu base de datos
        const snapshot = await get(dbRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Lógica de limpieza (Firebase a veces añade un 'null' si los IDs empiezan en 1)
            let cancionesArray = [];
            if (Array.isArray(data)) {
                cancionesArray = data;
            } else if (data.canciones && Array.isArray(data.canciones)) {
                cancionesArray = data.canciones;
            } else {
                cancionesArray = Object.values(data);
            }

            // Filtramos elementos vacíos y ordenamos por ID numérico
            inventarioCanciones = cancionesArray
                .filter(c => c && c.id)
                .sort((a, b) => a.id - b.id);
            
            mostrarLista(inventarioCanciones);
            console.log("¡Conexión exitosa! Canciones descargadas de la nube:", inventarioCanciones.length);
        } else {
            document.getElementById('contenedor-lista').innerHTML = "<li>No se encontraron datos en la nube.</li>";
        }
    } catch (error) {
        console.error("Error al conectar con Firebase:", error);
        document.getElementById('contenedor-lista').innerHTML = "<li>Error de conexión. Revisa la consola.</li>";
    }
}
// ==========================================
// 3. MOTOR MATEMÁTICO DE TRANSPOSICIÓN MUSICAL
// ==========================================
function transponerNota(nota, pasos) {
    const escala = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const equivalencias = {'Db':'C#', 'Eb':'D#', 'Gb':'F#', 'Ab':'G#', 'Bb':'A#'};
    let notaNormalizada = equivalencias[nota] || nota;
    let indice = escala.indexOf(notaNormalizada);
    if (indice === -1) return nota; 
    let nuevoIndice = (indice + pasos) % 12;
    if (nuevoIndice < 0) nuevoIndice += 12;
    return escala[nuevoIndice];
}

function transponerAcordeStr(acordeCrudo, pasos) {
    if (pasos === 0) return acordeCrudo;
    const regexNota = /([A-G][#b]?)/g;
    return acordeCrudo.replace(regexNota, (match) => transponerNota(match, pasos));
}

function transponerLetraCruda(letraCruda, pasos) {
    if (pasos === 0) return letraCruda;
    const regexCorchetes = /\[([^\]]+)\]/g;
    return letraCruda.replace(regexCorchetes, (match, acorde) => {
        return `[${transponerAcordeStr(acorde, pasos)}]`;
    });
}
// ==========================================
// 4. MOTOR DE FORMATO VISUAL (ACORDES SOBRE LETRA)
// ==========================================
function procesarLetraYAcordes(letraCruda) {
    // 1. Dividimos la canción en bloques completos (estrofas) usando los dobles saltos de línea
    const estrofas = letraCruda.split(/\n\s*\n/);

    return estrofas.map(estrofa => {
        // 2. Envolvemos toda la estrofa en un contenedor indestructible
        let htmlEstrofa = '<div class="estrofa-musical">';

        estrofa.split('\n').forEach(linea => {
            const lineaLimpia = linea.trim();
            if (lineaLimpia === "") return;

            if (/^\[[^\[\]]+\]$/.test(lineaLimpia)) {
                htmlEstrofa += `<span class="marcador-seccion">${lineaLimpia}</span>`;
                return;
            }

            if (linea.includes('[')) {
                let acHTML = '', letHTML = '', cA = 0, cL = 0;
                linea.split('[').forEach((p, i) => {
                    if (i === 0) { 
                        letHTML += p; 
                        cL += p.length; 
                    } else {
                        let [ac, des] = p.split(']');
                        
                        // 1. Imprimimos el acorde
                        acHTML += ' '.repeat(Math.max(0, cL - cA)) + `<span class="acorde-formateado">${ac}</span>`;
                        cA += Math.max(0, cL - cA) + ac.length;
                        
                        // 2. RESCATE DE GUIONES Y ESPACIOS
                        let matchSeparador = (des || "").match(/^([-\s]+)(.*)/);
                        
                        if (matchSeparador) {
                            let sep = matchSeparador[1];  // El guion o espacio
                            let resto = matchSeparador[2]; // El resto de la letra
                            
                            // Subimos el guion a la línea de los acordes
                            acHTML += sep; 
                            cA += sep.length;
                            
                            // Rellenamos la línea de abajo con espacios
                            if (cA > cL) { letHTML += ' '.repeat(cA - cL); cL = cA; }
                            
                            letHTML += resto;
                            cL += resto.length;
                        } else {
                            // Si no hay guiones, ponemos el texto normal
                            if (cA > cL) { letHTML += ' '.repeat(cA - cL); cL = cA; }
                            letHTML += (des || "");
                            cL += (des || "").length;
                        }
                    }
                });
                htmlEstrofa += `<div class="bloque-linea"><pre class="linea-acordes">${acHTML}</pre><pre class="linea-letras">${letHTML}</pre></div>`;
            } else {
                htmlEstrofa += `<div class="bloque-linea"><pre class="linea-letras">${linea}</pre></div>`;
            }
        });

        htmlEstrofa += '</div>';
        return htmlEstrofa;
    }).join('');
}

//AJUSTAR LETRA//
function ajustarEscalaLetra() {
    const contenedor = document.getElementById('letra-cancion');
    const visor = document.getElementById('visor-cancion');
    
    // Reseteamos escala para medir el ancho real sin restricciones
    contenedor.style.transform = 'scale(1)';
    
    const anchoContenedor = visor.clientWidth - 60; // 60px de margen (padding)
    const anchoLetra = contenedor.scrollWidth;
    
    if (anchoLetra > anchoContenedor) {
        // Calculamos la proporción necesaria para que quepa
        const escala = anchoContenedor / anchoLetra;
        contenedor.style.transform = `scale(${escala})`;
        contenedor.style.width = `${100 / escala}%`; // Compensamos el ancho para que no deje espacio vacío
    } else {
        contenedor.style.transform = 'scale(1)';
        contenedor.style.width = '100%';
    }
}

// ==========================================
// 5. RENDERIZADO DE LA INTERFAZ Y ORDENAMIENTO
// ==========================================
function obtenerCancionActual() {
    return viendoListaDominical 
        ? listaDominical.find(c => c.id === cancionActualId && c.dia === cancionActualDia) 
        : inventarioCanciones.find(c => c.id === cancionActualId);
}

// NUEVA FUNCIÓN: Permite mover las canciones arriba o abajo en su respectivo día
function moverCancionLista(id, dia, direccion) {
    const indicesDia = [];
    listaDominical.forEach((c, index) => {
        if (c.dia === dia) indicesDia.push(index);
    });

    const posicionEnGrupo = indicesDia.findIndex(indexLista => listaDominical[indexLista].id === id);

    if (direccion === -1 && posicionEnGrupo > 0) { 
        // Mover hacia arriba
        const indexActual = indicesDia[posicionEnGrupo];
        const indexAnterior = indicesDia[posicionEnGrupo - 1];
        const temp = listaDominical[indexActual];
        listaDominical[indexActual] = listaDominical[indexAnterior];
        listaDominical[indexAnterior] = temp;
        mostrarLista(listaDominical, true);
    } else if (direccion === 1 && posicionEnGrupo < indicesDia.length - 1) { 
        // Mover hacia abajo
        const indexActual = indicesDia[posicionEnGrupo];
        const indexSiguiente = indicesDia[posicionEnGrupo + 1];
        const temp = listaDominical[indexActual];
        listaDominical[indexActual] = listaDominical[indexSiguiente];
        listaDominical[indexSiguiente] = temp;
        mostrarLista(listaDominical, true);
    }
}

function mostrarLista(canciones, esListaDominical = false) {
    const contenedor = document.getElementById('contenedor-lista');
    contenedor.innerHTML = ''; 

    if (canciones.length === 0) {
        contenedor.innerHTML = esListaDominical ? '<li style="color:gray; text-align:center;">Tu lista está vacía.</li>' : '<li>No se encontraron alabanzas.</li>';
        return;
    }

    if (esListaDominical) {
        const diasOrden = ["Miércoles", "Viernes", "Domingo"];
        
        diasOrden.forEach(dia => {
            const cancionesDelDia = canciones.filter(c => c.dia === dia);
            
            if (cancionesDelDia.length > 0) {
                const headerDia = document.createElement('div');
                headerDia.className = 'header-dia-lista';
                headerDia.textContent = `Culto de ${dia}`;
                contenedor.appendChild(headerDia);

                cancionesDelDia.forEach((cancion, index) => {
                    const li = document.createElement('li');
                    li.dataset.id = cancion.id; 
                    
                    li.style.display = 'flex';
                    li.style.alignItems = 'center';
                    li.style.justifyContent = 'space-between';
                    li.style.gap = '10px';

                    // Título de la canción
                    const spanTitulo = document.createElement('span');
                    spanTitulo.textContent = cancion.titulo;
                    spanTitulo.style.flex = '1';
                    spanTitulo.style.cursor = 'pointer';
                    spanTitulo.style.overflow = 'hidden';
                    spanTitulo.style.textOverflow = 'ellipsis';
                    spanTitulo.style.whiteSpace = 'nowrap';
                    
                    spanTitulo.addEventListener('click', () => {
                        mostrarCancion(cancion.id, cancion.dia);
                    });

                    // Agrupador de todos los controles derechos
                    const divControles = document.createElement('div');
                    divControles.className = 'controles-item-lista';

                    // Botón Subir (▲)
                    const btnSubir = document.createElement('button');
                    btnSubir.innerHTML = '▲';
                    btnSubir.className = 'btn-ordenar';
                    if (index === 0) btnSubir.style.visibility = 'hidden'; // Ocultar si es el primero
                    btnSubir.addEventListener('click', (e) => {
                        e.stopPropagation();
                        moverCancionLista(cancion.id, cancion.dia, -1);
                    });

                    // Botón Bajar (▼)
                    const btnBajar = document.createElement('button');
                    btnBajar.innerHTML = '▼';
                    btnBajar.className = 'btn-ordenar';
                    if (index === cancionesDelDia.length - 1) btnBajar.style.visibility = 'hidden'; // Ocultar si es el último
                    btnBajar.addEventListener('click', (e) => {
                        e.stopPropagation();
                        moverCancionLista(cancion.id, cancion.dia, 1);
                    });

                    // Mini-Selector de Días
                    const selectDia = document.createElement('select');
                    selectDia.className = 'select-dia-lista';
                    
                    const opciones = [
                        { valor: "Miércoles", texto: "Mié" },
                        { valor: "Viernes", texto: "Vie" },
                        { valor: "Domingo", texto: "Dom" }
                    ];
                    
                    opciones.forEach(opt => {
                        const optionElement = document.createElement('option');
                        optionElement.value = opt.valor;
                        optionElement.textContent = opt.texto;
                        if (opt.valor === cancion.dia) optionElement.selected = true;
                        selectDia.appendChild(optionElement);
                    });

                    selectDia.addEventListener('change', (e) => {
                        cancion.dia = e.target.value;
                        mostrarLista(listaDominical, true);
                    });

                    // Botón de eliminar (✖)
                    const btnEliminar = document.createElement('button');
                    btnEliminar.textContent = "✖";
                    btnEliminar.className = "btn-eliminar";
                    
                    btnEliminar.addEventListener('click', (e) => {
                        e.stopPropagation();
                        listaDominical = listaDominical.filter(c => !(c.id === cancion.id && c.dia === cancion.dia));
                        mostrarLista(listaDominical, true); 
                        document.getElementById('btn-ver-lista').textContent = `Volver al Repertorio (${listaDominical.length})`;
                        
                        if (listaDominical.length === 0) {
                            document.getElementById('btn-exportar-pdf').style.display = 'none';
                        }
                        if(cancionActualId === cancion.id && cancionActualDia === cancion.dia) {
                            limpaVisorDerecho();
                        }
                    });

                    // Ensamblaje
                    divControles.appendChild(btnSubir);
                    divControles.appendChild(btnBajar);
                    divControles.appendChild(selectDia);
                    divControles.appendChild(btnEliminar);

                    li.appendChild(spanTitulo);
                    li.appendChild(divControles);

                    contenedor.appendChild(li);
                });
            }
        });
    } else {
        canciones.forEach(cancion => {
            const li = document.createElement('li');
            li.textContent = cancion.titulo;
            li.style.cursor = 'pointer';
            li.dataset.id = cancion.id; 

            li.addEventListener('click', () => {
                mostrarCancion(cancion.id, null);
            });

            contenedor.appendChild(li);
        });
    }
}

    
function renderizarVisorDerecho() {
    const cancion = obtenerCancionActual();
    if (!cancion) return;

    let tonoMostrado = transponerAcordeStr(cancion.tono_original, pasosActuales);
    let letraTranspuesta = transponerLetraCruda(cancion.letra, pasosActuales);

    document.getElementById('titulo-cancion').textContent = cancion.titulo;
    document.getElementById('controles-tono').style.display = 'flex';
    document.getElementById('tono-actual').innerHTML = `Tono: <span style="color:#E67E22;">${tonoMostrado}</span>`;
    
    // 🚨 SEGURIDAD: Buscamos el elemento primero
    const contenedorLetra = document.getElementById('letra-cancion');
    
    if (contenedorLetra) {
        // Solo si el elemento existe, intentamos manipularlo
        let lineasVisuales = 0;
        letraTranspuesta.split('\n').forEach(l => {
            const linea = l.trim();
            if (linea === "") lineasVisuales += 1; 
            else if (/^\[[^\[\]]+\]$/.test(linea)) lineasVisuales += 1.5; 
            else if (linea.includes('[')) lineasVisuales += 2; 
            else lineasVisuales += 1; 
        });
        
        if (lineasVisuales > 32) {
            contenedorLetra.classList.add('letra-doble-columna');
        } else {
            contenedorLetra.classList.remove('letra-doble-columna');
        }
        
        // 🚨 AGREGAMOS LA CLASE PARA EL ESCALADO QUE QUERÍAS
        contenedorLetra.classList.add('letra-escalable');
        
        contenedorLetra.innerHTML = procesarLetraYAcordes(letraTranspuesta);
        letraActual = letraTranspuesta;
        
        // Ejecutamos el ajuste de escala
        setTimeout(ajustarEscalaLetra, 10);
    } else {
        console.error("No se encontró el elemento con id 'letra-cancion'");
    }
}

// También lo activamos si el usuario rota el celular (cambia el ancho de pantalla)
window.addEventListener('resize', ajustarEscalaLetra);

function mostrarCancion(id, dia = null) {
    cancionActualId = id; 
    cancionActualDia = dia;
    pasosActuales = 0; 
    renderizarVisorDerecho();
}

function limpaVisorDerecho() {
    cancionActualId = null;
    cancionActualDia = null;
    document.getElementById('titulo-cancion').textContent = 'Selecciona una alabanza';
    document.getElementById('controles-tono').style.display = 'none';
    document.getElementById('letra-cancion').innerHTML = '';
}

// ==========================================
// 6. EVENTOS DE BOTONES E INTERACTIVIDAD
// ==========================================

// Función auxiliar para quitar acentos y convertir a minúsculas
function limpiarTexto(texto) {
    if (!texto) return "";
    return texto
        .normalize("NFD") // Separa las letras de sus acentos
        .replace(/[\u0300-\u036f]/g, "") // Borra los acentos invisibles
        .toLowerCase();
}

// Buscador Inteligente (Busca en título y letra, ignorando acentos y acordes)
document.getElementById('buscador').addEventListener('input', (evento) => {
    
    // 1. AUTO-RETORNO: Si busca algo mientras ve la Lista Dominical, 
    // lo regresamos automáticamente al repertorio general para que no se "trabe".
    if (viendoListaDominical) {
        viendoListaDominical = false;
        const btnVerLista = document.getElementById('btn-ver-lista');
        btnVerLista.textContent = `Ver mis listas (${listaDominical.length})`;
        btnVerLista.style.backgroundColor = "var(--dorado)";
        document.querySelector('#lista-canciones h2').textContent = "Repertorio Disponible";
        
        const btnExportarPDF = document.getElementById('btn-exportar-pdf');
        if (btnExportarPDF) btnExportarPDF.style.display = 'none';
    }

    const textoBusqueda = limpiarTexto(evento.target.value);
    
    const filtradas = inventarioCanciones.filter(cancion => {
        // 2. ESCUDO PROTECTOR: Añadimos ( || "" ) por si en el JSON olvidaste 
        // poner la letra o el título de alguna alabanza. Así la app no colapsa.
        const tituloLimpio = limpiarTexto(cancion.titulo || "");
        const letraOriginal = cancion.letra || ""; 
        
        // Quitamos los acordes y limpiamos el texto
        const letraSinAcordes = letraOriginal.replace(/\[.*?\]/g, "");
        const letraLimpia = limpiarTexto(letraSinAcordes);

        // Verificamos coincidencias
        return tituloLimpio.includes(textoBusqueda) || letraLimpia.includes(textoBusqueda);
    });
    
    mostrarLista(filtradas, false);
});


// Botones de Transposición
document.getElementById('subir-tono').addEventListener('click', () => {
    if (!cancionActualId) return;
    if (viendoListaDominical) {
        let cancionGuardada = listaDominical.find(c => c.id === cancionActualId && c.dia === cancionActualDia);
        if (cancionGuardada) {
            cancionGuardada.tono_original = transponerAcordeStr(cancionGuardada.tono_original, 1);
            cancionGuardada.letra = transponerLetraCruda(cancionGuardada.letra, 1);
        }
    } else {
        pasosActuales += 1;
    }
    renderizarVisorDerecho();
});

document.getElementById('bajar-tono').addEventListener('click', () => {
    if (!cancionActualId) return;
    if (viendoListaDominical) {
        let cancionGuardada = listaDominical.find(c => c.id === cancionActualId && c.dia === cancionActualDia);
        if (cancionGuardada) {
            cancionGuardada.tono_original = transponerAcordeStr(cancionGuardada.tono_original, -1);
            cancionGuardada.letra = transponerLetraCruda(cancionGuardada.letra, -1);
        }
    } else {
        pasosActuales -= 1;
    }
    renderizarVisorDerecho();
});

// Añadir a la lista clasificada por día (Por defecto: Domingo)
const btnAgregar = document.getElementById('btn-agregar-lista');
btnAgregar.addEventListener('click', () => {
    if (cancionActualId === null || viendoListaDominical) return;
    
    const diaPorDefecto = "Domingo";
    
    const yaExiste = listaDominical.find(c => c.id === cancionActualId && c.dia === diaPorDefecto);
    if (!yaExiste) {
        const cancionBase = inventarioCanciones.find(c => c.id === cancionActualId);
        
        const cancionClonada = {
            id: cancionBase.id,
            titulo: cancionBase.titulo,
            tono_original: transponerAcordeStr(cancionBase.tono_original, pasosActuales),
            letra: transponerLetraCruda(cancionBase.letra, pasosActuales),
            dia: diaPorDefecto 
        };
        
        listaDominical.push(cancionClonada);
        
        document.getElementById('btn-ver-lista').textContent = `Ver mis listas (${listaDominical.length})`;
        btnAgregar.textContent = "¡Añadida!";
        btnAgregar.style.backgroundColor = "#2ecc71"; 
        setTimeout(() => {
            btnAgregar.textContent = "Añadir a la lista";
            btnAgregar.style.backgroundColor = "var(--dorado)";
        }, 1500);
    } else {
        alert(`Esta alabanza ya está agregada al culto del Domingo.`);
    }
});

// Alternar vistas
const btnVerLista = document.getElementById('btn-ver-lista');
const btnExportarPDF = document.getElementById('btn-exportar-pdf');

btnVerLista.addEventListener('click', () => {
    viendoListaDominical = !viendoListaDominical; 
    const tituloSeccion = document.querySelector('#lista-canciones h2');
    
    if (viendoListaDominical) {
        btnVerLista.textContent = `Volver al Repertorio (${listaDominical.length})`;
        btnVerLista.style.backgroundColor = "var(--blanco)";
        tituloSeccion.textContent = "Listas de Reunión";
        mostrarLista(listaDominical, true);
        
        if(listaDominical.length > 0 && btnExportarPDF) btnExportarPDF.style.display = 'inline-block';
    } else {
        btnVerLista.textContent = `Ver mis listas (${listaDominical.length})`;
        btnVerLista.style.backgroundColor = "var(--dorado)";
        tituloSeccion.textContent = "Repertorio Disponible";
        if (btnExportarPDF) btnExportarPDF.style.display = 'none';
        
        const textoBusqueda = document.getElementById('buscador').value.toLowerCase();
        const filtradas = inventarioCanciones.filter(c => c.titulo.toLowerCase().includes(textoBusqueda));
        mostrarLista(filtradas, false);
    }
    limpaVisorDerecho();
});

// Botón Vista Expandida
// 1. Agregamos la función que controla el viewport del celular
function alternarZoomMovil(permitirZoom) {
    let metaViewport = document.querySelector('meta[name="viewport"]');
    
    if (!metaViewport) {
        metaViewport = document.createElement('meta');
        metaViewport.name = "viewport";
        document.head.appendChild(metaViewport);
    }

    if (permitirZoom) {
        metaViewport.content = "width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes";
    } else {
        metaViewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    }
}

// 2. BOTON VISION EXPANDIDA, LLAMANDO AL ZOOM
const btnPantallaCompleta = document.getElementById('btn-pantalla-completa');
if(btnPantallaCompleta) {
    btnPantallaCompleta.textContent = "⛶ Expandir vista";
    
    btnPantallaCompleta.addEventListener('click', () => {
        const body = document.body;
        body.classList.toggle('modo-expandido');
        
        if (body.classList.contains('modo-expandido')) {
            btnPantallaCompleta.textContent = "✖ Contraer vista";
            btnPantallaCompleta.style.backgroundColor = "#ff4c4c"; 
            
            // Habilitar zoom al expandir
            alternarZoomMovil(true); 
            
        } else {
            btnPantallaCompleta.textContent = "⛶ Expandir vista";
            btnPantallaCompleta.style.backgroundColor = "var(--azul-marino)"; 
            
            // Bloquear zoom al regresar a la vista normal
            alternarZoomMovil(false); 
        }
    });
}

// ==========================================
// 7. PROGRAMACIÓN DEL BOTÓN DE EXPORTACIÓN A PDF
// ==========================================
if (btnExportarPDF) {
    btnExportarPDF.addEventListener('click', () => {
        if (listaDominical.length === 0) return;

        const areaAnterior = document.getElementById('area-impresion-pdf');
        if (areaAnterior) areaAnterior.remove();

        const areaImpresion = document.createElement('div');
        areaImpresion.id = 'area-impresion-pdf';

        const diasOrden = ["Miércoles", "Viernes", "Domingo"];
        
        diasOrden.forEach(dia => {
            const cancionesDelDia = listaDominical.filter(c => c.dia === dia);
            
            cancionesDelDia.forEach(cancion => {
                const divCancion = document.createElement('div');
                divCancion.className = 'cancion-pdf';

                // 1. Construimos el HTML base (Título y Tono)
                let htmlCancion = `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #D4AF37; margin-bottom: 15px; padding-bottom: 5px;">
                        <h2 style="margin: 0; border: none; padding: 0; font-size: 26pt;">${cancion.titulo}</h2>
                        <span style="font-family: 'Segoe UI', sans-serif; font-weight: bold; background-color: #0A192F; color: #D4AF37; padding: 8px 16px; border-radius: 4px; font-size: 12pt; text-transform: uppercase; letter-spacing: 1px;">REUNIÓN: ${cancion.dia}</span>
                    </div>
                    <div class="tono-pdf" style="font-size: 15pt; margin-bottom: 20px; text-align: center;">Tono para la alabanza: ${cancion.tono_original}</div>
                `;

               // ========================================================
                // 🚨 EXCEPCIÓN VIP: SOLO PARA "ALABA A DIOS" (ID: 12)
                // ========================================================
                if (cancion.id === 12 || cancion.titulo.includes("Alaba a Dios")) {
                    const estrofas = cancion.letra.split(/\n\s*\n/);
                    
                    // Cortamos a machete: Las primeras 5 estrofas a la Hoja 1, el resto a la Hoja 2
                    const parte1 = estrofas.slice(0, 5).join('\n\n');
                    const parte2 = estrofas.slice(5).join('\n\n');

                    htmlCancion += `
                        <div class="letra-doble-columna-gigante" style="font-family: 'Courier New', Courier, monospace; font-size: 13pt; line-height: 1.4;">
                            ${procesarLetraYAcordes(parte1)}
                        </div>
                        
                        <div class="letra-centrada" style="font-family: 'Courier New', Courier, monospace; font-size: 13.5pt; line-height: 1.3; page-break-before: always; padding-top: 15px;">
                            ${procesarLetraYAcordes(parte2)}
                        </div>
                    `;
                }
                // ========================================================
                // COMPORTAMIENTO NORMAL PARA EL RESTO DEL REPERTORIO
                // ========================================================
                else {
                    let lineasVisuales = 0;
                    let maxLongitudLinea = 0;

                    cancion.letra.split('\n').forEach(l => {
                        const linea = l.trim();
                        const soloTexto = linea.replace(/\[.*?\]/g, ""); 
                        if (soloTexto.length > maxLongitudLinea) maxLongitudLinea = soloTexto.length;

                        if (linea === "") lineasVisuales += 1; 
                        else if (/^\[[^\[\]]+\]$/.test(linea)) lineasVisuales += 1.5; 
                        else if (linea.includes('[')) lineasVisuales += 2; 
                        else lineasVisuales += 1; 
                    });

                   let claseColumna = '';
                    let estiloDinamico = '';

                    if (lineasVisuales <= 14) {
                        // 🚨 NUEVO ESCALÓN: Canciones SÚPER cortas (Ej. Dame de beber)
                        // Le damos prioridad absoluta. Letra grande y la empujamos hacia el centro de la hoja.
                        claseColumna = 'letra-centrada';
                        estiloDinamico = "font-size: 16.5pt; line-height: 1.6; margin-top: 80px;";
                    } else if (maxLongitudLinea > 50 && lineasVisuales <= 32) {
                        // Canciones con frases muy largas pero que caben en 1 hoja
                        claseColumna = 'letra-centrada';
                        estiloDinamico = "font-size: 13.5pt; line-height: 1.4; margin-top: 20px;";
                    } else if (lineasVisuales > 32) {
                        // Canciones largas: Doble columna para aprovechar espacio
                        claseColumna = 'letra-doble-columna-equilibrada';
                        estiloDinamico = "font-size: 13pt; line-height: 1.4;";
                    } else if (lineasVisuales > 22) {
                        // Canciones "medianas" (Ej. Abre mis ojos)
                        claseColumna = 'letra-centrada';
                        estiloDinamico = "font-size: 14.5pt; line-height: 1.3; margin-top: 15px;";
                    } else {
                        // Canciones cortas normales (entre 15 y 22 líneas)
                        claseColumna = 'letra-centrada';
                        estiloDinamico = "font-size: 16pt; line-height: 1.4; margin-top: 30px;";
                    }

                    htmlCancion += `
                        <div class="${claseColumna}" style="font-family: 'Courier New', Courier, monospace; ${estiloDinamico}">
                            ${procesarLetraYAcordes(cancion.letra)}
                        </div>
                    `;
                }

                divCancion.innerHTML = htmlCancion;
                areaImpresion.appendChild(divCancion);
            });
        });

        document.body.appendChild(areaImpresion);

        setTimeout(() => {
            window.print();
        }, 100);
    });
}
// Función para mostrar el diccionario como "página extra"
function abrirDiccionario() { 
    if (!letraActual) return; 
    const coincidencias = letraActual.match(/\[([^\]]+)\]/g);
    
    if (!coincidencias) {
        alert("Esta canción no tiene acordes para mostrar.");
        return; 
    }

    // 🚨 1. ABRIMOS LA CAJA DE INMEDIATO (Antes de hacer matemáticas)
    document.getElementById('diccionario-acordes').style.display = 'block';

    // Sacamos el texto limpio sin los corchetes
    let acordes = [...new Set(coincidencias)].map(a => a.replace(/[\[\]]/g, ''));
    
    // 🚨 FILTRO INTELIGENTE: Le enseñamos al sistema cómo se ve un acorde real
    // Acepta letras A-G, sostenidos/bemoles, menores (m), suspendidos (sus), números (2, 4, 7) y bajos con diagonal (D/F#)
    const regexAcorde = /^[A-G][#b]?(m|sus|maj|dim|aug)?\d?(\/[A-G][#b]?)?$/;
    
    // Descartamos todo lo que no sea un acorde (Verso, Coro, //, etc.)
    acordes = acordes.filter(acorde => regexAcorde.test(acorde));

    // Si después de limpiar resulta que solo había texto y cero acordes, avisamos y no abrimos la caja
    if (acordes.length === 0) {
        alert("Esta canción no tiene acordes musicales para mostrar.");
        return;
    }
    const contenedor = document.getElementById('contenedor-diagramas');
    contenedor.innerHTML = '';

    acordes.forEach(acorde => {
        // Creamos la "tarjeta" principal para este acorde
        const divPrincipal = document.createElement('div');
        divPrincipal.className = 'diagrama-acorde';
        divPrincipal.style.display = 'flex';
        divPrincipal.style.flexDirection = 'column';
        divPrincipal.style.alignItems = 'center';

        // Título del acorde (Dorado)
        divPrincipal.innerHTML = `<div style="text-align: center; font-weight: bold; color: #D4AF37; margin-bottom: 10px; font-size: 1.2rem;">${acorde}</div>`;

        // Contenedor exclusivo para que la librería dibuje la guitarra
        const divGuitarra = document.createElement('div');
        divPrincipal.appendChild(divGuitarra);

        // 1. DIBUJO DE GUITARRA
        try {
            if (diccionarioGuitarra[acorde]) {
                vexchords.draw(divGuitarra, { chord: diccionarioGuitarra[acorde] });
            } else {
                divGuitarra.innerHTML = `<div style="color: #ff4c4c; font-size: 0.7rem; text-align: center;">Sin gráfico 🎸</div>`;
            }
        } catch (error) {
            console.log(`Fallo guitarra ${acorde}:`, error);
        }

        // 2. DIBUJO DE TECLADO
        if (diccionarioTeclado[acorde]) {
            // Llamamos a nuestra nueva función que devuelve el HTML del piano
            divPrincipal.innerHTML += dibujarTecladoHTML(diccionarioTeclado[acorde]);
        } else {
            divPrincipal.innerHTML += `<div style="color: #ff4c4c; font-size: 0.7rem; text-align: center; margin-top: 15px;">Sin gráfico 🎹</div>`;
        }

        // Inyectamos la tarjeta completa en el panel
        contenedor.appendChild(divPrincipal);
    });
}
// Botón para cerrar
function cerrarDiccionario() {
    const modal = document.getElementById('diccionario-acordes');
    if (modal) {
        modal.style.display = 'none'; // Lo volvemos a ocultar
    }
}
// ==========================================
// 8. ASISTENTE DE INTELIGENCIA ARTIFICIAL (GEMINI)
// ==========================================
import { ref as dbRef, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// PEGA TU API KEY AQUÍ ABAJO
const GEMINI_API_KEY = "AQ.Ab8RN6IB-u_BtYZrv0a6lw05VjX7q0KnSmX_CXeoI8smNI4RRQ"; 

// Controles del Panel
const btnAbrirAdmin = document.getElementById('btn-abrir-admin');
const panelAdmin = document.getElementById('panel-admin-ia');
const btnCerrarAdmin = document.getElementById('btn-cerrar-admin');
const btnProcesar = document.getElementById('btn-procesar-ia');
const inputImagenes = document.getElementById('input-imagenes-ia');
const mensajeEstado = document.getElementById('mensaje-estado-ia');

if(btnAbrirAdmin) {
    btnAbrirAdmin.addEventListener('click', () => panelAdmin.style.display = 'block');
    btnCerrarAdmin.addEventListener('click', () => {
        panelAdmin.style.display = 'none';
        inputImagenes.value = "";
        mensajeEstado.textContent = "";
    });
}

// Función para convertir la imagen a Base64 (Formato que lee la IA)
function convertirABase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve({
                inlineData: {
                    data: base64String,
                    mimeType: file.type
                }
            });
        };
        reader.onerror = error => reject(error);
    });
}

// Evento principal para procesar con IA
if(btnProcesar) {
    btnProcesar.addEventListener('click', async () => {
        if (inputImagenes.files.length === 0) {
            alert("Por favor selecciona al menos una imagen.");
            return;
        }

        mensajeEstado.textContent = "⏳ Analizando imágenes con IA... (Esto puede tomar unos segundos)";
        btnProcesar.disabled = true;

        try {
            // 1. Convertimos todas las imágenes subidas
            const promesasImagenes = Array.from(inputImagenes.files).map(convertirABase64);
            const partesDeImagenes = await Promise.all(promesasImagenes);

            // 2. El "Prompt" Maestro para Gemini
            const instruccionTexto = {
                text: `Actúa como un transcriptor musical experto. Analiza las siguientes capturas de pantalla de una canción cristiana y extrae su información. 
                REGLAS ESTRICTAS:
                1. El tono original escríbelo en notación americana (ej. C, D, Em).
                2. Extrae toda la letra y coloca los acordes EXACTAMENTE antes de la sílaba correspondiente usando corchetes, así: [Acorde]Sílaba. Ejemplo: [G]Cerca de [D]Ti yo [C]quiero estar.
                3. Une la letra si son varias imágenes manteniendo el orden lógico.
                4. Usa etiquetas para las partes de la canción (ej. [Verso], [Coro]).
                5. DEVUELVE ÚNICA Y EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO con esta estructura, sin texto extra, sin markdown, sin comillas invertidas:
                {
                  "titulo": "Nombre de la cancion - Autor",
                  "tono_original": "Tono",
                  "letra": "Toda la letra formateada aquí con saltos de línea \\n"
                }`
            };

            // Juntamos la instrucción con las imágenes
            const contenidos = [instruccionTexto, ...partesDeImagenes];
            // Limpiamos la llave por si se copió con espacios invisibles
            const apiKeyLimpia = GEMINI_API_KEY.trim();

            // 3. Enviamos a la API de Gemini (Usando el sufijo -latest)
            const respuesta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKeyLimpia}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: contenidos }],
                    generationConfig: { temperature: 0.2 } 
                })
            });

            // Validación de red para evitar colapsos
            if (!respuesta.ok) {
                const errorData = await respuesta.json();
                throw new Error(`Error de API (${respuesta.status}): ${errorData.error?.message || 'Desconocido'}`);
            }

            const datos = await respuesta.json();
            
            // 🚨 NUEVO: Validación de estructura
            if (!datos.candidates || datos.candidates.length === 0) {
                throw new Error("La IA no devolvió una transcripción válida.");
            }
            
            // 4. Limpiamos la respuesta
            let textoJSON = datos.candidates[0].content.parts[0].text;
            textoJSON = textoJSON.replace(/```json/g, '').replace(/```/g, '').trim();

            const cancionProcesada = JSON.parse(textoJSON);

            // 5. Calculamos el nuevo ID y Guardamos en Firebase
            const nuevoId = inventarioCanciones.length > 0 ? inventarioCanciones[inventarioCanciones.length - 1].id + 1 : 1;
            cancionProcesada.id = nuevoId;

            // Importamos 'db' desde el bloque inicial de Firebase en tu archivo
            const nuevaCancionRef = dbRef(window.dbInstance, 'canciones/' + (nuevoId - 1)); // Firebase usa índice 0 para arrays
            await set(nuevaCancionRef, cancionProcesada);

            mensajeEstado.style.color = "green";
            mensajeEstado.textContent = "✅ ¡Canción agregada con éxito!";
            
            // Recargamos la lista
            setTimeout(() => {
                window.location.reload(); 
            }, 1500);

        } catch (error) {
            console.error(error);
            mensajeEstado.style.color = "red";
            mensajeEstado.textContent = "❌ Error al procesar. Revisa la consola.";
        } finally {
            btnProcesar.disabled = false;
        }
    });
}
// ==========================================
// GENERADOR DE MINI-TECLADO HTML
// ==========================================
function dibujarTecladoHTML(notasAcorde) {
    const teclas = [
        { nota: 'C', tipo: 'blanca' }, { nota: 'C#', tipo: 'negra', left: '11%' },
        { nota: 'D', tipo: 'blanca' }, { nota: 'D#', tipo: 'negra', left: '25%' },
        { nota: 'E', tipo: 'blanca' },
        { nota: 'F', tipo: 'blanca' }, { nota: 'F#', tipo: 'negra', left: '54%' },
        { nota: 'G', tipo: 'blanca' }, { nota: 'G#', tipo: 'negra', left: '68%' },
        { nota: 'A', tipo: 'blanca' }, { nota: 'A#', tipo: 'negra', left: '82%' },
        { nota: 'B', tipo: 'blanca' }
    ];

    let html = `<div style="position: relative; width: 110px; height: 50px; margin: 15px auto 5px auto; display: flex; border: 1px solid #555; border-radius: 3px; overflow: hidden; background: white;">`;
    
    // 1. Dibujamos las teclas blancas
    teclas.filter(t => t.tipo === 'blanca').forEach(t => {
        const esActiva = notasAcorde.includes(t.nota);
        const colorCuerpo = esActiva ? '#D4AF37' : '#ffffff';
        html += `<div style="flex: 1; border-right: 1px solid #ccc; background: ${colorCuerpo};"></div>`;
    });

    // 2. Dibujamos las teclas negras flotando encima
    teclas.filter(t => t.tipo === 'negra').forEach(t => {
        const esActiva = notasAcorde.includes(t.nota);
        const colorCuerpo = esActiva ? '#D4AF37' : '#222222';
        html += `<div style="position: absolute; width: 9%; height: 60%; top: 0; left: ${t.left}; background: ${colorCuerpo}; border-radius: 0 0 2px 2px; box-shadow: 1px 1px 2px rgba(0,0,0,0.5);"></div>`;
    });

    html += `</div>`;
    // Añadimos el texto con las notas exactas debajo del piano
    html += `<div style="font-size: 0.75rem; color: #aaa; text-align: center; margin-bottom: 10px;">🎹 ${notasAcorde.join(' - ')}</div>`;
    
    return html;
  
}
