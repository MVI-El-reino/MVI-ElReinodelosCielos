// ==========================================
// 1. VARIABLES GLOBALES DE MEMORIA
// ==========================================
let inventarioCanciones = [];
let listaDominical = [];
let cancionActualId = null; 
let viendoListaDominical = false;
let pasosActuales = 0; // Controla cuántos semitonos hemos subido o bajado

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
            console.error("Error al cargar el repertorio:", error);
            document.getElementById('contenedor-lista').innerHTML = "<li>Error al cargar las canciones. Verifica tu archivo JSON.</li>";
        });
});

// ==========================================
// 3. MOTOR MATEMÁTICO DE TRANSPOSICIÓN MUSICAL
// ==========================================
function transponerNota(nota, pasos) {
    const escala = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const equivalencias = {'Db':'C#', 'Eb':'D#', 'Gb':'F#', 'Ab':'G#', 'Bb':'A#'};
    
    // Convertimos bemoles a sostenidos para simplificar la matemática
    let notaNormalizada = equivalencias[nota] || nota;
    let indice = escala.indexOf(notaNormalizada);
    
    // Si no reconoce la nota (ej. un error de tipeo en el JSON), la devuelve igual
    if (indice === -1) return nota; 
    
    let nuevoIndice = (indice + pasos) % 12;
    if (nuevoIndice < 0) nuevoIndice += 12; // Manejo circular para negativos
    
    return escala[nuevoIndice];
}

