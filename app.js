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
    
    // Mostrar información de conexión si es móvil
    const connectionInfo = getConnectionInfo();
    if (connectionInfo.isMobile) {
        showConnectionStatus(connectionInfo);
    }
    
    // Cargar video
    loadHLSStream(partido.link);
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
    
    // Detectar tipo de conexión
    const connectionInfo = getConnectionInfo();
    console.log('Información de conexión:', connectionInfo);
    
    // Configurar video player para móviles antes de cargar stream
    if (connectionInfo.isMobile) {
        setupMobileVideoPlayer();
    }
    
    // Para redes móviles, usar enfoque completamente diferente
    if (connectionInfo.isMobile && connectionInfo.isMobileNetwork) {
        console.log('📱 Detectada red móvil - usando estrategia específica');
        loadMobileNetworkStream(streamUrl, connectionInfo);
        return;
    }
    
    if (Hls.isSupported()) {
        // Configuración ultra-agresiva para redes móviles
        const hlsConfig = {
            enableWorker: false, // Desactivar worker en móviles para mejor compatibilidad
            lowLatencyMode: false,
            // Buffer extremadamente conservador para móviles
            maxBufferLength: connectionInfo.isMobile ? 5 : 30,
            maxMaxBufferLength: connectionInfo.isMobile ? 10 : 60,
            maxBufferSize: connectionInfo.isMobile ? 30 * 1000 * 1000 : 120 * 1000 * 1000, // 30MB vs 120MB
            maxBufferHole: connectionInfo.isMobile ? 0.2 : 0.5,
            highBufferWatchdogPeriod: connectionInfo.isMobile ? 1 : 2,
            nudgeOffset: connectionInfo.isMobile ? 0.05 : 0.1,
            nudgeMaxRetry: connectionInfo.isMobile ? 5 : 3,
            maxFragLookUpTolerance: connectionInfo.isMobile ? 0.1 : 0.25,
            liveSyncDurationCount: connectionInfo.isMobile ? 1 : 3,
            liveMaxLatencyDurationCount: connectionInfo.isMobile ? 3 : 10,
            // ABR ultra-conservador para móviles
            abrEwmaFastLive: connectionInfo.isMobile ? 1.5 : 3.0,
            abrEwmaSlowLive: connectionInfo.isMobile ? 5.0 : 9.0,
            abrEwmaFastVoD: connectionInfo.isMobile ? 1.5 : 3.0,
            abrEwmaSlowVoD: connectionInfo.isMobile ? 5.0 : 9.0,
            abrEwmaDefaultEstimate: connectionInfo.isMobile ? 200000 : 1000000, // 200kbps vs 1Mbps inicial
            abrBandWidthFactor: connectionInfo.isMobile ? 0.5 : 0.95,
            abrBandWidthUpFactor: connectionInfo.isMobile ? 0.4 : 0.7,
            abrMaxWithRealBitrate: connectionInfo.isMobile,
            // Timeouts muy largos para redes móviles inestables
            fragLoadingTimeOut: connectionInfo.isMobile ? 45000 : 20000, // 45s vs 20s
            fragLoadingMaxRetry: connectionInfo.isMobile ? 8 : 3,
            fragLoadingRetryDelay: connectionInfo.isMobile ? 3000 : 1000,
            fragLoadingMaxRetryTimeout: connectionInfo.isMobile ? 120000 : 32000, // 2 minutos vs 32s
            // Manifiestos con timeouts extendidos
            manifestLoadingTimeOut: connectionInfo.isMobile ? 30000 : 10000,
            manifestLoadingMaxRetry: connectionInfo.isMobile ? 6 : 2,
            manifestLoadingRetryDelay: connectionInfo.isMobile ? 3000 : 1000,
            manifestLoadingMaxRetryTimeout: connectionInfo.isMobile ? 60000 : 16000,
            // Configuración de nivel inicial muy conservadora
            startLevel: connectionInfo.isMobile ? 0 : -1, // Siempre empezar en calidad más baja en móviles
            testBandwidth: connectionInfo.isMobile,
            progressive: true,
            capLevelToPlayerSize: connectionInfo.isMobile, // Limitar calidad al tamaño del player en móviles
            // Headers y configuración de red específica para móviles
            xhrSetup: function(xhr, url) {
                // Headers para mejorar compatibilidad con redes móviles
                xhr.setRequestHeader('Cache-Control', 'no-cache');
                xhr.setRequestHeader('Pragma', 'no-cache');
                xhr.setRequestHeader('Accept', '*/*');
                xhr.setRequestHeader('Accept-Encoding', 'identity'); // Evitar compresión en móviles
                xhr.setRequestHeader('Connection', 'keep-alive');
                
                if (connectionInfo.isMobile) {
                    xhr.timeout = 45000; // 45 segundos timeout para móviles
                    // Configurar para manejar redirects
                    xhr.withCredentials = false;
                }
                
                // Log para debug
                console.log('🌐 Cargando:', url);
            },
            // Configuración adicional para móviles
            backBufferLength: connectionInfo.isMobile ? 5 : 30,
            maxSeekHole: connectionInfo.isMobile ? 0.5 : 2,
            seekHoleNudgeDuration: connectionInfo.isMobile ? 0.01 : 0.1,
            stalledInBufferedNudgeSize: connectionInfo.isMobile ? 0.01 : 0.1,
            maxStarvationDelay: connectionInfo.isMobile ? 1 : 4,
            maxLoadingDelay: connectionInfo.isMobile ? 1 : 4
        };
        
        hls = new Hls(hlsConfig);
        
        // Configurar eventos específicos para redes móviles
        setupMobileHLSEvents(hls, connectionInfo);
        
        // Cargar stream con manejo de errores mejorado
        try {
            hls.loadSource(streamUrl);
            hls.attachMedia(videoPlayer);
        } catch (error) {
            console.error('❌ Error al cargar HLS:', error);
            // Intentar con configuración de fallback
            setTimeout(() => {
                tryFallbackStreaming(streamUrl, connectionInfo);
            }, 2000);
        }
        
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari soporta HLS nativamente - configurar para móviles
        console.log('🍎 Usando HLS nativo de Safari');
        videoPlayer.src = streamUrl;
        setupNativeHLSForMobile(videoPlayer, connectionInfo);
    } else {
        // Fallback para navegadores sin soporte HLS
        tryFallbackStreaming(streamUrl, connectionInfo);
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

// Función para detectar información de conexión
function getConnectionInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isMobileDevice = isMobile();
    
    let connectionInfo = {
        isMobile: isMobileDevice,
        effectiveType: '4g', // Por defecto
        downlink: 10, // Por defecto 10 Mbps
        rtt: 100, // Por defecto 100ms
        saveData: false
    };
    
    if (connection) {
        connectionInfo.effectiveType = connection.effectiveType || '4g';
        connectionInfo.downlink = connection.downlink || 10;
        connectionInfo.rtt = connection.rtt || 100;
        connectionInfo.saveData = connection.saveData || false;
    }
    
    // Detectar si está usando datos móviles (heurística más agresiva)
    if (isMobileDevice) {
        // Asumir que es red móvil por defecto en dispositivos móviles
        connectionInfo.isMobileNetwork = true;
        
        // Solo considerar WiFi si la velocidad es muy alta
        if (connectionInfo.effectiveType === '4g' && connectionInfo.downlink > 15) {
            connectionInfo.isMobileNetwork = false; // Probablemente WiFi
        }
        
        // Detectar operadores móviles por IP (heurística adicional)
        connectionInfo.likelyMobileCarrier = detectMobileCarrier();
    } else {
        connectionInfo.isMobileNetwork = false;
    }
    
    return connectionInfo;
}

