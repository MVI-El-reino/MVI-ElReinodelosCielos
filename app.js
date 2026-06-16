// ==========================================
// 1. VARIABLES GLOBALES DE MEMORIA
// ==========================================
let inventarioCanciones = [];
let listaDominical = [];
let cancionActualId = null; 
let cancionActualDia = null; 
let viendoListaDominical = false;
let pasosActuales = 0; 

// ==========================================
// 2. INICIALIZACIÓN Y LECTURA DE DATOS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    fetch('canciones.json')
        .then(respuesta => respuesta.json())
        .then(datos => {
            inventarioCanciones = datos;
            mostrarLista(inventarioCanciones);
        })
        .catch(error => {
            console.error("Error al cargar:", error);
            document.getElementById('contenedor-lista').innerHTML = "<li>Error al cargar las canciones.</li>";
        });
});

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
            if (lineaLimpia === "") return; // Ya no usamos <br>, el div dará el espacio
            
            if (/^\[[^\[\]]+\]$/.test(lineaLimpia)) {
                htmlEstrofa += `<span class="marcador-seccion">${lineaLimpia}</span>`;
                return;
            }
            
            if (linea.includes('[')) {
                let acHTML = '', letHTML = '', cA = 0, cL = 0;
                linea.split('[').forEach((p, i) => {
                    if (i === 0) { letHTML += p; cL += p.length; }
                    else {
                        let [ac, des] = p.split(']');
                        acHTML += ' '.repeat(Math.max(0, cL - cA)) + `<span class="acorde-formateado">${ac}</span>`;
                        cA += (Math.max(0, cL - cA)) + ac.length;
                        letHTML += (des || "");
                        cL += (des || "").length;
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
    
    const contenedorLetra = document.getElementById('letra-cancion');
    
    // NUEVA INTELIGENCIA: Contamos la altura visual exacta en pantalla
    let lineasVisuales = 0;
    letraTranspuesta.split('\n').forEach(l => {
        const linea = l.trim();
        if (linea === "") lineasVisuales += 1; 
        else if (/^\[[^\[\]]+\]$/.test(linea)) lineasVisuales += 1.5; 
        else if (linea.includes('[')) lineasVisuales += 2; // Vale por 2 (Letra + Acorde)
        else lineasVisuales += 1; 
    });
    
    // Si pasa de 20 líneas visuales, se va a doble columna
    if (lineasVisuales > 20) {
        contenedorLetra.classList.add('letra-doble-columna');
    } else {
        contenedorLetra.classList.remove('letra-doble-columna');
    }
    
    contenedorLetra.innerHTML = procesarLetraYAcordes(letraTranspuesta);
    //DIBUJO DE GRAFICOS DE NOTAS
    mostrarAcordesDeCancion(letraTranspuesta);
}

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
    const textoBusqueda = limpiarTexto(evento.target.value);
    
    const filtradas = inventarioCanciones.filter(cancion => {
        // 1. Limpiamos el título
        const tituloLimpio = limpiarTexto(cancion.titulo);
        
        // 2. Quitamos los acordes de la letra y la limpiamos
        const letraSinAcordes = cancion.letra.replace(/\[.*?\]/g, "");
        const letraLimpia = limpiarTexto(letraSinAcordes);

        // 3. Verificamos si lo que escribió coincide con el título o con alguna frase de la canción
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
const btnPantallaCompleta = document.getElementById('btn-pantalla-completa');
if(btnPantallaCompleta) {
    btnPantallaCompleta.textContent = "⛶ Expandir vista";
    btnPantallaCompleta.addEventListener('click', () => {
        const body = document.body;
        body.classList.toggle('modo-expandido');
        if (body.classList.contains('modo-expandido')) {
            btnPantallaCompleta.textContent = "✖ Contraer vista";
            btnPantallaCompleta.style.backgroundColor = "#ff4c4c"; 
        } else {
            btnPantallaCompleta.textContent = "⛶ Expandir vista";
            btnPantallaCompleta.style.backgroundColor = "var(--azul-marino)"; 
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
                
                // Contamos la altura REAL (Líneas visuales)
                let lineasVisuales = 0;
                cancion.letra.split('\n').forEach(l => {
                    const linea = l.trim();
                    if (linea === "") { 
                        lineasVisuales += 1; 
                    } else if (/^\[[^\[\]]+\]$/.test(linea)) { 
                        lineasVisuales += 1.5; 
                    } else if (linea.includes('[')) { 
                        lineasVisuales += 2; 
                    } else { 
                        lineasVisuales += 1; 
                    }
                });

                let claseColumna = '';
                let estiloDinamico = '';
                
                // NUEVO LÍMITE: Equilibrado y con letras más grandes
                if (lineasVisuales > 45) {
                    // Canciones extremadamente largas (casi no hay, pero por si acaso)
                    claseColumna = 'letra-doble-columna';
                    estiloDinamico = "font-size: 13pt; line-height: 1.3;";
                } else if (lineasVisuales > 20) {
                    // Canciones medianas-largas (Como "A Danzar")
                    claseColumna = 'letra-doble-columna';
                    estiloDinamico = "font-size: 16pt; line-height: 1.4;"; // ¡Aumentamos de 14pt a 16pt!
                } else if (lineasVisuales <= 12) {
                    // Canciones muy cortas 
                    claseColumna = 'letra-centrada';
                    estiloDinamico = "font-size: 22pt; line-height: 1.5; margin-top: 30px;";
                } else {
                    // Canciones medianas (13 a 20 líneas)
                    claseColumna = 'letra-centrada';
                    estiloDinamico = "font-size: 18pt; line-height: 1.4; margin-top: 20px;";
                }

                divCancion.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #D4AF37; margin-bottom: 15px; padding-bottom: 5px;">
                        <h2 style="margin: 0; border: none; padding: 0; font-size: 26pt;">${cancion.titulo}</h2>
                        <span style="font-family: 'Segoe UI', sans-serif; font-weight: bold; background-color: #0A192F; color: #D4AF37; padding: 8px 16px; border-radius: 4px; font-size: 12pt; text-transform: uppercase; letter-spacing: 1px;">REUNIÓN: ${cancion.dia}</span>
                    </div>
                    <div class="tono-pdf" style="font-size: 15pt; margin-bottom: 20px; text-align: center;">Tono para la alabanza: ${cancion.tono_original}</div>
                    
                    <div class="${claseColumna}" style="font-family: 'Courier New', Courier, monospace; ${estiloDinamico}">
                        ${procesarLetraYAcordes(cancion.letra)}
                    </div>
                `;
                areaImpresion.appendChild(divCancion);
            });
        });

        document.body.appendChild(areaImpresion);

        setTimeout(() => {
            window.print();
        }, 100);
    });
}
function abrirDiccionario() {
    const acordes = [...new Set(letraActual.match(/\[([^\]]+)\]/g))].map(a => a.replace(/[\[\]]/g, ''));
    const contenedor = document.getElementById('contenedor-diagramas');
    contenedor.innerHTML = '';
    
    if (acordes.length === 0) return;

    acordes.forEach(acorde => {
        const idSeguro = acorde.replace(/[#\/]/g, (m) => m === '#' ? 'Sharp' : 'Slash');
        contenedor.innerHTML += `
            <div class="diagrama-acorde">
                <span style="display:block; text-align:center; font-weight:bold;">${acorde}</span>
                <div id="c-${idSeguro}" style="width:100px; height:120px;"></div>
            </div>`;
        setTimeout(() => {
            if (typeof ChordBox !== 'undefined') new ChordBox(`#c-${idSeguro}`, { chord: acorde, instrument: 'guitar' });
        }, 50);
    });
    document.getElementById('diccionario-acordes').style.display = 'block';
}

function cerrarDiccionario() {
    document.getElementById('diccionario-acordes').style.display = 'none';
}
