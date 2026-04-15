// CONFIGURACIÓN INICIAL
const LOCAL_STORAGE_KEY = 'visor_ambient_bcie_gh_url';
let globalData = [];
let filteredData = [];
let map = null;
let markersLayer = null;
let charts = {};

// ELEMENTOS DEL DOM
const dom = {
    loader: document.getElementById('loading-overlay'),
    loaderText: document.getElementById('loader-text'),
    fileUploader: document.getElementById('file-uploader'),
    btnSettings: document.getElementById('btn-settings'),
    modalSettings: document.getElementById('modal-settings'),
    inputGhUrl: document.getElementById('input-github-url'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    
    // Sidebar & Filters
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    statTotal: document.getElementById('stat-total-centros'),
    statContratos: document.getElementById('stat-contratos'),
    searchInput: document.getElementById('search-input'),
    btnClearFilters: document.getElementById('btn-clear-filters'),
    
    // Filters selects
    fDepto: document.getElementById('filter-depto'),
    fDist: document.getElementById('filter-distrito'),
    fGrup: document.getElementById('filter-grupo'),
    fEmpObras: document.getElementById('filter-empresa-obras'),
    fEmpSup: document.getElementById('filter-empresa-sup'),
    fContrato: document.getElementById('filter-contrato'),
    fAdmin: document.getElementById('filter-administrador'),
    fEtapa: document.getElementById('filter-etapa'),
    fPegasDis: document.getElementById('filter-estado-diseno'),
    fPegasEjec: document.getElementById('filter-estado-ejecucion'),

    // Table
    tableHeadRow: document.getElementById('table-head-row'),
    tableBody: document.getElementById('table-body'),

    // Actions
    btnExport: document.getElementById('btn-export-excel'),
    btnCapture: document.getElementById('btn-capture-map')
};

// LISTA DE COLUMNAS A MOSTRAR EN TABLA Y PARSEAR
const REQ_COLS = [
    'Grup', 'Código', 'Centro Educativo', 'Departamento', 'Distrito', 
    'Empresa obras', 'Número de contrato', 'Empresa supervisión', 
    'Administrador de contrato', 'Etapa', 'Porcentaje de avance', 
    'Estado de PEGAS Diseño', 'Estado PEGAS Ejecución', 
    'Accidentes acumulados', 'Reubicación Temporal'
];

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initEvents();

    const savedUrl = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedUrl) {
        loadFromUrl(savedUrl);
    } else {
        hideLoader();
    }
});

// EVENTOS GLOBALES
function initEvents() {
    dom.sidebarToggle.addEventListener('click', () => dom.sidebar.classList.toggle('collapsed'));
    
    // Pestañas
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
            const target = btn.getAttribute('data-target');
            btn.classList.add('active');
            document.getElementById(target).classList.add('active');
            
            if (target === 'view-map' && map) map.invalidateSize();
            if (target === 'view-dashboard') updateDashboard();
        });
    });

    // Cargar archivo local
    dom.fileUploader.addEventListener('change', (e) => {
        if (!e.target.files.length) return;
        showLoader('Leyendo archivo local...');
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => parseExcel(e.target.result);
        reader.readAsArrayBuffer(file);
    });

    // Modal GitHub URL
    dom.btnSettings.addEventListener('click', () => {
        dom.inputGhUrl.value = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
        dom.modalSettings.classList.add('show');
    });
    dom.btnCloseSettings.addEventListener('click', () => dom.modalSettings.classList.remove('show'));
    dom.btnSaveSettings.addEventListener('click', () => {
        const url = dom.inputGhUrl.value.trim();
        localStorage.setItem(LOCAL_STORAGE_KEY, url);
        dom.modalSettings.classList.remove('show');
        if (url) loadFromUrl(url);
    });

    // Filtros
    [dom.searchInput, dom.fDepto, dom.fDist, dom.fGrup, dom.fEmpObras, 
     dom.fEmpSup, dom.fContrato, dom.fAdmin, dom.fEtapa, dom.fPegasDis, dom.fPegasEjec].forEach(el => {
        el.addEventListener('change', applyFilters);
        el.addEventListener('input', () => { if(el === dom.searchInput) applyFilters(); });
    });

    // Cascada Depto -> Distrito
    dom.fDepto.addEventListener('change', () => {
        populateDistritos(dom.fDepto.value);
        applyFilters();
    });

    dom.btnClearFilters.addEventListener('click', () => {
        dom.searchInput.value = '';
        dom.fDepto.value = '';
        dom.fDist.value = '';
        dom.fDist.disabled = true;
        dom.fGrup.value = '';
        dom.fEmpObras.value = '';
        dom.fEmpSup.value = '';
        dom.fContrato.value = '';
        dom.fAdmin.value = '';
        dom.fEtapa.value = '';
        dom.fPegasDis.value = '';
        dom.fPegasEjec.value = '';
        applyFilters();
    });

    // Herramientas Mapa
    document.getElementById('btn-center-map').addEventListener('click', centerMap);
    
    // Exportar
    dom.btnExport.addEventListener('click', exportToExcel);
    dom.btnCapture.addEventListener('click', captureMap);
}