// Detectar operador móvil (heurística básica)
function detectMobileCarrier() {
    // Esta es una heurística básica - en producción se podría usar una API
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('movistar') || userAgent.includes('telefonica')) return 'movistar';
    if (userAgent.includes('claro')) return 'claro';
    if (userAgent.includes('entel')) return 'entel';
    if (userAgent.includes('wom')) return 'wom';
    return 'unknown';
}

// Configurar eventos HLS específicos para redes móviles
function setupMobileHLSEvents(hls, connectionInfo) {
    let retryCount = 0;
    let maxRetries = connectionInfo.isMobile ? 5 : 3;
    
    hls.on(Hls.Events.MANIFEST_PARSED, function() {
        console.log('✅ Stream cargado correctamente');
        retryCount = 0; // Resetear contador de reintentos
        
        // En redes móviles, comenzar con calidad más baja
        if (connectionInfo.isMobile && connectionInfo.effectiveType === '2g') {
            hls.startLevel = 0; // Calidad más baja
        }
    });
    
    hls.on(Hls.Events.ERROR, function(event, data) {
        console.error('❌ Error en HLS:', data);
        
        if (data.fatal) {
            switch(data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    console.log('🔄 Error de red, intentando recuperar...');
                    handleNetworkError(hls, data, retryCount, maxRetries, connectionInfo);
                    retryCount++;
                    break;
                    
                case Hls.ErrorTypes.MEDIA_ERROR:
                    console.log('🔄 Error de media, intentando recuperar...');
                    try {
                        hls.recoverMediaError();
                    } catch (err) {
                        console.error('❌ No se pudo recuperar del error de media:', err);
                        showMobileStreamError(connectionInfo);
                    }
                    break;
                    
                default:
                    console.error('❌ Error fatal no recuperable:', data);
                    showMobileStreamError(connectionInfo);
                    break;
            }
        } else {
            // Errores no fatales - solo registrar
            console.warn('⚠️ Error no fatal en HLS:', data);
        }
    });
    
    // Eventos específicos para monitoreo de calidad en móviles
    hls.on(Hls.Events.LEVEL_SWITCHED, function(event, data) {
        console.log(`📊 Calidad cambiada a nivel ${data.level}`);
        
        // En redes móviles lentas, evitar subir demasiado rápido
        if (connectionInfo.isMobile && connectionInfo.effectiveType === '2g') {
            if (data.level > 1) {
                console.log('📉 Forzando calidad baja para red 2G');
                hls.nextLevel = 0;
            }
        }
    });
    
    hls.on(Hls.Events.BUFFER_STALLED, function() {
        console.warn('⏸️ Buffer detenido - ajustando para red móvil');
        if (connectionInfo.isMobile) {
            // Reducir calidad si el buffer se detiene frecuentemente
            hls.nextLevel = Math.max(0, hls.currentLevel - 1);
        }
    });
    
    hls.on(Hls.Events.FRAG_LOAD_PROGRESS, function(event, data) {
        // Monitorear progreso de carga en redes móviles
        if (connectionInfo.isMobile && data.stats && data.stats.loading) {
            const loadTime = data.stats.loading.end - data.stats.loading.start;
            if (loadTime > 10000) { // Más de 10 segundos
                console.warn('🐌 Carga lenta detectada, ajustando calidad');
                hls.nextLevel = Math.max(0, hls.currentLevel - 1);
            }
        }
    });
}

