// ========================================
// DATOS DE PARTIDOS
// ========================================
// Aquí puedes agregar, editar o eliminar partidos fácilmente
// Solo modifica este arreglo para gestionar los partidos

// ========================================
// PARTIDOS - ARREGLO VACÍO
// ========================================
// IMPORTANTE: Los partidos ahora se gestionan en partidos.js
// Este arreglo se mantiene vacío por defecto
let partidos = [];

// ========================================
// VARIABLES GLOBALES
// ========================================
let currentView = 'home-view';
let videoPlayer = null;
let hls = null;
let currentCalendarDate = new Date();

// Nombres de días y meses en español
const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// ========================================
// INICIALIZACIÓN DE LA APP
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupNavigation();
    setupVideoModal();
    setupCalendarNavigation();
    setupNewsBanners();
    updateTodayDate();
    
    // Cargar partidos desde partidos.js
    if (typeof cargarPartidos === 'function') {
        cargarPartidos();
    }
    
    renderHomeMatches();
    renderAllMatches();
    renderCalendar();
    
    // Registrar Service Worker para PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(console.error);
    }
}

// ========================================
// NAVEGACIÓN
// ========================================
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetView = this.dataset.view;
            switchView(targetView);
            
            // Actualizar botón activo
            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function switchView(viewId) {
    // Ocultar todas las vistas
    const views = document.querySelectorAll('.view');
    views.forEach(view => view.classList.remove('active'));
    
    // Mostrar vista seleccionada
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
        currentView = viewId;
    }
}

// ========================================
// UTILIDADES PARA ESCUDOS
// ========================================
function createShieldElement(escudo, size = 'normal') {
    // Detectar si es una imagen (contiene .png, .jpg, etc.) o un emoji
    const isImage = escudo.includes('.png') || escudo.includes('.jpg') || escudo.includes('.jpeg') || escudo.includes('.gif') || escudo.includes('.svg');
    
    if (isImage) {
        return `<img src="${escudo}" alt="Escudo" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                <span class="shield-emoji" style="display:none;">⚽</span>`;
    } else {
        return `<span class="shield-emoji">${escudo}</span>`;
    }
}

// ========================================
// UTILIDADES DE FECHA
// ========================================
function updateTodayDate() {
    const today = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateString = today.toLocaleDateString('es-ES', options);
    
    const dateElement = document.getElementById('today-date');
    if (dateElement) {
        dateElement.textContent = dateString;
    }
}