// CARGA DE DATOS
async function loadFromUrl(url) {
    showLoader('Descargando datos desde GitHub...');
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Error en red");
        const arrayBuffer = await response.arrayBuffer();
        parseExcel(arrayBuffer);
    } catch (e) {
        alert("Error al cargar URL: " + e.message);
        hideLoader();
    }
}

function parseExcel(dataBuffer) {
    try {
        const workbook = XLSX.read(dataBuffer, { type: 'array', cellDates: true });
        const firstSheet = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
        
        // Limpieza y normalización
        globalData = rows.map(row => {
            const cleanRow = {};
            // Normalizar llaves
            for (let k in row) {
                const cleanKey = k.trim().replace(/\s+/g, ' ');
                let val = row[k];
                // Formateo especial para "Porcentaje de avance" si es fecha (Ej. 31/03/26)
                if (cleanKey.toLowerCase() === 'porcentaje de avance' && val instanceof Date) {
                    const dd = String(val.getDate()).padStart(2, '0');
                    const mm = String(val.getMonth() + 1).padStart(2, '0');
                    const yy = String(val.getFullYear()).slice(-2);
                    val = `${dd}/${mm}/${yy}`;
                }
                cleanRow[cleanKey] = val;
                // Intentar capturar versión minúscula para variables flexibles
                cleanRow[cleanKey.toLowerCase()] = val; 
            }
            return cleanRow;
        });

        // Asegurarnos que existan las llaves requeridas aunque estén vacías
        globalData.forEach(r => {
            REQ_COLS.forEach(c => {
                if(r[c] === undefined) r[c] = r[c.toLowerCase()] || "";
            });
        });

        populateFilterOptions();
        applyFilters();
        hideLoader();

    } catch (e) {
        alert("Error procesando Excel: " + e.message);
        hideLoader();
    }
}

// POBLAR FILTROS
function populateFilterOptions() {
    const getUnique = (key) => [...new Set(globalData.map(d => d[key]))].filter(x => x).sort();
    
    fillSelect(dom.fDepto, getUnique('Departamento'));
    fillSelect(dom.fGrup, getUnique('Grup'));
    fillSelect(dom.fEmpObras, getUnique('Empresa obras'));
    fillSelect(dom.fEmpSup, getUnique('Empresa supervisión'));
    fillSelect(dom.fAdmin, getUnique('Administrador de contrato'));
    fillSelect(dom.fEtapa, getUnique('Etapa'));
    fillSelect(dom.fPegasDis, getUnique('Estado de PEGAS Diseño'));
    fillSelect(dom.fPegasEjec, getUnique('Estado PEGAS Ejecución'));

    // Lógica especial para Número de contrato
    // El usuario quiere: opcion para todos asignados (que tengan numero), sin adjudicar ignorar para esta cuenta.
    const contratos = getUnique('Número de contrato');
    const assigned = contratos.filter(c => c && c.toLowerCase().trim() !== 'sin adjudicar');
    
    dom.fContrato.innerHTML = `<option value="">Todos</option><option value="__ASSIGNED__">Ver Todos los Asignados</option>`;
    assigned.forEach(c => {
        dom.fContrato.innerHTML += `<option value="${c}">${c}</option>`;
    });
}