// Manejar errores de red con reintentos inteligentes
function handleNetworkError(hls, data, retryCount, maxRetries, connectionInfo) {
    if (retryCount < maxRetries) {
        const delay = connectionInfo.isMobile ? 
            Math.min(2000 * Math.pow(2, retryCount), 10000) : // Backoff exponencial para móviles
            1000 * (retryCount + 1); // Backoff lineal para desktop
        
        console.log(`🔄 Reintentando en ${delay}ms (intento ${retryCount + 1}/${maxRetries})`);
        
        setTimeout(() => {
            try {
                hls.startLoad();
            } catch (err) {
                console.error('❌ Error al reintentar:', err);
                if (retryCount >= maxRetries - 1) {
                    showMobileStreamError(connectionInfo);
                }
            }
        }, delay);
    } else {
        console.error('❌ Máximo de reintentos alcanzado');
        showMobileStreamError(connectionInfo);
    }
}

// Configurar HLS nativo para Safari en móviles
function setupNativeHLSForMobile(videoElement, connectionInfo) {
    videoElement.addEventListener('error', function(e) {
        console.error('❌ Error en video nativo:', e);
        showMobileStreamError(connectionInfo);
    });
    
    videoElement.addEventListener('stalled', function() {
        console.warn('⏸️ Video detenido en Safari móvil');
        if (connectionInfo.isMobile) {
            // Intentar recargar después de un breve delay
            setTimeout(() => {
                if (videoElement.readyState < 3) { // HAVE_FUTURE_DATA
                    videoElement.load();
                }
            }, 3000);
        }
    });
    
    videoElement.addEventListener('waiting', function() {
        console.log('⏳ Esperando datos en Safari móvil');
    });
    
    videoElement.addEventListener('canplay', function() {
        console.log('✅ Video listo para reproducir en Safari móvil');
    });
}