function formatDate(dateString) {
    // Crear fecha local para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day); // month - 1 porque los meses van de 0-11
    
    const options = { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('es-ES', options);
}

function isToday(dateString) {
    const today = new Date();
    const [year, month, day] = dateString.split('-');
    const matchDate = new Date(year, month - 1, day);
    
    return today.getFullYear() === matchDate.getFullYear() &&
           today.getMonth() === matchDate.getMonth() &&
           today.getDate() === matchDate.getDate();
}

// ========================================
// RENDERIZADO DE PARTIDOS
// ========================================
function renderHomeMatches() {
    const container = document.getElementById('matches-container');
    
    // Obtener partidos de hoy y mañana solamente
    const today = new Date();
    const upcomingMatches = partidos.filter(partido => {
        const [year, month, day] = partido.fecha.split('-');
        const matchDate = new Date(year, month - 1, day);
        const diffTime = matchDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 1; // Solo hoy y mañana
    }).sort((a, b) => {
        const [yearA, monthA, dayA] = a.fecha.split('-');
        const [yearB, monthB, dayB] = b.fecha.split('-');
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateA - dateB;
    });
    
    if (upcomingMatches.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1 / -1; padding: 2rem;">
                <h3 style="color: #95a5a6; margin-bottom: 1rem;">No hay partidos próximos</h3>
                <p style="color: #7f8c8d;">Revisa el calendario para más partidos</p>
            </div>
        `;
        return;
    }
    
    // Agrupar por fecha y mostrar con encabezados
    const matchesByDate = {};
    upcomingMatches.forEach(partido => {
        if (!matchesByDate[partido.fecha]) {
            matchesByDate[partido.fecha] = [];
        }
        matchesByDate[partido.fecha].push(partido);
    });
    
    let htmlContent = '';
    Object.keys(matchesByDate).forEach(fecha => {
        const fechaFormateada = formatDate(fecha);
        const partidosDeLaFecha = matchesByDate[fecha];
        
        htmlContent += `
            <div class="date-group" style="grid-column: 1 / -1; margin: 1.5rem 0 1rem 0;">
                <h3 style="color: #3498db; font-size: 1.2rem; margin-bottom: 1rem; border-bottom: 2px solid #34495e; padding-bottom: 0.5rem;">
                    ${fechaFormateada}
                </h3>
            </div>
        `;
        
        partidosDeLaFecha.forEach(partido => {
            htmlContent += createMatchCard(partido);
        });
    });
    
    container.innerHTML = htmlContent;
    addMatchCardListeners();
}

function renderAllMatches() {
    const container = document.getElementById('all-matches-container');
    
    if (partidos.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1 / -1; padding: 2rem;">
                <h3 style="color: #95a5a6; margin-bottom: 1rem;">No hay partidos programados</h3>
                <p style="color: #7f8c8d;">Agrega partidos en el archivo partidos.js</p>
            </div>
        `;
        return;
    }
    
    // Agrupar partidos por fecha
    const partidosPorFecha = {};
    partidos.forEach(partido => {
        if (!partidosPorFecha[partido.fecha]) {
            partidosPorFecha[partido.fecha] = [];
        }
        partidosPorFecha[partido.fecha].push(partido);
    });
    
    // Ordenar fechas cronológicamente usando fechas locales
    const fechasOrdenadas = Object.keys(partidosPorFecha).sort((a, b) => {
        const [yearA, monthA, dayA] = a.split('-');
        const [yearB, monthB, dayB] = b.split('-');
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateA - dateB;
    });
    
    // Generar HTML agrupado por fecha
    let htmlContent = '';
    fechasOrdenadas.forEach(fecha => {
        const fechaFormateada = formatDate(fecha);
        const partidosDeLaFecha = partidosPorFecha[fecha];
        
        htmlContent += `
            <div class="date-group" style="grid-column: 1 / -1; margin: 2rem 0 1rem 0;">
                <h3 style="color: #3498db; font-size: 1.3rem; margin-bottom: 1rem; border-bottom: 2px solid #34495e; padding-bottom: 0.5rem;">
                    ${fechaFormateada}
                </h3>
            </div>
        `;
        
        partidosDeLaFecha.forEach(partido => {
            htmlContent += createMatchCard(partido);
        });
    });
    
    container.innerHTML = htmlContent;
    addMatchCardListeners();
}

function createMatchCard(partido) {
    const isAvailable = partido.link !== null;
    const statusText = isAvailable ? 'Disponible' : 'No disponible';
    const statusClass = isAvailable ? '' : 'unavailable';
    
    return `
        <div class="match-card ${statusClass}" data-match-id="${partido.id}">
            <div class="match-teams">
                <div class="team">
                    <div class="team-logo">${createShieldElement(partido.escudoLocal)}</div>
                    <div class="team-name">${partido.local}</div>
                </div>
                <div class="vs">VS</div>
                <div class="team">
                    <div class="team-logo">${createShieldElement(partido.escudoVisita)}</div>
                    <div class="team-name">${partido.visita}</div>
                </div>
            </div>
            <div class="match-info">
                <div class="match-time">${partido.hora}</div>
                <div class="match-status ${statusClass}">${statusText}</div>
            </div>
        </div>
    `;
}

function addMatchCardListeners() {
    const matchCards = document.querySelectorAll('.match-card');
    
    matchCards.forEach(card => {
        card.addEventListener('click', function() {
            const matchId = parseInt(this.dataset.matchId);
            const partido = partidos.find(p => p.id === matchId);
            
            if (partido && partido.link) {
                openVideoPlayer(partido);
            } else {
                showNotAvailableMessage();
            }
        });
    });
}

function showNotAvailableMessage() {
    alert('Este partido aún no está disponible para transmisión.');
}

// ========================================
// CALENDARIO
// ========================================
function setupCalendarNavigation() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    
    prevBtn.addEventListener('click', () => {
        // Establecer día 1 para evitar problemas con meses de diferentes días
        currentCalendarDate.setDate(1);
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextBtn.addEventListener('click', () => {
        // Establecer día 1 para evitar problemas con meses de diferentes días
        currentCalendarDate.setDate(1);
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
}

function renderCalendar() {
    const container = document.getElementById('calendar-grid');
    const monthTitle = document.getElementById('current-month');
    
    // Actualizar título del mes
    const monthName = monthNames[currentCalendarDate.getMonth()];
    const year = currentCalendarDate.getFullYear();
    monthTitle.textContent = `${monthName} ${year}`;
    
    // Obtener información del mes
    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
    const lastDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Empezar desde domingo
    
    // Agrupar partidos por fecha
    const matchesByDate = {};
    partidos.forEach(partido => {
        if (!matchesByDate[partido.fecha]) {
            matchesByDate[partido.fecha] = [];
        }
        matchesByDate[partido.fecha].push(partido);
    });
    
    // Crear encabezados de días
    let calendarHTML = dayNames.map(day => 
        `<div class="calendar-header">${day}</div>`
    ).join('');
    
    // Generar días del calendario (solo días del mes actual)
    const today = new Date();
    const todayString = formatDateForComparison(today);
    
    // Calcular cuántos días mostrar (solo hasta completar la última semana del mes)
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay();
    const totalDaysToShow = Math.ceil((daysInMonth + firstDayOfWeek) / 7) * 7;
    
    for (let i = 0; i < totalDaysToShow; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const dateString = formatDateForComparison(currentDate);
        const dayNumber = currentDate.getDate();
        const isCurrentMonth = currentDate.getMonth() === currentCalendarDate.getMonth();
        const isToday = dateString === todayString;
        const dayMatches = matchesByDate[dateString] || [];
        
        // Solo mostrar días del mes actual
        if (!isCurrentMonth) continue;
        
        let dayClasses = ['calendar-day'];
        if (isToday) dayClasses.push('today');
        if (dayMatches.length > 0) dayClasses.push('has-matches');
        
        const matchesHTML = dayMatches.map(partido => {
            const isAvailable = partido.link !== null;
            const availableClass = isAvailable ? 'match-available' : 'match-unavailable';
            
            return `
                <div class="match-shields ${availableClass}" data-match-id="${partido.id}">
                    ${createShieldElement(partido.escudoLocal, 'small')}
                    ${createShieldElement(partido.escudoVisita, 'small')}
                </div>
            `;
        }).join('');
        
        const timeHTML = dayMatches.length > 0 ? 
            `<div class="match-time-small">${dayMatches[0].hora}</div>` : '';
        
        calendarHTML += `
            <div class="${dayClasses.join(' ')}" data-date="${dateString}">
                <div class="day-number">${dayNumber}</div>
                <div class="day-matches">
                    ${matchesHTML}
                </div>
                ${timeHTML}
            </div>
        `;
    }
    
    container.innerHTML = calendarHTML;
    addCalendarListeners();
}

function formatDateForComparison(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addCalendarListeners() {
    const matchShields = document.querySelectorAll('.match-shields');
    const calendarDays = document.querySelectorAll('.calendar-day');
    
    // Listeners para los escudos de partidos
    matchShields.forEach(shield => {
        shield.addEventListener('click', function(e) {
            e.stopPropagation();
            const matchId = parseInt(this.dataset.matchId);
            const partido = partidos.find(p => p.id === matchId);
            
            if (partido && partido.link) {
                openVideoPlayer(partido);
            } else {
                showNotAvailableMessage();
            }
        });
    });
    
    // Listeners para días con partidos
    calendarDays.forEach(day => {
        day.addEventListener('click', function() {
            const dateString = this.dataset.date;
            const dayMatches = partidos.filter(p => p.fecha === dateString);
            
            if (dayMatches.length > 0) {
                showDayMatches(dayMatches, dateString);
            }
        });
    });
}

function showDayMatches(matches, dateString) {
    const date = new Date(dateString);
    const formattedDate = formatDate(dateString);
    
    let message = `Partidos del ${formattedDate}:\n\n`;
    matches.forEach(partido => {
        const status = partido.link ? '✅ Disponible' : '❌ No disponible';
        message += `${partido.hora} - ${partido.local} vs ${partido.visita} ${status}\n`;
    });
    
    alert(message);
}

// ========================================
// BANNERS DE NOTICIAS
// ========================================
let currentBannerIndex = 0;
let bannerInterval = null;
let touchStartX = 0;
let touchEndX = 0;

function setupNewsBanners() {
    const bannerDots = document.querySelectorAll('.banner-dot');
    const bannerSlides = document.querySelectorAll('.banner-slide');
    const bannerContainer = document.querySelector('.banner-container');
    
    if (bannerDots.length === 0 || bannerSlides.length === 0) return;
    
    // Configurar eventos de los indicadores
    bannerDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showBanner(index);
            resetBannerInterval();
        });
    });
    
    // Configurar eventos táctiles para deslizamiento
    if (bannerContainer) {
        bannerContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
        bannerContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        // Pausar rotación al hacer hover o touch
        bannerContainer.addEventListener('mouseenter', () => {
            clearInterval(bannerInterval);
        });
        
        bannerContainer.addEventListener('mouseleave', () => {
            startBannerRotation();
        });
        
        bannerContainer.addEventListener('touchstart', () => {
            clearInterval(bannerInterval);
        });
        
        bannerContainer.addEventListener('touchend', () => {
            setTimeout(() => startBannerRotation(), 1000);
        });
    }
    
    // Hacer clickeable el banner del fixture (banner 2)
    const fixtureBanner = document.querySelector('.banner-slide[data-banner="2"]');
    if (fixtureBanner) {
        fixtureBanner.style.cursor = 'pointer';
        fixtureBanner.addEventListener('click', () => {
            switchView('matches-view');
            // Actualizar navegación activa
            const navButtons = document.querySelectorAll('.nav-btn');
            navButtons.forEach(btn => btn.classList.remove('active'));
            const matchesBtn = document.querySelector('.nav-btn[data-view="matches-view"]');
            if (matchesBtn) matchesBtn.classList.add('active');
        });
    }
    
    // Iniciar rotación automática
    startBannerRotation();
}

function showBanner(index) {
    const bannerSlides = document.querySelectorAll('.banner-slide');
    const bannerDots = document.querySelectorAll('.banner-dot');
    
    // Remover clase active de todos los elementos
    bannerSlides.forEach(slide => slide.classList.remove('active'));
    bannerDots.forEach(dot => dot.classList.remove('active'));
    
    // Agregar clase active al elemento seleccionado
    if (bannerSlides[index]) {
        bannerSlides[index].classList.add('active');
    }
    if (bannerDots[index]) {
        bannerDots[index].classList.add('active');
    }
    
    currentBannerIndex = index;
}

function nextBanner() {
    const bannerSlides = document.querySelectorAll('.banner-slide');
    const nextIndex = (currentBannerIndex + 1) % bannerSlides.length;
    showBanner(nextIndex);
}

function startBannerRotation() {
    bannerInterval = setInterval(nextBanner, 4000); // Cambiar cada 4 segundos
}

function resetBannerInterval() {
    clearInterval(bannerInterval);
    startBannerRotation();
}

function handleTouchStart(event) {
    touchStartX = event.changedTouches[0].screenX;
}

function handleTouchEnd(event) {
    touchEndX = event.changedTouches[0].screenX;
    handleSwipeGesture();
}

function handleSwipeGesture() {
    const swipeThreshold = 50; // Mínimo de píxeles para considerar un swipe
    const swipeDistance = touchEndX - touchStartX;
    
    if (Math.abs(swipeDistance) > swipeThreshold) {
        if (swipeDistance > 0) {
            // Swipe hacia la derecha - ir al banner anterior
            previousBanner();
        } else {
            // Swipe hacia la izquierda - ir al siguiente banner
            nextBanner();
        }
        resetBannerInterval();
    }
}

function previousBanner() {
    const bannerSlides = document.querySelectorAll('.banner-slide');
    const prevIndex = currentBannerIndex === 0 ? bannerSlides.length - 1 : currentBannerIndex - 1;
    showBanner(prevIndex);
}

// ========================================
// REPRODUCTOR DE VIDEO
// ========================================
function setupVideoModal() {
    const modal = document.getElementById('video-modal');
    const closeBtn = document.getElementById('close-video');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    videoPlayer = document.getElementById('video-player');
    
    // Cerrar modal
    closeBtn.addEventListener('click', closeVideoPlayer);
    
    // Cerrar al hacer clic fuera del contenido
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeVideoPlayer();
        }
    });
    
    // Pantalla completa
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // Tecla ESC para cerrar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeVideoPlayer();
        }
    });
}

