// ============================================
// DG Pádel - Panel de Jugadores
// Consumo de datos desde Google Sheets
// ============================================

// IDs del Google Sheet
const SPREADSHEET_ID = '1Mfpa-3du50zEmSV5Czxt-NPkkDl1tr3VGaD-TDlc5ew';

// URLs de exportación CSV desde Google Sheets
const URLS = {
    alumnos: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=1118366765`,
    alumnosDetalle: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=1494529409`,
    alumnosClases: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=1065416735`
};

// Variables globales
let alumnosData = {};
let alumnosDetalleData = {};
let alumnosClasesData = {};
let graficoRadar = null; // Para almacenar la instancia del gráfico ApexCharts
let graficoTecnico = null;

// ============================================
// FUNCIONES PARA PARSEAR CSV
// ============================================

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const obj = {};
        const values = parseCSVLine(lines[i]);
        
        headers.forEach((header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
        });
        
        data.push(obj);
    }
    
    return { headers, data };
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

// ============================================
// CARGAR DATOS DESDE GOOGLE SHEETS
// ============================================

async function cargarDatos() {
    try {
        console.log('Cargando datos del Google Sheet...');
        
        // Cargar hoja Alumnos
        const respAlumnos = await fetch(URLS.alumnos);
        const csvAlumnos = await respAlumnos.text();
        const parsedAlumnos = parseCSV(csvAlumnos);
        alumnosData = parsedAlumnos.data;
        console.log('✓ Alumnos cargados:', alumnosData.length);
        
        // Cargar hoja Alumnos-detalle
        const respDetalle = await fetch(URLS.alumnosDetalle);
        const csvDetalle = await respDetalle.text();
        const parsedDetalle = parseCSV(csvDetalle);
        alumnosDetalleData = parsedDetalle.data;
        console.log('✓ Alumnos-detalle cargados:', alumnosDetalleData.length);
        
        // Cargar hoja Alumnos-clases
        const respClases = await fetch(URLS.alumnosClases);
        const csvClases = await respClases.text();
        const parsedClases = parseCSV(csvClases);
        alumnosClasesData = parsedClases.data;
        console.log('✓ Alumnos-clases cargados:', alumnosClasesData.length);
        
        // Inicializar UI
        inicializarDropdown();
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        mostrarError('Error al cargar los datos del Google Sheet');
    }
}

// ============================================
// INICIALIZAR DROPDOWN
// ============================================

function inicializarDropdown() {
    const playerSelect = document.getElementById('playerSelect');
    
    if (!playerSelect) {
        console.error('Elemento playerSelect no encontrado');
        return;
    }
    
    // Limpiar opciones existentes (excepto la primera)
    while (playerSelect.options.length > 1) {
        playerSelect.remove(1);
    }
    
    // Agregar opciones de alumnos
    alumnosData.forEach((alumno) => {
        const nombre = alumno['Alumno'] || alumno['alumno'];
        if (nombre && nombre.trim() !== '') {
            const option = document.createElement('option');
            option.value = nombre;
            option.textContent = nombre;
            playerSelect.appendChild(option);
        }
    });
    
    console.log(`✓ ${playerSelect.options.length - 1} jugadores agregados al dropdown`);
}

// ============================================
// MANEJAR SELECCIÓN DE JUGADOR
// ============================================

function manejarSeleccionJugador(e) {
    const playerSelect = document.getElementById('playerSelect');
    const playerContent = document.getElementById('playerContent');
    const emptyState = document.getElementById('emptyState');
    
    if (playerSelect.value === '') {
        playerContent.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    const nombre = playerSelect.value;
    const alumno = alumnosData.find(a => (a['Alumno'] || a['alumno']) === nombre);
    
    if (alumno) {
        mostrarDatosJugador(alumno);
        playerContent.classList.remove('hidden');
        emptyState.classList.add('hidden');
    }
}

// ============================================
// MOSTRAR DATOS DEL JUGADOR
// ============================================

function mostrarDatosJugador(alumno) {
    // 1. Extraer datos
    const nombreAlumno = alumno['Alumno'] || alumno['alumno'] || '';
    const posicion = alumno['Posición Cancha'] || alumno['posición cancha'] || 'N/A';
    const manoHabil = alumno['Mano hábil'] || alumno['mano hábil'] || 'N/A';
    const nivelPromedio = parseFloat(alumno['General'] || alumno['general'] || 0).toFixed(1);
    
    // 2. Contar clases (LO MOVEMOS AQUÍ ARRIBA)
    const clasesAlumno = alumnosClasesData.filter(clase => 
        (clase['Alumno'] || clase['alumno']) === nombreAlumno
    );
    const cantidadClases = clasesAlumno.length;
    
    // 3. Actualizar el nombre principal
    const playerNameEl = document.getElementById('playerName');
    if (playerNameEl) {
        playerNameEl.textContent = nombreAlumno;
    }
    
    // 4. Actualizar stats box (AGREGAMOS EL CAJÓN DE CLASES AQUÍ)
    const statsBox = document.querySelector('.stats-box');
    if (statsBox) {
        statsBox.innerHTML = `
            <div class="stat-box-item">
                <div class="stat-box-label">Nombre</div>
                <div class="stat-box-value">${nombreAlumno}</div>
            </div>
            <div class="stat-box-item">
                <div class="stat-box-label">Posición</div>
                <div class="stat-box-value">${posicion}</div>
            </div>
            <div class="stat-box-item">
                <div class="stat-box-label">Mano Hábil</div>
                <div class="stat-box-value">${manoHabil}</div>
            </div>
            <div class="stat-box-item">
                <div class="stat-box-label">Nivel Promedio</div>
                <div class="stat-box-value">${nivelPromedio}</div>
            </div>
            <div class="stat-box-item">
                <div class="stat-box-label">Clases Realizadas</div>
                <div class="stat-box-value">${cantidadClases}</div>
            </div>
        `;
    }
    
    // 5. Actualizar gráficos
    actualizarGraficoRadar(alumno, nombreAlumno);
    actualizarGraficoBarras(nombreAlumno);
    actualizarHistorialClases(nombreAlumno);
}

// ============================================
// GRÁFICO RADAR CON APEXCHARTS
// ============================================

function actualizarGraficoRadar(alumno, nombreAlumno) {
    const defensa = parseFloat(alumno['Defensa'] || 0);
    const ataque = parseFloat(alumno['Ataque'] || 0);
    const transicion = parseFloat(alumno['Transición'] || 0);
    const tomaDecisiones = parseFloat(alumno['Toma de decisiones'] || 0);
    const mentalidad = parseFloat(alumno['Mentalidad'] || 0);
    
    // Configurar categorías (ejes del radar)
    const categorias = [
        'Ataque',
        'Defensa',
        'Transición',
        'Toma de decisiones',
        'Mentalidad'
    ];
    
    const series = [{
        name: nombreAlumno,
        data: [ataque, defensa, transicion, tomaDecisiones, mentalidad]
    }];
    
    // Opciones del gráfico con colores DG Pádel
    const options = {
        chart: {
            type: 'radar',
            fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
            toolbar: {
                show: false
            }
        },
        xaxis: {
            categories: categorias,
            labels: {
                style: {
                    fontSize: '13px',
                    fontWeight: 600,
                    colors: ['#d1d5db', '#d1d5db', '#d1d5db', '#d1d5db', '#d1d5db']
                }
            }
        },
        yaxis: {
            show: false
        },
        fill: {
            opacity: 0.35,
            colors: ['#8B0000'] // Rojo DG Pádel
        },
        plotOptions: {
            radar: {
                polygons: {
                    // Color de los anillos/pentágonos (Ej: un gris oscuro)
                    strokeColors: '#444444', 
                    // Color de las líneas que van desde el centro a las puntas
                    connectorColors: '#444444', 
                    fill: {
                    colors: ['transparent']
                    }
                }
            }
        },
        colors: ['#8B0000'], // Rojo DG Pádel
        tooltip: {
            enabled: true,
            theme: 'dark',
            style: {
                fontSize: '12px'
            },
            onDatasetHover: {
                highlightDataSeries: false
            }
        },
        markers: {
            size: 5,
            colors: ['#8B0000'],
            strokeColors: '#ffffff',
            strokeWidth: 2
        },
        legend: {
            show: false
        }
    };
    
    // Destruir gráfico anterior si existe
    if (graficoRadar) {
        graficoRadar.destroy();
    }
    
    // Crear nuevo gráfico
    graficoRadar = new ApexCharts(
        document.getElementById('graficoRadar'),
        {
            series: series,
            ...options
        }
    );
    
    graficoRadar.render();
    console.log(`✓ Gráfico radar de ApexCharts actualizado para: ${nombreAlumno}`);
}

// ============================================
// GRÁFICO BARRAS HORIZONTAL
// ============================================

function actualizarGraficoBarras(nombreAlumno) {

    const detalle = alumnosDetalleData.find(d =>
        (d['Alumno'] || d['alumno']) === nombreAlumno
    );

    if (!detalle) {
        console.warn(`No hay datos de detalle para ${nombreAlumno}`);
        return;
    }

    const habilidades = [];
    const valores = [];
    const colores = [];

    Object.entries(detalle).forEach(([key, value]) => {

        if (
            key.toLowerCase() !== 'alumno' &&
            key.trim() !== ''
        ) {

            const valor = parseFloat(value);

            if (!isNaN(valor) && valor >= 0 && valor <= 100) {

                habilidades.push(key);
                valores.push(valor);

                if (valor >= 90) {
                    colores.push('#22c55e');
                }
                else if (valor >= 70) {
                    colores.push('#b30000');
                }
                else if (valor >= 40) {
                    colores.push('#9ca3af');
                }
                else {
                    colores.push('#4b5563');
                }
            }
        }
    });

    if (graficoTecnico) {
        graficoTecnico.destroy();
    }

    const options = {
        chart: {
            type: 'bar',
            height: 650,
            toolbar: {
                show: false
            },
            background: 'transparent'
        },

        series: [{
            data: valores
        }],

        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 3,
                distributed: true,
                barHeight: '45%',
                dataLabels: {
                    position: 'top'
                }
            }
        },

        colors: colores,

        dataLabels: {
            enabled: true,
            offsetX: 25,
            formatter: function(val) {
                return val.toFixed(1);
            },
            style: {
                colors: ['#ffffff'],
                fontWeight: 600,
                fontSize: '12px'
            }
        },

        xaxis: {
            categories: habilidades,
            min: 0,
            max: 100,
            tickAmount: 5,
            labels: {
                style: {
                    colors: '#9ca3af'
                }
            }
        },

        yaxis: {
            labels: {
                style: {
                    colors: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 500
                }
            }
        },

        grid: {
            padding: {
                right: 50
            },
            borderColor: '#374151'
        },

        tooltip: {
            theme: 'dark'
        },

        legend: {
            show: false
        }
    };

    graficoTecnico = new ApexCharts(
        document.querySelector("#graficoTecnico"),
        options
    );

    graficoTecnico.render();
    console.log(`✓ Gráfico barras de ApexCharts actualizado para: ${nombreAlumno}`);
}

function getColorByValue(valor) {
    if (valor >= 90) return '#22c55e';      // Verde - Experto
    if (valor >= 70) return '#8B0000';      // Rojo oscuro - Avanzado
    if (valor >= 40) return '#6B7280';      // Gris - Intermedio
    return '#374151';                      // Gris oscuro - Inicial
}

// ============================================
// HISTORIAL DE CLASES
// ============================================

function actualizarHistorialClases(nombreAlumno) {
    const clasesAlumno = alumnosClasesData.filter(clase => 
        (clase['Alumno'] || clase['alumno']) === nombreAlumno
    );
    
    const classList = document.querySelector('.classes-list');
    if (!classList) return;
    
    classList.innerHTML = '';
    
    if (clasesAlumno.length === 0) {
        classList.innerHTML = `
            <p style="text-align: center; color: #9ca3af; padding: 2rem;">
                No hay clases registradas aún.
            </p>
        `;
        return;
    }
    
    clasesAlumno.forEach((clase) => {
        const tipoClase = clase['Tema'] || clase['tema'] || 'Clase';
        const fecha = clase['Fecha'] || clase['fecha'] || 'N/A';
        const duracion = clase['Duración'] || clase['duracion'] || '60';
        const notas = clase['Notas'] || clase['notas'] || '';
        
        const classItem = document.createElement('div');
        classItem.className = 'class-item';
        
        classItem.innerHTML = `
            <div class="class-info">
                <h4 class="class-type">${tipoClase}</h4>
                <div class="class-details">
                    <span>📅 ${formatearFecha(fecha)}</span>
                    <span>⏱️ ${duracion} minutos</span>
                </div>
            </div>
            ${notas ? `<div class="class-notes">${notas}</div>` : ''}
        `;
        
        classList.appendChild(classItem);
    });
}

function formatearFecha(fechaStr) {
    try {
        // Si viene en formato DD/MM/YYYY o similar
        const date = new Date(fechaStr);
        if (isNaN(date.getTime())) {
            return fechaStr; // Retornar como está si no es válido
        }
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return fechaStr;
    }
}

// ============================================
// MOSTRAR ERRORES
// ============================================

function mostrarError(mensaje) {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
        emptyState.innerHTML = `
            <div class="empty-state-icon">⚠️</div>
            <h3 class="empty-state-title">Error</h3>
            <p class="empty-state-text">${mensaje}</p>
        `;
    }
}

// ============================================
// INICIALIZAR CUANDO CARGA EL DOM
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando Panel de Jugadores...');
    
    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
        });
    }
    
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileMenu) mobileMenu.classList.remove('active');
        });
    });
    
    // Player selection
    const playerSelect = document.getElementById('playerSelect');
    if (playerSelect) {
        playerSelect.addEventListener('change', manejarSeleccionJugador);
    }
    
    // Cargar datos
    cargarDatos();
    
    // Auto-update year
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});