// Configurar video player específicamente para móviles
function setupMobileVideoPlayer() {
    if (!videoPlayer) return;
    
    console.log('📱 Configurando video player para móvil');
    
    // Configuraciones específicas para móviles
    videoPlayer.setAttribute('playsinline', 'true'); // Evitar fullscreen automático en iOS
    videoPlayer.setAttribute('webkit-playsinline', 'true');
    videoPlayer.setAttribute('x5-video-player-type', 'h5'); // Para navegadores chinos
    videoPlayer.setAttribute('x5-video-player-fullscreen', 'true');
    videoPlayer.setAttribute('x5-video-orientation', 'landscape'); // Forzar landscape
    videoPlayer.muted = false; // Asegurar que no esté muted
    videoPlayer.controls = true; // Mostrar controles nativos
    videoPlayer.preload = 'none'; // No precargar en móviles para ahorrar datos
    
    // Forzar orientación landscape cuando se reproduce
    videoPlayer.addEventListener('play', function() {
        console.log('🔄 Video iniciado - forzando orientación landscape');
        forceLandscapeOrientation();
        
        // Auto fullscreen después de un breve delay
        setTimeout(() => {
            if (isMobile() && !document.fullscreenElement) {
                console.log('📱 Activando fullscreen automático para móvil');
                enterMobileFullscreen();
            }
        }, 1000);
    });
    
    // Manejar eventos específicos de móviles
    videoPlayer.addEventListener('loadstart', function() {
        console.log('📱 Iniciando carga de video en móvil');
        showMobileLoadingIndicator();
    });
    
    videoPlayer.addEventListener('canplay', function() {
        console.log('✅ Video listo para reproducir en móvil');
        hideMobileLoadingIndicator();
    });
    
    videoPlayer.addEventListener('waiting', function() {
        console.log('⏳ Video esperando datos en móvil');
        showMobileBufferingIndicator();
    });
    
    videoPlayer.addEventListener('playing', function() {
        console.log('▶️ Video reproduciéndose en móvil');
        hideMobileBufferingIndicator();
    });
    
    videoPlayer.addEventListener('stalled', function() {
        console.warn('⏸️ Video detenido en móvil - intentando recuperar');
        handleMobileStall();
    });
}

// Forzar orientación landscape en móviles
function forceLandscapeOrientation() {
    if (!isMobile()) return;
    
    try {
        // Intentar usar Screen Orientation API
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').then(() => {
                console.log('🔄 Orientación landscape activada');
            }).catch(err => {
                console.warn('⚠️ No se pudo forzar orientación:', err);
            });
        }
        
        // Fallback: CSS para forzar landscape
        const style = document.createElement('style');
        style.textContent = `
            @media screen and (orientation: portrait) {
                .video-modal-content {
                    transform: rotate(90deg);
                    transform-origin: center center;
                    width: 100vh !important;
                    height: 100vw !important;
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                }
            }
        `;
        document.head.appendChild(style);
        
    } catch (error) {
        console.warn('⚠️ Error al forzar orientación:', error);
    }
}

