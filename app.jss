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

// 4. Función para mostrar la canción seleccionada
function mostrarCancion(id) {
    // Buscamos la canción en nuestro arreglo en memoria
    const cancion = inventarioCanciones.find(c => c.id === id);
    
    if (cancion) {
        // Cambiamos el título en pantalla
        document.getElementById('titulo-cancion').textContent = cancion.titulo;
        
        // Mostramos el menú de botones de tono (que estaba oculto)
        document.getElementById('controles-tono').style.display = 'block';
        document.getElementById('tono-actual').textContent = 'Tono original: ' + cancion.tono_original;
        
        // Inyectamos la letra en el recuadro
        document.getElementById('letra-cancion').textContent = cancion.letra;
    }
}