function populateDistritos(depto) {
    if (!depto) {
        dom.fDist.innerHTML = `<option value="">Todos</option>`;
        dom.fDist.disabled = true;
        return;
    }
    const distritos = [...new Set(globalData.filter(d => d['Departamento'] === depto).map(d => d['Distrito']))].filter(x => x).sort();
    fillSelect(dom.fDist, distritos);
    dom.fDist.disabled = false;
}

function fillSelect(selectNode, arr) {
    selectNode.innerHTML = `<option value="">Toda/os</option>`;
    arr.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        selectNode.appendChild(opt);
    });
}

// LOGICA DE FILTRADO
function applyFilters() {
    const sTerm = dom.searchInput.value.toLowerCase();
    const sDepto = dom.fDepto.value;
    const sDist = dom.fDist.value;
    const sGrup = dom.fGrup.value;
    const sObras = dom.fEmpObras.value;
    const sSup = dom.fEmpSup.value;
    const sContrato = dom.fContrato.value;
    const sAdmin = dom.fAdmin.value;
    const sEtapa = dom.fEtapa.value;
    const sPegasD = dom.fPegasDis.value;
    const sPegasE = dom.fPegasEjec.value;

    filteredData = globalData.filter(d => {
        const mSearch = !sTerm || String(d['Código']||'').toLowerCase().includes(sTerm) || String(d['Centro Educativo']||'').toLowerCase().includes(sTerm);
        const mDepto = !sDepto || d['Departamento'] === sDepto;
        const mDist = !sDist || d['Distrito'] === sDist;
        const mGrup = !sGrup || d['Grup'] === sGrup;
        const mObras = !sObras || d['Empresa obras'] === sObras;
        const mSup = !sSup || d['Empresa supervisión'] === sSup;
        const mAdmin = !sAdmin || d['Administrador de contrato'] === sAdmin;
        const mEtapa = !sEtapa || d['Etapa'] === sEtapa;
        const mPegasD = !sPegasD || d['Estado de PEGAS Diseño'] === sPegasD;
        const mPegasE = !sPegasE || d['Estado PEGAS Ejecución'] === sPegasE;
        
        let mContrato = true;
        if (sContrato === '__ASSIGNED__') {
            const val = String(d['Número de contrato']||'').toLowerCase().trim();
            mContrato = val && val !== 'sin adjudicar';
        } else if (sContrato) {
            mContrato = d['Número de contrato'] === sContrato;
        }

        return mSearch && mDepto && mDist && mGrup && mObras && mSup && mAdmin && mEtapa && mPegasD && mPegasE && mContrato;
    });

    updateCounters();
    updateTable();
    updateMap();
    if(document.getElementById('view-dashboard').classList.contains('active')) updateDashboard();
}

function updateCounters() {
    // Total de registros (sidebar)
    dom.statTotal.textContent = globalData.length;
    
    // Contar contratos válidos en filteredData (sidebar)
    let conContrato = 0;
    filteredData.forEach(d => {
        const val = String(d['Número de contrato']||'').toLowerCase().trim();
        if (val && val !== 'sin adjudicar') conContrato++;
    });
    dom.statContratos.textContent = conContrato;

    // Actualizar tarjetas del Dashboard (Global de la base de datos)
    const dashStatTotal = document.getElementById('dash-stat-total');
    const dashStatContratos = document.getElementById('dash-stat-contratos');
    
    if (dashStatTotal) {
        dashStatTotal.textContent = globalData.length;
    }
    
    if (dashStatContratos) {
        let globalContratos = 0;
        globalData.forEach(d => {
            const val = String(d['Número de contrato']||'').toLowerCase().trim();
            if (val && val !== 'sin adjudicar') globalContratos++;
        });
        dashStatContratos.textContent = globalContratos;
    }
}

// TABLA
function updateTable() {
    dom.tableHeadRow.innerHTML = '';
    dom.tableBody.innerHTML = '';

    if (!filteredData.length) {
        dom.tableBody.innerHTML = `<tr><td colspan="${REQ_COLS.length}" style="text-align:center;">No hay datos para mostrar</td></tr>`;
        return;
    }

    // Cabeceras
    REQ_COLS.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        dom.tableHeadRow.appendChild(th);
    });

    // Filas (Limitado a 500 para rendimiento de DOM)
    const renderLimit = Math.min(filteredData.length, 500); 
    for(let i=0; i<renderLimit; i++){
        const row = filteredData[i];
        const tr = document.createElement('tr');
        REQ_COLS.forEach(col => {
            const td = document.createElement('td');
            td.textContent = row[col] !== undefined ? row[col] : '';
            tr.appendChild(td);
        });
        dom.tableBody.appendChild(tr);
    }
}