// Entrar en fullscreen específico para móviles
function enterMobileFullscreen() {
    const videoContainer = document.querySelector('.video-modal-content');
    
    try {
        // Intentar fullscreen del contenedor de video
        if (videoContainer.requestFullscreen) {
            videoContainer.requestFullscreen();
        } else if (videoContainer.webkitRequestFullscreen) {
            videoContainer.webkitRequestFullscreen();
        } else if (videoContainer.mozRequestFullScreen) {
            videoContainer.mozRequestFullScreen();
        } else if (videoContainer.msRequestFullscreen) {
            videoContainer.msRequestFullscreen();
        } else if (videoPlayer.webkitEnterFullscreen) {
            // Fallback para iOS Safari
            videoPlayer.webkitEnterFullscreen();
        }
        
        console.log('📱 Fullscreen activado para móvil');
        
    } catch (error) {
        console.warn('⚠️ Error al activar fullscreen:', error);
        // Fallback: CSS fullscreen
        videoContainer.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 99999 !important;
            background: black !important;
        `;
    }
}

// Cargar stream específicamente para redes móviles
function loadMobileNetworkStream(streamUrl, connectionInfo) {
    console.log('📱 Iniciando carga específica para red móvil');
    console.log('🔗 URL:', streamUrl);
    console.log('📊 Conexión:', connectionInfo);
    
    // Mostrar indicador de carga específico para móviles
    showMobileLoadingIndicator();
    
    // Estrategia 1: Intentar HLS nativo primero (más compatible con móviles)
    if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('🍎 Intentando HLS nativo para red móvil');
        loadNativeHLSForMobile(streamUrl, connectionInfo);
        return;
    }
    
    // Estrategia 2: HLS.js con configuración ultra-conservadora
    if (Hls.isSupported()) {
        console.log('📱 Usando HLS.js ultra-conservador para red móvil');
        loadHLSForMobileNetwork(streamUrl, connectionInfo);
        return;
    }
    
    // Estrategia 3: Fallback directo
    console.log('🔄 Usando fallback directo para red móvil');
    tryDirectMobileStreaming(streamUrl, connectionInfo);
}

// HLS nativo optimizado para redes móviles
function loadNativeHLSForMobile(streamUrl, connectionInfo) {
    try {
        // Configurar video para móviles antes de cargar
        videoPlayer.crossOrigin = 'anonymous';
        videoPlayer.preload = 'none';
        videoPlayer.setAttribute('playsinline', 'true');
        
        // Configurar eventos específicos para móviles
        let loadTimeout;
        let retryCount = 0;
        const maxRetries = 5;
        
        const attemptLoad = () => {
            console.log(`📱 Intento ${retryCount + 1}/${maxRetries} - Cargando HLS nativo`);
            
            videoPlayer.src = streamUrl;
            videoPlayer.load();
            
            // Timeout más largo para redes móviles
            loadTimeout = setTimeout(() => {
                console.warn('⏰ Timeout en carga HLS nativo');
                if (retryCount < maxRetries - 1) {
                    retryCount++;
                    setTimeout(attemptLoad, 2000 * retryCount); // Backoff progresivo
                } else {
                    console.error('❌ Máximo de reintentos alcanzado en HLS nativo');
                    // Intentar con HLS.js como fallback
                    if (Hls.isSupported()) {
                        loadHLSForMobileNetwork(streamUrl, connectionInfo);
                    } else {
                        tryDirectMobileStreaming(streamUrl, connectionInfo);
                    }
                }
            }, 15000); // 15 segundos timeout
        };
        
        // Eventos de éxito
        videoPlayer.addEventListener('loadstart', function() {
            console.log('📱 HLS nativo iniciado');
            clearTimeout(loadTimeout);
        }, { once: true });
        
        videoPlayer.addEventListener('canplay', function() {
            console.log('✅ HLS nativo listo para reproducir');
            hideMobileLoadingIndicator();
            retryCount = 0;
        }, { once: true });
        
        // Eventos de error
        videoPlayer.addEventListener('error', function(e) {
            console.error('❌ Error en HLS nativo:', e);
            clearTimeout(loadTimeout);
            
            if (retryCount < maxRetries - 1) {
                retryCount++;
                console.log(`🔄 Reintentando HLS nativo en ${2000 * retryCount}ms`);
                setTimeout(attemptLoad, 2000 * retryCount);
            } else {
                console.log('🔄 Cambiando a HLS.js para red móvil');
                if (Hls.isSupported()) {
                    loadHLSForMobileNetwork(streamUrl, connectionInfo);
                } else {
                    tryDirectMobileStreaming(streamUrl, connectionInfo);
                }
            }
        }, { once: true });
        
        // Iniciar primer intento
        attemptLoad();
        
    } catch (error) {
        console.error('❌ Error al configurar HLS nativo para móvil:', error);
        if (Hls.isSupported()) {
            loadHLSForMobileNetwork(streamUrl, connectionInfo);
        } else {
            tryDirectMobileStreaming(streamUrl, connectionInfo);
        }
    }
}

// HLS.js específico para redes móviles
function loadHLSForMobileNetwork(streamUrl, connectionInfo) {
    try {
        // Configuración extremadamente conservadora para redes móviles
        const mobileHLSConfig = {
            enableWorker: false,
            lowLatencyMode: false,
            debug: true, // Habilitar debug para móviles
            
            // Buffer ultra-pequeño
            maxBufferLength: 3,
            maxMaxBufferLength: 5,
            maxBufferSize: 10 * 1000 * 1000, // 10MB máximo
            maxBufferHole: 0.1,
            
            // Timeouts muy largos
            fragLoadingTimeOut: 60000, // 1 minuto
            fragLoadingMaxRetry: 10,
            fragLoadingRetryDelay: 5000, // 5 segundos entre reintentos
            fragLoadingMaxRetryTimeout: 300000, // 5 minutos máximo
            
            manifestLoadingTimeOut: 45000,
            manifestLoadingMaxRetry: 8,
            manifestLoadingRetryDelay: 5000,
            manifestLoadingMaxRetryTimeout: 180000, // 3 minutos
            
            // Calidad mínima siempre
            startLevel: 0,
            capLevelToPlayerSize: true,
            
            // ABR ultra-conservador
            abrEwmaDefaultEstimate: 100000, // 100kbps inicial
            abrBandWidthFactor: 0.3,
            abrBandWidthUpFactor: 0.2,
            
            // Headers específicos para móviles
            xhrSetup: function(xhr, url) {
                console.log('🌐 Configurando request para móvil:', url);
                
                // Headers básicos
                xhr.setRequestHeader('User-Agent', navigator.userAgent);
                xhr.setRequestHeader('Accept', '*/*');
                xhr.setRequestHeader('Cache-Control', 'no-cache');
                xhr.setRequestHeader('Pragma', 'no-cache');
                
                // Timeout muy largo para móviles
                xhr.timeout = 60000;
                
                // Configurar para manejar redirects
                xhr.withCredentials = false;
                
                // Log detallado
                xhr.addEventListener('loadstart', () => console.log('📱 Iniciando carga:', url));
                xhr.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        console.log(`📊 Progreso: ${Math.round(e.loaded/e.total*100)}%`);
                    }
                });
                xhr.addEventListener('load', () => console.log('✅ Carga completada:', url));
                xhr.addEventListener('error', (e) => console.error('❌ Error en carga:', url, e));
                xhr.addEventListener('timeout', () => console.warn('⏰ Timeout en carga:', url));
            }
        };
        
        hls = new Hls(mobileHLSConfig);
        
        // Eventos específicos para redes móviles
        setupMobileNetworkHLSEvents(hls, connectionInfo);
        
        // Cargar con manejo de errores
        hls.loadSource(streamUrl);
        hls.attachMedia(videoPlayer);
        
    } catch (error) {
        console.error('❌ Error al configurar HLS.js para móvil:', error);
        tryDirectMobileStreaming(streamUrl, connectionInfo);
    }
}

// Streaming directo para móviles (último recurso)
function tryDirectMobileStreaming(streamUrl, connectionInfo) {
    console.log('🔄 Intentando streaming directo para red móvil');
    
    try {
        // Configurar video para streaming directo
        videoPlayer.crossOrigin = 'anonymous';
        videoPlayer.preload = 'none';
        videoPlayer.src = streamUrl;
        
        let loadAttempts = 0;
        const maxAttempts = 3;
        
        const attemptDirectLoad = () => {
            loadAttempts++;
            console.log(`📱 Intento directo ${loadAttempts}/${maxAttempts}`);
            
            videoPlayer.load();
            
            const loadTimeout = setTimeout(() => {
                console.warn('⏰ Timeout en streaming directo');
                if (loadAttempts < maxAttempts) {
                    setTimeout(attemptDirectLoad, 5000);
                } else {
                    // Último recurso: intentar con diferentes proxies
                    tryProxyStreaming(streamUrl, connectionInfo);
                }
            }, 30000);
            
            videoPlayer.addEventListener('canplay', function() {
                console.log('✅ Streaming directo exitoso');
                clearTimeout(loadTimeout);
                hideMobileLoadingIndicator();
            }, { once: true });
            
            videoPlayer.addEventListener('error', function(e) {
                console.error('❌ Error en streaming directo:', e);
                clearTimeout(loadTimeout);
                if (loadAttempts < maxAttempts) {
                    setTimeout(attemptDirectLoad, 5000);
                } else {
                    tryProxyStreaming(streamUrl, connectionInfo);
                }
            }, { once: true });
        };
        
        attemptDirectLoad();
        
    } catch (error) {
        console.error('❌ Error en streaming directo:', error);
        tryProxyStreaming(streamUrl, connectionInfo);
    }
}

// Intentar con proxies (último recurso)
function tryProxyStreaming(streamUrl, connectionInfo) {
    console.log('🔄 Intentando con proxies para red móvil');
    
    const proxies = [
        '', // Sin proxy (intento directo)
        'https://cors-anywhere.herokuapp.com/',
        'https://api.allorigins.win/raw?url=',
        'https://thingproxy.freeboard.io/fetch/'
    ];
    
    let proxyIndex = 0;
    
    const tryNextProxy = () => {
        if (proxyIndex >= proxies.length) {
            console.error('❌ Todos los proxies fallaron');
            hideMobileLoadingIndicator();
            showMobileStreamError(connectionInfo);
            return;
        }
        
        const proxy = proxies[proxyIndex];
        const proxyUrl = proxy + encodeURIComponent(streamUrl);
        
        console.log(`🔄 Intentando proxy ${proxyIndex + 1}/${proxies.length}:`, proxy || 'directo');
        
        videoPlayer.src = proxyUrl;
        videoPlayer.load();
        
        const timeout = setTimeout(() => {
            console.warn(`⏰ Timeout en proxy ${proxyIndex + 1}`);
            proxyIndex++;
            tryNextProxy();
        }, 20000);
        
        videoPlayer.addEventListener('canplay', function() {
            console.log(`✅ Proxy ${proxyIndex + 1} exitoso`);
            clearTimeout(timeout);
            hideMobileLoadingIndicator();
        }, { once: true });
        
        videoPlayer.addEventListener('error', function(e) {
            console.error(`❌ Error en proxy ${proxyIndex + 1}:`, e);
            clearTimeout(timeout);
            proxyIndex++;
            tryNextProxy();
        }, { once: true });
    };
    
    tryNextProxy();
}

// Eventos HLS específicos para redes móviles
function setupMobileNetworkHLSEvents(hls, connectionInfo) {
    let networkRetries = 0;
    const maxNetworkRetries = 8;
    
    hls.on(Hls.Events.MANIFEST_PARSED, function() {
        console.log('✅ Manifest parseado en red móvil');
        hideMobileLoadingIndicator();
        networkRetries = 0;
        
        // Forzar calidad mínima
        hls.startLevel = 0;
        hls.nextLevel = 0;
    });
    
    hls.on(Hls.Events.ERROR, function(event, data) {
        console.error('❌ Error HLS en red móvil:', data);
        
        if (data.fatal) {
            switch(data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    console.log('🔄 Error de red en móvil, reintentando...');
                    if (networkRetries < maxNetworkRetries) {
                        networkRetries++;
                        const delay = Math.min(5000 * networkRetries, 30000); // Hasta 30s
                        console.log(`⏳ Reintentando en ${delay}ms (${networkRetries}/${maxNetworkRetries})`);
                        setTimeout(() => {
                            try {
                                hls.startLoad();
                            } catch (err) {
                                console.error('❌ Error al reintentar:', err);
                                tryDirectMobileStreaming(hls.url, connectionInfo);
                            }
                        }, delay);
                    } else {
                        console.log('🔄 Máximo de reintentos de red alcanzado, cambiando a directo');
                        tryDirectMobileStreaming(hls.url, connectionInfo);
                    }
                    break;
                    
                case Hls.ErrorTypes.MEDIA_ERROR:
                    console.log('🔄 Error de media en móvil, recuperando...');
                    try {
                        hls.recoverMediaError();
                    } catch (err) {
                        console.error('❌ No se pudo recuperar error de media:', err);
                        tryDirectMobileStreaming(hls.url, connectionInfo);
                    }
                    break;
                    
                default:
                    console.error('❌ Error fatal no recuperable en móvil');
                    tryDirectMobileStreaming(hls.url, connectionInfo);
                    break;
            }
        }
    });
    
    // Monitoreo específico para móviles
    hls.on(Hls.Events.FRAG_LOADING, function(event, data) {
        console.log('📱 Cargando fragmento:', data.frag.url);
    });
    
    hls.on(Hls.Events.FRAG_LOADED, function(event, data) {
        console.log('✅ Fragmento cargado:', data.stats.total, 'bytes');
    });
    
    hls.on(Hls.Events.FRAG_LOAD_ERROR, function(event, data) {
        console.error('❌ Error cargando fragmento:', data);
    });
}

// Intentar streaming de fallback para móviles
function tryFallbackStreaming(streamUrl, connectionInfo) {
    console.log('🔄 Intentando streaming de fallback para móvil');
    
    if (!connectionInfo.isMobile) {
        showStreamError();
        return;
    }
    
    // Para móviles, usar la estrategia específica de red móvil
    loadMobileNetworkStream(streamUrl, connectionInfo);
}

// Manejar cuando el video se detiene en móviles
function handleMobileStall() {
    if (!hls || !isMobile()) return;
    
    console.log('🔄 Manejando stall en móvil');
    
    // Reducir calidad agresivamente
    if (hls.currentLevel > 0) {
        hls.nextLevel = 0;
        console.log('📉 Reduciendo a calidad mínima por stall');
    }
    
    // Intentar recuperar después de un delay
    setTimeout(() => {
        try {
            if (videoPlayer.readyState < 3) { // HAVE_FUTURE_DATA
                console.log('🔄 Intentando recuperar de stall');
                hls.startLoad();
            }
        } catch (error) {
            console.error('❌ Error al recuperar de stall:', error);
        }
    }, 3000);
}

// Mostrar indicador de carga para móviles
function showMobileLoadingIndicator() {
    let indicator = document.getElementById('mobile-loading');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'mobile-loading';
        indicator.innerHTML = '⏳ Cargando stream...';
        indicator.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-size: 14px;
        `;
        document.querySelector('.video-modal-content').appendChild(indicator);
    }
    indicator.style.display = 'block';
}