function openVideoPlayer(partido) {
    const modal = document.getElementById('video-modal');
    const title = document.getElementById('match-title');
    
    // Actualizar título
    title.textContent = `${partido.local} vs ${partido.visita}`;
    
    // Mostrar modal
    modal.classList.add('active');
    
    // Cargar video
    loadHLSStream(partido.link);
    
    // En móvil, sugerir pantalla completa
    if (isMobile()) {
        setTimeout(() => {
            if (confirm('¿Deseas ver el partido en pantalla completa?')) {
                toggleFullscreen();
            }
        }, 1000);
    }
}

function closeVideoPlayer() {
    const modal = document.getElementById('video-modal');
    
    // Ocultar modal
    modal.classList.remove('active');
    
    // Detener video
    if (videoPlayer) {
        videoPlayer.pause();
        videoPlayer.src = '';
    }
    
    // Limpiar HLS
    if (hls) {
        hls.destroy();
        hls = null;
    }
    
    // Salir de pantalla completa si está activa
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
}

function loadHLSStream(streamUrl) {
    if (!streamUrl) return;
    
    if (Hls.isSupported()) {
        // Usar HLS.js para navegadores que no soportan HLS nativamente
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
        });
        
        hls.loadSource(streamUrl);
        hls.attachMedia(videoPlayer);
        
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            console.log('Stream cargado correctamente');
        });
        
        hls.on(Hls.Events.ERROR, function(event, data) {
            console.error('Error en HLS:', data);
            if (data.fatal) {
                showStreamError();
            }
        });
        
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari soporta HLS nativamente
        videoPlayer.src = streamUrl;
    } else {
        showStreamError();
    }
}

