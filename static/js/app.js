/* -------------------------------------------------------------
 * BigQuery Release Notes Tracker - Client Script
 * ------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const statusTag = document.getElementById('status-tag');
    const statusText = document.getElementById('status-text');
    const searchInput = document.getElementById('search-input');
    const feedLoading = document.getElementById('feed-loading');
    const feedContainer = document.getElementById('feed-container');
    const emptyDetailState = document.getElementById('empty-detail-state');
    const detailCard = document.getElementById('detail-card');
    const detailDate = document.getElementById('detail-date');
    const detailBadge = document.getElementById('detail-badge');
    const detailLink = document.getElementById('detail-link');
    const detailBody = document.getElementById('detail-body');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const tweetBtn = document.getElementById('tweet-btn');
    const toastContainer = document.getElementById('toast-container');

    // Nuevos Elementos
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const closeDetailBtn = document.getElementById('close-detail-btn');
    const resetDraftBtn = document.getElementById('reset-draft-btn');
    const emptySearchState = document.getElementById('empty-search-state');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    // Global state
    let releaseData = null;
    let selectedItem = null;
    let defaultDraft = '';

    // Initial Fetch
    initializeTheme();
    loadReleases();

    // Event Listeners
    refreshBtn.addEventListener('click', () => loadReleases(true));
    searchInput.addEventListener('input', handleSearch);
    tweetTextarea.addEventListener('input', updateCharCount);
    tweetBtn.addEventListener('click', publishTweet);
    themeToggle.addEventListener('click', toggleTheme);
    exportCsvBtn.addEventListener('click', exportToCSV);
    closeDetailBtn.addEventListener('click', closeMobileDetail);
    resetDraftBtn.addEventListener('click', resetDraftTweet);
    clearSearchBtn.addEventListener('click', clearSearch);

    /* -------------------------------------------------------------
     * API Fetching
     * ------------------------------------------------------------- */
    async function loadReleases(forceRefresh = false) {
        setLoadingState(true);
        const endpoint = forceRefresh ? '/api/releases/refresh' : '/api/releases';

        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`Error de red: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            releaseData = data.releases;
            renderFeed(releaseData);
            
            // Update last updated info
            const updateTime = new Date(data.updated_at * 1000);
            const timeString = updateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            if (data.stale) {
                setStatus('Desconectado (Usando caché)', 'error');
                showToast('No se pudieron obtener datos nuevos. Cargando datos desde la caché.', 'error');
            } else {
                setStatus(`Actualizado: ${timeString}`, 'success');
                if (forceRefresh) {
                    showToast('¡Notas de versión actualizadas con éxito!', 'success');
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
            setStatus('Error al actualizar', 'error');
            showToast(`Error: ${error.message}. Por favor, inténtalo de nuevo.`, 'error');
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshBtn.disabled = true;
            refreshIcon.classList.add('spinning');
            feedLoading.classList.remove('hidden');
            feedContainer.classList.add('hidden');
            setStatus('Cargando...', 'loading');
        } else {
            refreshBtn.disabled = false;
            refreshIcon.classList.remove('spinning');
            feedLoading.classList.add('hidden');
            feedContainer.classList.remove('hidden');
        }
    }

    function setStatus(text, type) {
        statusText.textContent = text;
        statusTag.className = 'status-tag'; // Reset
        if (type === 'loading') {
            statusTag.classList.add('loading');
        } else if (type === 'error') {
            statusTag.classList.add('error');
        }
    }

    /* -------------------------------------------------------------
     * Rendering Feed
     * ------------------------------------------------------------- */
    function renderFeed(releases) {
        feedContainer.innerHTML = '';
        
        if (!releases || releases.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fa-solid fa-folder-open"></i></div>
                    <h3>No se encontraron actualizaciones</h3>
                    <p>No pudimos encontrar notas de versión en este momento.</p>
                </div>
            `;
            return;
        }

        releases.forEach(release => {
            if (release.items.length === 0) return;

            const group = document.createElement('div');
            group.className = 'date-group';
            group.dataset.date = release.date;

            const heading = document.createElement('div');
            heading.className = 'date-heading';
            heading.textContent = release.date;
            group.appendChild(heading);

            release.items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'update-card';
                card.dataset.itemId = item.id;
                
                // Keep references for click handler
                card.addEventListener('click', () => selectReleaseItem(item, release));

                const header = document.createElement('div');
                header.className = 'card-header';
                
                const badge = document.createElement('span');
                badge.className = `badge ${getBadgeClass(item.type)}`;
                badge.textContent = item.type;
                header.appendChild(badge);

                // Contenedor de acciones con botón de copiar borrador de tuit
                const actionsContainer = document.createElement('div');
                actionsContainer.className = 'card-actions';

                const copyBtn = document.createElement('button');
                copyBtn.className = 'btn-copy-card';
                copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
                copyBtn.title = 'Copiar borrador de tuit';
                copyBtn.setAttribute('aria-label', 'Copiar borrador de tuit al portapapeles');
                
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Evita seleccionar la tarjeta
                    const tweetText = generateDefaultTweet(release.date, item.type, item.body, release.link);
                    navigator.clipboard.writeText(tweetText)
                        .then(() => {
                            showToast('¡Borrador de tuit copiado al portapapeles!', 'success');
                            copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color: var(--color-badge-feature)"></i>';
                            setTimeout(() => {
                                copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
                            }, 2000);
                        })
                        .catch(err => {
                            console.error('Error al copiar:', err);
                            showToast('No se pudo copiar el texto.', 'error');
                        });
                });

                actionsContainer.appendChild(copyBtn);
                header.appendChild(actionsContainer);

                card.appendChild(header);

                // Body content summary (strip HTML first)
                const summary = document.createElement('p');
                summary.className = 'card-summary';
                summary.textContent = stripHtml(item.body);
                card.appendChild(summary);

                group.appendChild(card);
            });

            feedContainer.appendChild(group);
        });

        // If we previously had a selected item, let's re-highlight or keep it
        if (selectedItem) {
            const cardElement = document.querySelector(`[data-item-id="${selectedItem.id}"]`);
            if (cardElement) {
                cardElement.classList.add('active');
            }
        }
    }

    function selectReleaseItem(item, release) {
        selectedItem = { item, release };

        // Toggle active states in list
        document.querySelectorAll('.update-card').forEach(card => {
            card.classList.remove('active');
        });
        
        const cardElement = document.querySelector(`[data-item-id="${item.id}"]`);
        if (cardElement) {
            cardElement.classList.add('active');
        }

        // Display details
        emptyDetailState.classList.add('hidden');
        detailCard.classList.remove('hidden');

        // Toggle active details container on mobile
        document.querySelector('.app-container').classList.add('active-detail');

        // Populate card
        detailDate.textContent = release.date;
        detailBadge.textContent = item.type;
        detailBadge.className = `badge ${getBadgeClass(item.type)}`;
        detailLink.href = release.link || 'https://cloud.google.com/bigquery/docs/release-notes';
        
        // Inject HTML body (safely formatted by Google Cloud)
        detailBody.innerHTML = item.body;

        // Generate draft Tweet
        const draftTweet = generateDefaultTweet(release.date, item.type, item.body, release.link);
        defaultDraft = draftTweet; // Almacena el borrador por defecto
        tweetTextarea.value = draftTweet;
        updateCharCount();
    }

    /* -------------------------------------------------------------
     * Tweet Operations & Formatting
     * ------------------------------------------------------------- */
    function generateDefaultTweet(date, type, htmlBody, url) {
        const plainText = stripHtml(htmlBody).replace(/\s+/g, ' ').trim();
        const cleanUrl = url || 'https://cloud.google.com/bigquery/docs/release-notes';
        
        const prefix = `BigQuery (${date}) | ${type}: `;
        // Emphasize the link with a descriptive emoji
        const suffix = `\n\nDetalles: ${cleanUrl}\n#BigQuery #GoogleCloud`;
        
        // Twitter URL is counted as exactly 23 characters.
        // Let's truncate plainText if the total size exceeds the limit.
        const urlCharacterWeight = 23;
        const metadataLength = prefix.length + `\n\nDetalles: `.length + urlCharacterWeight + `\n#BigQuery #GoogleCloud`.length;
        const availableLength = 280 - metadataLength - 8; // 8 characters for quotes and safety buffer

        let bodyText = plainText;
        if (bodyText.length > availableLength) {
            bodyText = bodyText.substring(0, availableLength - 3) + '...';
        }

        return `${prefix}"${bodyText}"${suffix}`;
    }

    function updateCharCount() {
        const text = tweetTextarea.value;
        const count = calculateTwitterLength(text);
        
        charCount.textContent = count;
        
        // Handle warning and error styling
        const container = document.getElementById('char-counter-container');
        container.className = 'char-counter';
        
        if (count > 280) {
            container.classList.add('danger');
            tweetBtn.disabled = true;
        } else if (count > 250) {
            container.classList.add('warning');
            tweetBtn.disabled = false;
        } else {
            tweetBtn.disabled = false;
        }
    }

    // Twitter Web Intent Publish
    function publishTweet() {
        const text = tweetTextarea.value.trim();
        if (!text) {
            showToast('El contenido del tuit está vacío.', 'error');
            return;
        }
        
        if (calculateTwitterLength(text) > 280) {
            showToast('El tuit supera el límite de 280 caracteres.', 'error');
            return;
        }

        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'noopener,noreferrer');
        showToast('¡Redirigiendo al editor de tuits de X (Twitter)!', 'info');
    }

    /* -------------------------------------------------------------
     * Searching and Filtering
     * ------------------------------------------------------------- */
    function handleSearch() {
        const query = searchInput.value.toLowerCase().trim();
        
        if (!releaseData) return;

        const dateGroups = document.querySelectorAll('.date-group');
        let totalVisibleCards = 0;
        
        dateGroups.forEach(group => {
            const cards = group.querySelectorAll('.update-card');
            let visibleCardsCount = 0;

            cards.forEach(card => {
                const badgeText = card.querySelector('.badge').textContent.toLowerCase();
                const summaryText = card.querySelector('.card-summary').textContent.toLowerCase();
                const dateText = group.dataset.date.toLowerCase();

                const matchesQuery = badgeText.includes(query) || 
                                     summaryText.includes(query) || 
                                     dateText.includes(query);

                if (matchesQuery) {
                    card.classList.remove('hidden');
                    visibleCardsCount++;
                    totalVisibleCards++;
                } else {
                    card.classList.add('hidden');
                }
            });

            // Hide the entire date group header if no visible cards are inside it
            if (visibleCardsCount > 0) {
                group.classList.remove('hidden');
            } else {
                group.classList.add('hidden');
            }
        });

        // Controlar el estado vacío de la búsqueda
        if (totalVisibleCards === 0) {
            emptySearchState.classList.remove('hidden');
            feedContainer.classList.add('hidden');
        } else {
            emptySearchState.classList.add('hidden');
            feedContainer.classList.remove('hidden');
        }
    }

    /* -------------------------------------------------------------
     * Helper Utilities
     * ------------------------------------------------------------- */
    function stripHtml(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        // Also strip any multiple consecutive newlines / tabs
        return temp.textContent || temp.innerText || '';
    }

    function getBadgeClass(type) {
        const t = type.toLowerCase().trim();
        if (t.includes('feature')) return 'badge-feature';
        if (t.includes('announcement')) return 'badge-announcement';
        if (t.includes('fix')) return 'badge-fix';
        if (t.includes('security')) return 'badge-security';
        if (t.includes('deprecat')) return 'badge-deprecated';
        return 'badge-default';
    }

    // Twitter-specific string length calculator (counting URLs as 23 characters)
    function calculateTwitterLength(text) {
        // Match standard URL regex
        const urlRegex = /https?:\/\/[^\s$.?#].[^\s]*/gi;
        const urls = text.match(urlRegex) || [];
        
        let length = text.length;
        
        // Subtract actual length of each URL, add 23 for each
        urls.forEach(url => {
            length = length - url.length + 23;
        });
        
        return length;
    }

    /* -------------------------------------------------------------
     * Toast System
     * ------------------------------------------------------------- */
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const content = document.createElement('div');
        content.className = 'toast-content';

        const icon = document.createElement('i');
        icon.className = 'toast-icon ';
        if (type === 'success') {
            icon.className += 'fa-solid fa-circle-check';
        } else if (type === 'error') {
            icon.className += 'fa-solid fa-circle-exclamation';
        } else {
            icon.className += 'fa-solid fa-circle-info';
        }

        const textSpan = document.createElement('span');
        textSpan.textContent = message;

        content.appendChild(icon);
        content.appendChild(textSpan);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        closeBtn.setAttribute('aria-label', 'Cerrar notificación');
        closeBtn.addEventListener('click', () => dismissToast(toast));

        toast.appendChild(content);
        toast.appendChild(closeBtn);
        toastContainer.appendChild(toast);

        // Auto dismiss after 4 seconds
        setTimeout(() => {
            dismissToast(toast);
        }, 4000);
    }

    function dismissToast(toast) {
        if (toast.classList.contains('hiding')) return;
        toast.classList.add('hiding');
        
        // Remove from DOM after transition completes
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }

    /* -------------------------------------------------------------
     * Mejoras de UX (Controladores de Acciones)
     * ------------------------------------------------------------- */
    function closeMobileDetail() {
        document.querySelector('.app-container').classList.remove('active-detail');
        selectedItem = null;
        document.querySelectorAll('.update-card').forEach(card => card.classList.remove('active'));
        detailCard.classList.add('hidden');
        emptyDetailState.classList.remove('hidden');
    }

    function resetDraftTweet() {
        if (!selectedItem) return;
        tweetTextarea.value = defaultDraft;
        updateCharCount();
        showToast('Borrador original restablecido', 'info');
    }

    function clearSearch() {
        searchInput.value = '';
        handleSearch();
        searchInput.focus();
    }

    /* -------------------------------------------------------------
     * Tema Claro/Oscuro
     * ------------------------------------------------------------- */
    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.documentElement.classList.add('light-theme');
            themeIcon.className = 'fa-solid fa-moon';
        } else {
            document.documentElement.classList.remove('light-theme');
            themeIcon.className = 'fa-solid fa-sun';
        }
    }

    function toggleTheme() {
        const isLight = document.documentElement.classList.toggle('light-theme');
        if (isLight) {
            themeIcon.className = 'fa-solid fa-moon';
            localStorage.setItem('theme', 'light');
            showToast('Modo claro activado', 'info');
        } else {
            themeIcon.className = 'fa-solid fa-sun';
            localStorage.setItem('theme', 'dark');
            showToast('Modo oscuro activado', 'info');
        }
    }

    /* -------------------------------------------------------------
     * Exportación CSV
     * ------------------------------------------------------------- */
    function exportToCSV() {
        if (!releaseData || releaseData.length === 0) {
            showToast('No hay datos disponibles para exportar.', 'error');
            return;
        }

        const csvRows = [];
        csvRows.push(['Fecha', 'Tipo', 'URL', 'Contenido']);

        releaseData.forEach(release => {
            const date = release.date;
            const url = release.link || '';
            
            release.items.forEach(item => {
                const type = item.type;
                const plainBody = stripHtml(item.body).replace(/\s+/g, ' ').trim();
                csvRows.push([date, type, url, plainBody]);
            });
        });

        const csvString = csvRows.map(row => 
            row.map(val => `"${val.replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('¡Archivo CSV descargado con éxito!', 'success');
    }
});
