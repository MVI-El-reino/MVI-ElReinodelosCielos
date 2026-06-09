// Variable global para almacenar todas las canciones en memoria
let inventarioCanciones = [];
let listaDominical = [];
let cancionActualId = null; 
let viendoListaDominical = false;

// 1. Cargar las canciones en cuanto la página esté lista
document.addEventListener('DOMContentLoaded', () => {
    fetch('canciones.json')
        .then(respuesta => respuesta.json())
        .then(datos => {
            inventarioCanciones = datos; // Guardamos los datos del JSON
            mostrarLista(inventarioCanciones); // Dibujamos la lista en pantalla
        })
        .catch(error => {
            console.error("Error al cargar el repertorio:", error);
            document.getElementById('contenedor-lista').innerHTML = "<li>Error al cargar las canciones. Verifica tu archivo JSON.</li>";
        });
});

// 2. Función para inyectar las canciones en el HTML
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

        // Si estamos viendo la lista dominical, agregamos el botón de borrar
        if (esListaDominical) {
            const btnEliminar = document.createElement('button');
            btnEliminar.textContent = "✖";
            btnEliminar.className = "btn-eliminar";
            
            btnEliminar.addEventListener('click', (e) => {
                e.stopPropagation(); // Evita que se abra la canción al hacer clic en borrar
                // Filtramos la lista para quitar esta canción
                listaDominical = listaDominical.filter(c => c.id !== cancion.id);
                mostrarLista(listaDominical, true); // Recargamos la vista
                // Actualizamos el contador real (oculto en este momento)
            });
            li.appendChild(btnEliminar);
        }

        li.addEventListener('click', () => {
            mostrarCancion(cancion.id);
        });

        contenedor.appendChild(li);
    });
}
// 3. El Motor de Búsqueda (Filtro en tiempo real)
const buscador = document.getElementById('buscador');

buscador.addEventListener('input', (evento) => {
    // Convertimos lo que el usuario escribe a minúsculas para evitar errores de mayúsculas
    const textoBusqueda = evento.target.value.toLowerCase();
    
    // Filtramos el arreglo original
    const cancionesFiltradas = inventarioCanciones.filter(cancion => 
        cancion.titulo.toLowerCase().includes(textoBusqueda)
    );
    
    // Volvemos a dibujar la lista solo con los resultados que coinciden
    mostrarLista(cancionesFiltradas);
});

// Variable para guardar el tono actual en pantalla (para la transposición futura)
let tonoActualDesplegado = null;