function showStreamError() {
    alert('Error al cargar la transmisión. Verifica tu conexión a internet e inténtalo nuevamente.');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        // Entrar en pantalla completa
        const videoContainer = document.querySelector('.video-modal-content');
        if (videoContainer.requestFullscreen) {
            videoContainer.requestFullscreen();
        } else if (videoContainer.webkitRequestFullscreen) {
            videoContainer.webkitRequestFullscreen();
        } else if (videoContainer.msRequestFullscreen) {
            videoContainer.msRequestFullscreen();
        }
    } else {
        // Salir de pantalla completa
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// ========================================
// UTILIDADES
// ========================================
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ========================================
// FUNCIONES PARA GESTIONAR PARTIDOS
// ========================================
// IMPORTANTE: Solo necesitas modificar el arreglo 'partidos' al inicio del archivo
// Todas las vistas (Home, Partidos, Calendario) se actualizan automáticamente

// Función para refrescar todas las vistas después de cambios
function actualizarTodasLasVistas() {
    renderHomeMatches();
    renderAllMatches();
    renderCalendar();
    console.log('✅ Todas las vistas actualizadas automáticamente');
}

// Función para agregar un nuevo partido (opcional - puedes usar la consola)
function agregarPartido(local, visita, hora, fecha, escudoLocal, escudoVisita, link = null) {
    const nuevoPartido = {
        id: Math.max(...partidos.map(p => p.id), 0) + 1, // ID único automático
        local: local,
        visita: visita,
        hora: hora,
        fecha: fecha,
        escudoLocal: escudoLocal,
        escudoVisita: escudoVisita,
        link: link
    };
    
    partidos.push(nuevoPartido);
    actualizarTodasLasVistas(); // Actualiza automáticamente Home, Partidos y Calendario
    
    console.log('🆕 Partido agregado y visible en todas las vistas:', nuevoPartido);
    return nuevoPartido;
}

// Función para eliminar un partido
function eliminarPartido(id) {
    const index = partidos.findIndex(p => p.id === id);
    if (index !== -1) {
        const partidoEliminado = partidos.splice(index, 1)[0];
        actualizarTodasLasVistas(); // Actualiza automáticamente todas las vistas
        
        console.log('🗑️ Partido eliminado de todas las vistas:', partidoEliminado);
        return partidoEliminado;
    } else {
        console.log('❌ Partido no encontrado con ID:', id);
        return null;
    }
}

// Función para actualizar el link de transmisión de un partido
function actualizarLinkPartido(id, nuevoLink) {
    const partido = partidos.find(p => p.id === id);
    if (partido) {
        partido.link = nuevoLink;
        actualizarTodasLasVistas(); // Actualiza automáticamente todas las vistas
        
        console.log('🔗 Link actualizado en todas las vistas para:', partido);
        return partido;
    } else {
        console.log('❌ Partido no encontrado con ID:', id);
        return null;
    }
}

// Función para editar cualquier campo de un partido
function editarPartido(id, cambios) {
    const partido = partidos.find(p => p.id === id);
    if (partido) {
        Object.assign(partido, cambios); // Aplica los cambios
        actualizarTodasLasVistas(); // Actualiza automáticamente todas las vistas
        
        console.log('✏️ Partido editado en todas las vistas:', partido);
        return partido;
    } else {
        console.log('❌ Partido no encontrado con ID:', id);
        return null;
    }
}

// ========================================
// EJEMPLOS DE USO - UNA SOLA FUENTE DE DATOS
// ========================================
/*
🎯 IMPORTANTE: Solo necesitas modificar el arreglo 'partidos' al inicio del archivo
   Automáticamente aparecerá en Home, Partidos y Calendario - ¡Sin trabajo doble!

📝 MÉTODO 1: Editar directamente el arreglo 'partidos' (línea 7)
   Agrega un nuevo objeto al arreglo y recarga la página.

📝 MÉTODO 2: Usar funciones desde la consola del navegador:

// Agregar nuevo partido (aparece automáticamente en todas las vistas)
agregarPartido(
    "Coquimbo Unido", 
    "Santiago Wanderers", 
    "21:00", 
    "2026-02-01", 
    "img/coquimbo.png",  // o "🟡" si no tienes imagen
    "img/wanderers.png", // o "🟢" si no tienes imagen
    "https://ejemplo.com/stream.m3u8"
);

// Eliminar partido (se quita de todas las vistas automáticamente)
eliminarPartido(1);

// Actualizar link (se actualiza en todas las vistas automáticamente)
actualizarLinkPartido(1, "https://nuevo-link.com/stream.m3u8");

// Editar cualquier campo de un partido
editarPartido(1, {
    hora: "19:30",
    fecha: "2026-02-02",
    link: "https://nuevo-stream.m3u8"
});

// Ver todos los partidos
console.log(partidos);

// Refrescar todas las vistas manualmente (si es necesario)
actualizarTodasLasVistas();

✅ Ventaja: Un solo cambio actualiza Home, Partidos y Calendario automáticamente
*/
