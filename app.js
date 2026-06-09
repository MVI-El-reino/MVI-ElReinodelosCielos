// Variable global para almacenar todas las canciones en memoria
let inventarioCanciones = [];

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
function mostrarLista(canciones) {
    const contenedor = document.getElementById('contenedor-lista');
    contenedor.innerHTML = ''; // Limpiamos el texto de "Cargando canciones..."

    if (canciones.length === 0) {
        contenedor.innerHTML = '<li>No se encontraron alabanzas.</li>';
        return;
    }

    // Recorremos el arreglo y creamos un elemento <li> por cada canción
    canciones.forEach(cancion => {
        const li = document.createElement('li');
        li.textContent = cancion.titulo;
        li.style.cursor = 'pointer'; // Cambia el cursor para indicar que es un botón
        
        // Guardamos el ID oculto en el HTML para usarlo después
        li.dataset.id = cancion.id; 

        // Preparamos el evento de clic (lo conectaremos en el siguiente paso)
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