// Ocultar indicador de carga
function hideMobileLoadingIndicator() {
    const indicator = document.getElementById('mobile-loading');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Mostrar indicador de buffering
function showMobileBufferingIndicator() {
    let indicator = document.getElementById('mobile-buffering');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'mobile-buffering';
        indicator.innerHTML = '⏸️ Cargando...';
        indicator.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 5px;
            z-index: 1000;
            font-size: 12px;
        `;
        document.querySelector('.video-modal-content').appendChild(indicator);
    }
    indicator.style.display = 'block';
}

// Ocultar indicador de buffering
function hideMobileBufferingIndicator() {
    const indicator = document.getElementById('mobile-buffering');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Mostrar error específico para redes móviles
function showMobileStreamError(connectionInfo) {
    let message = 'Error al cargar la transmisión.';
    
    if (connectionInfo.isMobile) {
        if (connectionInfo.effectiveType === '2g') {
            message += '\n\n📶 Red 2G detectada: La transmisión puede ser inestable. Intenta conectarte a WiFi para mejor experiencia.';
        } else if (connectionInfo.effectiveType === '3g') {
            message += '\n\n📶 Red 3G detectada: Puede haber interrupciones. WiFi recomendado para mejor calidad.';
        } else if (connectionInfo.isMobileNetwork) {
            message += '\n\n📱 Red móvil detectada: Si tienes problemas, intenta conectarte a WiFi.';
        }
        
        message += '\n\n🔄 Consejos:\n• Verifica tu señal móvil\n• Cierra otras apps que usen internet\n• Intenta recargar la página\n• Rota el teléfono a horizontal';
    } else {
        message += '\n\nVerifica tu conexión a internet e inténtalo nuevamente.';
    }
    
    alert(message);
}

// Mostrar estado de conexión para usuarios móviles
function showConnectionStatus(connectionInfo) {
    // Crear o actualizar el indicador de conexión
    let statusElement = document.getElementById('connection-status');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'connection-status';
        statusElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            z-index: 10001;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(statusElement);
    }
    
    let statusIcon = '';
    let statusText = '';
    let statusColor = '';
    
    if (connectionInfo.effectiveType === '2g') {
        statusIcon = '📶';
        statusText = '2G - Calidad baja';
        statusColor = '#e74c3c';
    } else if (connectionInfo.effectiveType === '3g') {
        statusIcon = '📶';
        statusText = '3G - Calidad media';
        statusColor = '#f39c12';
    } else if (connectionInfo.effectiveType === '4g') {
        if (connectionInfo.downlink < 5) {
            statusIcon = '📱';
            statusText = '4G lento - Datos móviles';
            statusColor = '#f39c12';
        } else {
            statusIcon = '📶';
            statusText = '4G - Buena conexión';
            statusColor = '#27ae60';
        }
    } else {
        statusIcon = '🌐';
        statusText = 'WiFi - Óptima';
        statusColor = '#27ae60';
    }
    
    statusElement.innerHTML = `${statusIcon} ${statusText}`;
    statusElement.style.backgroundColor = statusColor;
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        if (statusElement) {
            statusElement.style.opacity = '0.6';
            statusElement.style.transform = 'scale(0.9)';
        }
    }, 5000);
    
    // Ocultar completamente después de 10 segundos
    setTimeout(() => {
        if (statusElement && statusElement.parentNode) {
            statusElement.parentNode.removeChild(statusElement);
        }
    }, 10000);
}

// Monitorear cambios de conexión en tiempo real
function startConnectionMonitoring() {
    if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        connection.addEventListener('change', function() {
            const newConnectionInfo = getConnectionInfo();
            console.log('🔄 Conexión cambió:', newConnectionInfo);
            
            // Si hay un video reproduciéndose y es móvil, ajustar configuración
            if (hls && newConnectionInfo.isMobile) {
                adjustStreamingForConnection(newConnectionInfo);
            }
            
            // Mostrar nuevo estado si el modal de video está abierto
            const modal = document.getElementById('video-modal');
            if (modal && modal.classList.contains('active')) {
                showConnectionStatus(newConnectionInfo);
            }
        });
    }
}

// Ajustar streaming según cambios de conexión
function adjustStreamingForConnection(connectionInfo) {
    if (!hls) return;
    
    console.log('🔧 Ajustando streaming para nueva conexión:', connectionInfo);
    
    // Ajustar nivel de calidad según el tipo de conexión
    if (connectionInfo.effectiveType === '2g') {
        hls.nextLevel = 0; // Forzar calidad más baja
        console.log('📉 Forzando calidad baja para 2G');
    } else if (connectionInfo.effectiveType === '3g') {
        hls.nextLevel = Math.min(1, hls.levels.length - 1); // Calidad media-baja
        console.log('📊 Ajustando a calidad media para 3G');
    } else if (connectionInfo.effectiveType === '4g' && connectionInfo.downlink < 5) {
        hls.nextLevel = Math.min(2, hls.levels.length - 1); // Calidad media
        console.log('📊 Ajustando a calidad media para 4G lento');
    }
    // Para 4G rápido o WiFi, dejar que HLS.js maneje automáticamente
}

// Inicializar monitoreo de conexión al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    startConnectionMonitoring();
});

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