// MAPA
function initMap() {
    map = L.map('map-container').setView([13.794185, -88.89653], 8);
    
    // Capas Base
    // Se usa CartoDB Voyager en lugar de OSM principal porque OSM bloquea orígenes locales (file:///)
    const osm = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>' });
    const esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri' });
    const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: 'Map data: &copy; OpenTopoMap' });

    osm.addTo(map);

    const baseMaps = {
        "Mapa de Calles (OSM)": osm,
        "Satélite (ESRI)": esri,
        "Topográfico": topo
    };
    L.control.layers(baseMaps).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
}

function centerMap() {
    if(map) map.setView([13.794185, -88.89653], 8);
}

function updateMap() {
    markersLayer.clearLayers();
    
    filteredData.forEach(d => {
        let lat = parseFloat(d['latitud'] || d['Latitud']);
        let lon = parseFloat(d['longitud'] || d['Longitud']);
        
        if (!isNaN(lat) && !isNaN(lon)) {
            // Un marcador HTML con FontAwesome
            const icon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: '<i class="fa-solid fa-location-dot"></i>',
                iconSize: [24, 24],
                iconAnchor: [12, 24],
                popupAnchor: [0, -24]
            });

            const marker = L.marker([lat, lon], {icon: icon});
            
            let pctStr = d['Porcentaje de avance'];
            if(pctStr && !isNaN(pctStr)) { pctStr = Math.round(Number(pctStr)*100) + '%'; }
            else if(!pctStr) { pctStr = '-'; }

            let pegasAmbos = [d['Estado de PEGAS Diseño'], d['Estado PEGAS Ejecución']].filter(x => x && x !== '-').join(' | ') || '-';

            const popupAct = `
                <div style="font-family:'Inter',sans-serif;font-size:12px;min-width:240px;padding-bottom:5px;">
                    <h4 style="margin:0 0 8px 0;color:#2196F3;font-size:14px;line-height:1.2;">${d['Centro Educativo'] || 'Sin Nombre'}</h4>
                    <p style="margin:3px 0;"><strong>Código:</strong> ${d['Código'] || '-'}</p>
                    <p style="margin:3px 0;"><strong>Contrato:</strong> ${d['Número de contrato'] || '-'}</p>
                    <p style="margin:3px 0;"><strong>Empresa Obras:</strong> ${d['Empresa obras'] || '-'}</p>
                    <p style="margin:3px 0;"><strong>Empresa Supervisión:</strong> ${d['Empresa supervisión'] || '-'}</p>
                    <p style="margin:3px 0;"><strong>Etapa:</strong> <span style="background:#e3f2fd;color:#1565C0;padding:2px 4px;border-radius:3px;">${d['Etapa'] || '-'}</span></p>
                    <p style="margin:3px 0;"><strong>Porcentaje de avance:</strong> ${pctStr}</p>
                    <p style="margin:3px 0;"><strong>Estado PEGAS:</strong> ${pegasAmbos}</p>
                    <p style="margin:3px 0;"><strong>Accidentes:</strong> ${d['Accidentes acumulados'] || '-'}</p>
                    <p style="margin:3px 0;"><strong>Reubicación:</strong> ${d['Reubicación Temporal'] || '-'}</p>
                    
                    <div style="margin-top:12px; display:flex; gap:8px;">
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank" style="flex:1; text-align:center; padding:6px; background:#4CAF50; color:#fff; text-decoration:none; border-radius:4px; font-weight:500;"><i class="fa-solid fa-map"></i> Maps</a>
                        <a href="https://waze.com/ul?ll=${lat},${lon}&navigate=yes" target="_blank" style="flex:1; text-align:center; padding:6px; background:#03A9F4; color:#fff; text-decoration:none; border-radius:4px; font-weight:500;"><i class="fa-solid fa-car"></i> Waze</a>
                    </div>
                </div>
            `;
            marker.bindPopup(popupAct);
            markersLayer.addLayer(marker);
        }
    });
}