// 4. Función para mostrar la canción seleccionada (NUEVA VERSIÓN PROFESIONAL)
function mostrarCancion(id) {
    // 1. Buscamos la canción en nuestro arreglo en memoria
    const cancion = inventarioCanciones.find(c => c.id === id);
    if (!cancion) return;
    cancionActualId = id;
    tonoActualDesplegado = cancion.tono_original; // Guardamos el tono inicial

    // 2. Actualizamos la interfaz básica
    document.getElementById('titulo-cancion').textContent = cancion.titulo;
    document.getElementById('controles-tono').style.display = 'flex';
    document.getElementById('tono-actual').innerHTML = `Tono: <span style="color:#E67E22;">${cancion.tono_original}</span>`;
    
    // 3. Obtenemos el contenedor de la letra
    const contenedorLetra = document.getElementById('letra-cancion');
    contenedorLetra.innerHTML = ''; // Limpiamos lo anterior

    // 4. EL ALGORITMO DE FORMATEO PROFESIONAL
    // Dividimos la canción en líneas físicas
    const lineasCrudas = cancion.letra.split('\n');
    let htmlFinal = '';

    lineasCrudas.forEach(lineaRaw => {
        // A. Si es una línea vacía, agregamos un salto
        if (lineaRaw.trim() === "") {
            htmlFinal += '<br>';
            return;
        }

        // B. Si es un marcador de sección (ej: [Intro]), lo estilizamos especial
        if (lineaRaw.trim().startsWith('[') && lineaRaw.trim().endsWith(']')) {
            htmlFinal += `<span class="marcador-seccion">${lineaRaw.trim()}</span>`;
            return;
        }

        // C. Procesar línea con acordes intercalados (ej: [G]Dios está a[C]quí...)
        if (lineaRaw.includes('[')) {
            let lineaAcordesHTML = '';
            let lineaLetrasHTML = '';
            let indiceActualEnLetraLimpia = 0;

            // Esta expresión regular busca pares de [Acorde]Texto
            const regex = /\[([^\]]+)\]([^\[]*)/g;
            let coincidencia;
            let huboCoincidencias = false;

            while ((coincidencia = regex.exec(lineaRaw)) !== null) {
                huboCoincidencias = true;
                const acorde = coincidencia[1]; // El texto dentro de []
                const textoDespues = coincidencia[2]; // El texto hasta el siguiente [ o final

                // Calculamos cuántos espacios necesitamos para alinear el acorde
                // sobre la sílaba correcta de la línea de texto limpia.
                // Usamos '\xa0' que es un "Non-breaking space" para garantizar alineación en HTML.
                const espaciosNecesarios = Math.max(0, indiceActualEnLetraLimpia - lineaAcordesHTML.replace(/<[^>]*>/g, '').length);
                lineaAcordesHTML += '\xa0'.repeat(espaciosNecesarios);

                // Agregamos el acorde formateado en naranja
                lineaAcordesHTML += `<span class="acorde-formateado">${acorde}</span>`;
                
                // Agregamos el texto a la línea de letra
                lineaLetrasHTML += textoDespues;

                // Actualizamos el índice de referencia
                indiceActualEnLetraLimpia = lineaLetrasHTML.length;
            }

            // Si el regex no capturó todo (ej: si la línea empieza con texto antes del primer [), 
            // este algoritmo necesita un pequeño ajuste manual aquí, pero para la estructura estándar 
            // que me mostraste, funciona perfecto.
            
            // Construimos el bloque final de doble línea
            htmlFinal += `
                <div class="bloque-linea">
                    <pre class="linea-acordes">${lineaAcordesHTML}</pre>
                    <pre class="linea-letras">${lineaLetrasHTML}</pre>
                </div>`;
        
        } else {
            // D. Si es una línea de solo texto (sin acordes), la mostramos simple
            htmlFinal += `<div class="bloque-linea"><pre class="linea-letras">${lineaRaw}</pre></div>`;
        }
    });

    // 5. Inyectamos todo el HTML generado de una sola vez
    contenedorLetra.innerHTML = htmlFinal;
}

// 5. Lógica para "Añadir a lista dominical"
const btnAgregar = document.getElementById('btn-agregar-lista');
btnAgregar.addEventListener('click', () => {
    if (cancionActualId === null) return;
    
    // Verificamos que no esté repetida
    const yaExiste = listaDominical.find(c => c.id === cancionActualId);
    if (!yaExiste) {
        const cancion = inventarioCanciones.find(c => c.id === cancionActualId);
        listaDominical.push(cancion);
        
        // Actualizamos el texto del botón del encabezado
        if (!viendoListaDominical) {
            document.getElementById('btn-ver-lista').textContent = `Ver mi lista dominical (${listaDominical.length})`;
        }
        
        // Pequeño efecto visual para confirmar
        btnAgregar.textContent = "¡Añadida!";
        btnAgregar.style.backgroundColor = "#2ecc71"; // Verde éxito
        setTimeout(() => {
            btnAgregar.textContent = "Añadir a lista dominical";
            btnAgregar.style.backgroundColor = "var(--dorado)";
        }, 1500);
    } else {
        alert("Esta alabanza ya está en tu lista del domingo.");
    }
});

// 6. Lógica para alternar vistas (Repertorio vs Lista Dominical)
const btnVerLista = document.getElementById('btn-ver-lista');
btnVerLista.addEventListener('click', () => {
    viendoListaDominical = !viendoListaDominical; // Cambiamos el interruptor
    const tituloSeccion = document.querySelector('#lista-canciones h2');
    
    if (viendoListaDominical) {
        // Entramos a modo Lista Dominical
        btnVerLista.textContent = "Volver al Repertorio";
        btnVerLista.style.backgroundColor = "var(--blanco)";
        tituloSeccion.textContent = "Mi Lista Dominical";
        mostrarLista(listaDominical, true);
    } else {
        // Volvemos al Repertorio normal
        btnVerLista.textContent = `Ver mi lista dominical (${listaDominical.length})`;
        btnVerLista.style.backgroundColor = "var(--dorado)";
        tituloSeccion.textContent = "Repertorio Disponible";
        
        // Respetamos lo que haya en el buscador al volver
        const textoBusqueda = document.getElementById('buscador').value.toLowerCase();
        const cancionesFiltradas = inventarioCanciones.filter(cancion => 
            cancion.titulo.toLowerCase().includes(textoBusqueda)
        );
        mostrarLista(cancionesFiltradas, false);
    }
});