function transponerAcordeStr(acordeCrudo, pasos) {
    if (pasos === 0) return acordeCrudo;
    // Expresión regular inteligente: Extrae solo la letra de la nota (A-G) y su alteración (# o b)
    // Ignorando los sufijos como "m", "sus4", "7", etc.
    const regexNota = /([A-G][#b]?)/g;
    return acordeCrudo.replace(regexNota, (match) => transponerNota(match, pasos));
}

function transponerLetraCruda(letraCruda, pasos) {
    if (pasos === 0) return letraCruda;
    // Busca todo lo que esté entre corchetes y le aplica la transposición
    const regexCorchetes = /\[([^\]]+)\]/g;
    return letraCruda.replace(regexCorchetes, (match, acorde) => {
        return `[${transponerAcordeStr(acorde, pasos)}]`;
    });
}

// ==========================================
// 4. MOTOR DE FORMATO VISUAL (ACORDES SOBRE LETRA)
// ==========================================
function procesarLetraYAcordes(letraCruda) {
    const lineasCrudas = letraCruda.split('\n');
    let htmlFinal = '';

    lineasCrudas.forEach(lineaRaw => {
        if (lineaRaw.trim() === "") {
            htmlFinal += '<br>';
            return;
        }

        if (lineaRaw.trim().startsWith('[') && lineaRaw.trim().endsWith(']')) {
            htmlFinal += `<span class="marcador-seccion">${lineaRaw.trim()}</span>`;
            return;
        }

        if (lineaRaw.includes('[')) {
            let lineaAcordesHTML = '';
            let lineaLetrasHTML = '';
            let caracteresAcordes = 0;
            let caracteresLetras = 0;

            let partes = lineaRaw.split('[');

            partes.forEach((parte, index) => {
                if (index === 0) {
                    lineaLetrasHTML += parte;
                    caracteresLetras += parte.length;
                } else {
                    let subPartes = parte.split(']');
                    let acorde = subPartes[0];
                    let textoDespues = subPartes[1] || "";

                    let espaciosFaltantes = caracteresLetras - caracteresAcordes;
                    if (espaciosFaltantes > 0) {
                        lineaAcordesHTML += ' '.repeat(espaciosFaltantes);
                        caracteresAcordes += espaciosFaltantes;
                    }

                    lineaAcordesHTML += `<span class="acorde-formateado">${acorde}</span>`;
                    caracteresAcordes += acorde.length;

                    lineaLetrasHTML += textoDespues;
                    caracteresLetras += textoDespues.length;
                }
            });

            htmlFinal += `
                <div class="bloque-linea">
                    <pre class="linea-acordes">${lineaAcordesHTML}</pre>
                    <pre class="linea-letras">${lineaLetrasHTML}</pre>
                </div>`;
        } else {
            htmlFinal += `<div class="bloque-linea"><pre class="linea-letras">${lineaRaw}</pre></div>`;
        }
    });

    return htmlFinal;
}

// ==========================================
// 5. RENDERIZADO DE LA INTERFAZ
// ==========================================
function obtenerCancionActual() {
    return viendoListaDominical 
        ? listaDominical.find(c => c.id === cancionActualId) 
        : inventarioCanciones.find(c => c.id === cancionActualId);
}

function mostrarLista(canciones, esListaDominical = false) {
    const contenedor = document.getElementById('contenedor-lista');
    contenedor.innerHTML = ''; 

    if (canciones.length === 0) {
        contenedor.innerHTML = esListaDominical ? '<li style="color:gray; text-align:center;">Tu lista está vacía.</li>' : '<li>No se encontraron alabanzas.</li>';
        return;
    }

    canciones.forEach(cancion => {
        const li = document.createElement('li');
        li.textContent = cancion.titulo;
        li.style.cursor = 'pointer';
        li.dataset.id = cancion.id; 

        if (esListaDominical) {
            const btnEliminar = document.createElement('button');
            btnEliminar.textContent = "✖";
            btnEliminar.className = "btn-eliminar";
            
            btnEliminar.addEventListener('click', (e) => {
                e.stopPropagation(); 
                listaDominical = listaDominical.filter(c => c.id !== cancion.id);
                mostrarLista(listaDominical, true); 
                document.getElementById('btn-ver-lista').textContent = `Volver al Repertorio (${listaDominical.length})`;
                
                if (listaDominical.length === 0) {
                    document.getElementById('btn-exportar-pdf').style.display = 'none';
                    // Limpiamos visor si borramos la canción que estábamos viendo
                    if(cancionActualId === cancion.id) {
                        document.getElementById('titulo-cancion').textContent = 'Selecciona una alabanza';
                        document.getElementById('controles-tono').style.display = 'none';
                        document.getElementById('letra-cancion').innerHTML = '';
                    }
                }
            });
            li.appendChild(btnEliminar);
        }

        li.addEventListener('click', () => {
            mostrarCancion(cancion.id);
        });

        contenedor.appendChild(li);
    });
}

function renderizarVisorDerecho() {
    const cancion = obtenerCancionActual();
    if (!cancion) return;

    // Transponemos el título del tono y la letra en base a los pasos actuales
    let tonoMostrado = transponerAcordeStr(cancion.tono_original, pasosActuales);
    let letraTranspuesta = transponerLetraCruda(cancion.letra, pasosActuales);

    document.getElementById('titulo-cancion').textContent = cancion.titulo;
    document.getElementById('controles-tono').style.display = 'flex';
    document.getElementById('tono-actual').innerHTML = `Tono: <span style="color:#E67E22;">${tonoMostrado}</span>`;
    document.getElementById('letra-cancion').innerHTML = procesarLetraYAcordes(letraTranspuesta);
}

function mostrarCancion(id) {
    cancionActualId = id; 
    pasosActuales = 0; // Reseteamos la transposición al cambiar de canción
    renderizarVisorDerecho();
}

// ==========================================
// 6. EVENTOS DE BOTONES E INTERACTIVIDAD
// ==========================================

// Buscador
document.getElementById('buscador').addEventListener('input', (evento) => {
    const texto = evento.target.value.toLowerCase();
    const filtradas = inventarioCanciones.filter(c => c.titulo.toLowerCase().includes(texto));
    mostrarLista(filtradas, false);
});

// Botones de Transposición (+1 Tono / -1 Tono)
document.getElementById('subir-tono').addEventListener('click', () => {
    if (!cancionActualId) return;
    if (viendoListaDominical) {
        // Si estamos en la lista del domingo, guardamos el cambio permanentemente en el arreglo
        let cancionGuardada = listaDominical.find(c => c.id === cancionActualId);
        cancionGuardada.tono_original = transponerAcordeStr(cancionGuardada.tono_original, 1);
        cancionGuardada.letra = transponerLetraCruda(cancionGuardada.letra, 1);
    } else {
        pasosActuales += 1;
    }
    renderizarVisorDerecho();
});

document.getElementById('bajar-tono').addEventListener('click', () => {
    if (!cancionActualId) return;
    if (viendoListaDominical) {
        let cancionGuardada = listaDominical.find(c => c.id === cancionActualId);
        cancionGuardada.tono_original = transponerAcordeStr(cancionGuardada.tono_original, -1);
        cancionGuardada.letra = transponerLetraCruda(cancionGuardada.letra, -1);
    } else {
        pasosActuales -= 1;
    }
    renderizarVisorDerecho();
});

// Añadir a lista dominical
const btnAgregar = document.getElementById('btn-agregar-lista');
btnAgregar.addEventListener('click', () => {
    if (cancionActualId === null || viendoListaDominical) return;
    
    const yaExiste = listaDominical.find(c => c.id === cancionActualId);
    if (!yaExiste) {
        const cancionBase = inventarioCanciones.find(c => c.id === cancionActualId);
        
        // Creamos una copia que guarda el tono exacto que el músico eligió en pantalla
        const cancionClonada = {
            id: cancionBase.id,
            titulo: cancionBase.titulo,
            tono_original: transponerAcordeStr(cancionBase.tono_original, pasosActuales),
            letra: transponerLetraCruda(cancionBase.letra, pasosActuales)
        };
        
        listaDominical.push(cancionClonada);
        
        document.getElementById('btn-ver-lista').textContent = `Ver mi lista dominical (${listaDominical.length})`;
        btnAgregar.textContent = "¡Añadida!";
        btnAgregar.style.backgroundColor = "#2ecc71"; 
        setTimeout(() => {
            btnAgregar.textContent = "Añadir a lista dominical";
            btnAgregar.style.backgroundColor = "var(--dorado)";
        }, 1500);
    } else {
        alert("Esta alabanza ya está en tu lista del domingo.");
    }
});

// Alternar entre Repertorio Global y Lista Dominical
const btnVerLista = document.getElementById('btn-ver-lista');
const btnExportarPDF = document.getElementById('btn-exportar-pdf');

btnVerLista.addEventListener('click', () => {
    viendoListaDominical = !viendoListaDominical; 
    const tituloSeccion = document.querySelector('#lista-canciones h2');
    
    if (viendoListaDominical) {
        btnVerLista.textContent = `Volver al Repertorio (${listaDominical.length})`;
        btnVerLista.style.backgroundColor = "var(--blanco)";
        tituloSeccion.textContent = "Mi Lista Dominical";
        btnAgregar.style.display = 'none'; // Ocultar botón de añadir
        mostrarLista(listaDominical, true);
        
        if(listaDominical.length > 0 && btnExportarPDF) btnExportarPDF.style.display = 'inline-block';
        
    } else {
        btnVerLista.textContent = `Ver mi lista dominical (${listaDominical.length})`;
        btnVerLista.style.backgroundColor = "var(--dorado)";
        tituloSeccion.textContent = "Repertorio Disponible";
        btnAgregar.style.display = 'inline-block'; // Mostrar botón de añadir
        if (btnExportarPDF) btnExportarPDF.style.display = 'none';
        
        const textoBusqueda = document.getElementById('buscador').value.toLowerCase();
        const filtradas = inventarioCanciones.filter(c => c.titulo.toLowerCase().includes(textoBusqueda));
        mostrarLista(filtradas, false);
    }
    
    // Limpiar el visor derecho al cambiar de modo para evitar confusiones
    cancionActualId = null;
    document.getElementById('titulo-cancion').textContent = 'Selecciona una alabanza';
    document.getElementById('controles-tono').style.display = 'none';
    document.getElementById('letra-cancion').innerHTML = '';
});

// 7. PROGRAMACIÓN DEL BOTÓN DE EXPORTACIÓN A PDF
if (btnExportarPDF) {
    btnExportarPDF.addEventListener('click', () => {
        if (listaDominical.length === 0) return;

        const areaAnterior = document.getElementById('area-impresion-pdf');
        if (areaAnterior) areaAnterior.remove();

        const areaImpresion = document.createElement('div');
        areaImpresion.id = 'area-impresion-pdf';

        listaDominical.forEach(cancion => {
            const divCancion = document.createElement('div');
            divCancion.className = 'cancion-pdf';
            divCancion.innerHTML = `
                <h2>${cancion.titulo}</h2>
                <div class="tono-pdf">Tono para la alabanza: ${cancion.tono_original}</div>
                <pre>${procesarLetraYAcordes(cancion.letra)}</pre>
            `;
            areaImpresion.appendChild(divCancion);
        });

        document.body.appendChild(areaImpresion);

        // Retraso estratégico de 100ms para asegurar que el HTML se dibuje en pantalla
        setTimeout(() => {
            window.print();
        }, 100);
    });
}