// DASHBOARD
function updateDashboard() {
    const themeColor = '#A0A0B0';
    const gridColor = '#3F3F5A';
    
    Chart.defaults.color = themeColor;
    Chart.defaults.scale.grid.color = gridColor;

    const countProp = (prop) => {
        const counts = {};
        filteredData.forEach(d => {
            const v = d[prop] || 'No definido';
            counts[v] = (counts[v] || 0) + 1;
        });
        return {
            labels: Object.keys(counts),
            data: Object.values(counts)
        };
    };

    // Helper p/ crear/actualizar
    const renderChart = (ctxId, type, labels, data, palette) => {
        if(charts[ctxId]) charts[ctxId].destroy();
        const ctx = document.getElementById(ctxId).getContext('2d');
        charts[ctxId] = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: palette,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)' // Soft border
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: type === 'pie' || type === 'doughnut' ? 'right' : 'none' } }
            }
        });
    };

    const palette1 = ['#2196F3', '#4CAF50', '#FFC107', '#E91E63', '#9C27B0', '#00BCD4'];
    
    // Etapas
    const etpData = countProp('Etapa');
    renderChart('chartEtapas', 'doughnut', etpData.labels, etpData.data, palette1);
    
    // PEGAS Diseño
    const pdData = countProp('Estado de PEGAS Diseño');
    renderChart('chartPegasDiseno', 'bar', pdData.labels, pdData.data, palette1);
    
    // Contratistas (Top 5)
    let contRaw = countProp('Empresa obras');
    // Sort and slice
    let combos = contRaw.labels.map((l,i) => ({l, d:contRaw.data[i]})).filter(c=>c.l!=='No definido').sort((a,b)=>b.d - a.d).slice(0,5);
    renderChart('chartContratistas', 'bar', combos.map(c=>c.l), combos.map(c=>c.d), '#4CAF50');

    // PEGAS Ejecución
    const peData = countProp('Estado PEGAS Ejecución');
    renderChart('chartPegasEjecucion', 'pie', peData.labels, peData.data, palette1);
}

// EXPORT TO EXCEL
function exportToExcel() {
    if(!filteredData.length) return alert("No hay datos para exportar.");
    // Crear hoja limpia usando REQ_COLS
    const exportArr = filteredData.map(d => {
        let neat = {};
        REQ_COLS.forEach(c => neat[c] = d[c]);
        return neat;
    });
    const ws = XLSX.utils.json_to_sheet(exportArr);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos Filtrados");
    XLSX.writeFile(wb, "Datos_Monitoreo.xlsx");
}

// CAPTURE MAP
function captureMap() {
    // Si no estamos en la pestaña de mapa, cambiar a ella
    if(!document.getElementById('view-map').classList.contains('active')) {
        document.querySelector('[data-target="view-map"]').click();
    }
    
    // Construir texto de filtros
    let fText = [];
    if(dom.fDepto.value) fText.push(`Depto: ${dom.fDepto.value}`);
    if(dom.fDist.value) fText.push(`Distrito: ${dom.fDist.value}`);
    if(dom.fEmpObras.value) fText.push(`Contratista: ${dom.fEmpObras.value}`);
    if(dom.fEtapa.value) fText.push(`Etapa: ${dom.fEtapa.value}`);
    
    const overlay = document.getElementById('capture-branding');
    const txt = document.getElementById('capture-filters-text');
    txt.innerHTML = `<strong>Visor Monitoreo BCIE 2256</strong> | Centros: ${filteredData.length} | Filtros: ${fText.length ? fText.join(', ') : 'Ninguno'}`;
    overlay.classList.add('mode-capture');

    // Esperar a que el DOM se asiente
    setTimeout(() => {
        html2canvas(document.getElementById('view-map'), {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#1E1E2D'
        }).then(canvas => {
            overlay.classList.remove('mode-capture');
            const link = document.createElement('a');
            link.download = 'mapa_monitoreo.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }, 500);
}

// UTILIDADES
function showLoader(text) {
    dom.loaderText.textContent = text;
    dom.loader.classList.remove('hidden');
}
function hideLoader() {
    dom.loader.classList.add('hidden');
}
