// ============================================================================
// APLICACIÓN DE MONITOREO Y SEGUIMIENTO DE CONDICIONES AMBIENTALES Y SOCIALES
// ============================================================================

class DataApp {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.rowsPerPage = 15;
        this.map = null;
        this.markers = null;
        this.charts = {};
        this.chartInstances = {};
        this.columnsOrder = [];
        
        this.init();
    }

    async init() {
        try {
            // Cargar datos
            await this.loadData();
            
            // Inicializar interfaz
            this.setupEventListeners();
            this.populateFilters();
            this.updateCards();
            this.initMap();
            this.displayData();
            
            console.log('Aplicación inicializada correctamente');
        } catch (error) {
            console.error('Error al inicializar:', error);
            alert('Error al cargar los datos. Por favor, recarga la página.');
        }
    }

    async loadData() {
        try {
            // URL de la base de datos en GitHub (cambiar según tu repositorio)
            const dataUrl = 'https://raw.githubusercontent.com/tu-usuario/tu-repo/main/bdatos_bcie26.xlsx';
            
            // Para desarrollo local, usamos datos de ejemplo
            // En producción, cambiar la URL anterior
            
            const response = await fetch(dataUrl).catch(() => {
                // Si no encuentra en GitHub, usar datos de ejemplo
                console.log('Usando datos de ejemplo (conectar a GitHub para datos reales)');
                return null;
            });

            if (response && response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                this.data = jsonData.filter(row => row['Código'] && row['Latitud']);
            } else {
                // Datos de ejemplo para demostración
                this.data = this.getExampleData();
            }

            // Guardar orden de columnas
            if (this.data.length > 0) {
                this.columnsOrder = Object.keys(this.data[0]);
            }

            this.filteredData = [...this.data];
        } catch (error) {
            console.error('Error cargando datos:', error);
            this.data = this.getExampleData();
            this.filteredData = [...this.data];
        }
    }

    getExampleData() {
        // Datos de ejemplo basados en la estructura real
        return [
            {
                'Latitud': 13.72491667, 'Longitud': -89.66127778, 'Grupo': 1, 'No': 1,
                'Código': 10588, 'Centro Educativo': 'COMPLEJO EDUCATIVO "REPÚBLICA DE CHINA"',
                'Departamento': 'SONSONATE', 'Distrito': 'CALUCO',
                'Empresa obras': 'O.S. CONSTRUCTORES, S.A. DE C.V.',
                'Número de contrato': '14/2023', 'Empresa supervisión': 'LEONEL AVILES, S.A. DE C.V.',
                'Administrador de contrato': 'Finalizado', 'Etapa': 'Constructivo finalizado',
                'Porcentaje de avance 31/03/26': 1, 'Estado de PEGAS Diseño': 'Finalizado',
                'Estado PEGAS Ejecución': 'Finalizado', 'Accidentes laborales acumulados': 0,
                'Reubicación Temporal': 'Finalizado - CE en uso'
            },
            {
                'Latitud': 13.64277778, 'Longitud': -89.59613889, 'Grupo': 1, 'No': 2,
                'Código': 10596, 'Centro Educativo': 'COMPLEJO EDUCATIVO "CRISTÓBAL IBARRA MEJICANOS"',
                'Departamento': 'SONSONATE', 'Distrito': 'CUISNAHUAT',
                'Empresa obras': 'O.S. CONSTRUCTORES, S.A. DE C.V.',
                'Número de contrato': '14/2023', 'Empresa supervisión': 'LEONEL AVILES, S.A. DE C.V.',
                'Administrador de contrato': 'Finalizado', 'Etapa': 'Constructivo finalizado',
                'Porcentaje de avance 31/03/26': 1, 'Estado de PEGAS Diseño': 'Finalizado',
                'Estado PEGAS Ejecución': 'Finalizado', 'Accidentes laborales acumulados': 0,
                'Reubicación Temporal': 'Finalizado - CE en uso'
            }
        ];
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.addEventListener('click', (e) => this.switchView(e.target.closest('.nav-item').dataset.view));
        });

        // Filters
        document.getElementById('searchInput').addEventListener('input', (e) => this.applySearch(e.target.value));
        document.getElementById('departmentFilter').addEventListener('change', (e) => this.updateDistrictFilter(e.target.value));
        document.getElementById('applyFilters').addEventListener('click', () => this.applyFilters());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearAllFilters());

        // Actions
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToExcel());
        document.getElementById('screenshotBtn').addEventListener('click', () => this.captureMapScreenshot());
        document.getElementById('mapScreenshot').addEventListener('click', () => this.captureMapScreenshot());
        document.getElementById('resetBtn').addEventListener('click', () => this.clearAllFilters());
        document.getElementById('centerMap').addEventListener('click', () => this.centerMapToElSalvador());
        document.getElementById('helpBtn').addEventListener('click', () => this.openModal('helpModal'));
        document.getElementById('aboutBtn').addEventListener('click', () => this.openModal('aboutModal'));

        // Sidebar
        document.getElementById('toggleSidebar').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('closeSidebar').addEventListener('click', () => this.toggleSidebar());

        // Close modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal.id);
            });
        });
    }

    populateFilters() {
        if (this.data.length === 0) return;

        const uniqueValues = (key) => [...new Set(this.data.map(row => row[key]).filter(Boolean))].sort();

        // Grupo
        uniqueValues('Grupo').forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            document.getElementById('groupFilter').appendChild(option);
        });

        // Código
        uniqueValues('Código').forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            document.getElementById('codeFilter').appendChild(option);
        });

        // Departamento
        uniqueValues('Departamento').forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            document.getElementById('departmentFilter').appendChild(option);
        });

        // Empresa obras
        uniqueValues('Empresa obras').forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            document.getElementById('worksCompanyFilter').appendChild(option);
        });

        // Número de contrato
        const contracts = uniqueValues('Número de contrato');
        contracts.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            document.getElementById('contractFilter').appendChild(option);
        });

        // Empresa supervisión
        uniqueValues('Empresa supervisión').forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            document.getElementById('supervisionCompanyFilter').appendChild(option);
        });

        // Etapa
        uniqueValues('Etapa').forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            document.getElementById('stageFilter').appendChild(option);
        });

        // Estado PEGAS Diseño
        uniqueValues('Estado de PEGAS Diseño').forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            document.getElementById('pegasDesignFilter').appendChild(option);
        });

        // Estado PEGAS Ejecución
        uniqueValues('Estado PEGAS Ejecución').forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            document.getElementById('pegasExecutionFilter').appendChild(option);
        });

        // Reubicación Temporal
        uniqueValues('Reubicación Temporal').forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            document.getElementById('relocationFilter').appendChild(option);
        });
    }

    updateDistrictFilter(department) {
        const districtFilter = document.getElementById('districtFilter');
        districtFilter.innerHTML = '<option value="">Todos</option>';
        districtFilter.disabled = !department;

        if (department) {
            const districts = [...new Set(
                this.data.filter(row => row['Departamento'] === department)
                    .map(row => row['Distrito'])
                    .filter(Boolean)
            )].sort();

            districts.forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                districtFilter.appendChild(option);
            });
        }
    }

    applyFilters() {
        const filters = {
            group: document.getElementById('groupFilter').value,
            code: document.getElementById('codeFilter').value,
            department: document.getElementById('departmentFilter').value,
            district: document.getElementById('districtFilter').value,
            worksCompany: document.getElementById('worksCompanyFilter').value,
            contract: document.getElementById('contractFilter').value,
            supervisionCompany: document.getElementById('supervisionCompanyFilter').value,
            stage: document.getElementById('stageFilter').value,
            pegasDesign: document.getElementById('pegasDesignFilter').value,
            pegasExecution: document.getElementById('pegasExecutionFilter').value,
            relocation: document.getElementById('relocationFilter').value
        };

        this.filteredData = this.data.filter(row => {
            if (filters.group && row['Grupo'] != filters.group) return false;
            if (filters.code && row['Código'] != filters.code) return false;
            if (filters.department && row['Departamento'] !== filters.department) return false;
            if (filters.district && row['Distrito'] !== filters.district) return false;
            if (filters.worksCompany && row['Empresa obras'] !== filters.worksCompany) return false;
            if (filters.supervisionCompany && row['Empresa supervisión'] !== filters.supervisionCompany) return false;
            if (filters.stage && row['Etapa'] !== filters.stage) return false;
            if (filters.pegasDesign && row['Estado de PEGAS Diseño'] !== filters.pegasDesign) return false;
            if (filters.pegasExecution && row['Estado PEGAS Ejecución'] !== filters.pegasExecution) return false;
            if (filters.relocation && row['Reubicación Temporal'] !== filters.relocation) return false;

            if (filters.contract === 'contracted') {
                const hasContract = row['Número de contrato'] && String(row['Número de contrato']).trim() !== '';
                if (!hasContract) return false;
            } else if (filters.contract) {
                if (row['Número de contrato'] !== filters.contract) return false;
            }

            return true;
        });

        this.currentPage = 1;
        this.updateCards();
        this.displayData();
        this.updateMapMarkers();
        this.updateCharts();
    }

    applySearch(searchTerm) {
        const term = searchTerm.toLowerCase();
        this.filteredData = this.data.filter(row => {
            const code = String(row['Código'] || '').toLowerCase();
            const name = String(row['Centro Educativo'] || '').toLowerCase();
            return code.includes(term) || name.includes(term);
        });

        this.currentPage = 1;
        this.updateCards();
        this.displayData();
        this.updateMapMarkers();
    }

    clearAllFilters() {
        document.getElementById('groupFilter').value = '';
        document.getElementById('codeFilter').value = '';
        document.getElementById('departmentFilter').value = '';
        document.getElementById('districtFilter').value = '';
        document.getElementById('districtFilter').disabled = true;
        document.getElementById('worksCompanyFilter').value = '';
        document.getElementById('contractFilter').value = '';
        document.getElementById('supervisionCompanyFilter').value = '';
        document.getElementById('stageFilter').value = '';
        document.getElementById('pegasDesignFilter').value = '';
        document.getElementById('pegasExecutionFilter').value = '';
        document.getElementById('relocationFilter').value = '';
        document.getElementById('searchInput').value = '';

        this.filteredData = [...this.data];
        this.currentPage = 1;
        this.updateCards();
        this.displayData();
        this.updateMapMarkers();
        this.updateCharts();
    }

    updateCards() {
        const total = this.data.length;
        const withContract = this.data.filter(row => row['Número de contrato'] && String(row['Número de contrato']).trim()).length;
        const selected = this.filteredData.length;
        const percentage = total > 0 ? Math.round((withContract / total) * 100) : 0;

        document.getElementById('totalCenters').textContent = total;
        document.getElementById('centersWithContract').textContent = withContract;
        document.getElementById('selectedCenters').textContent = selected;
        document.getElementById('percentageContracted').textContent = percentage + '%';
    }

    displayData() {
        const tableHeader = document.getElementById('tableHeader');
        const tableBody = document.getElementById('tableBody');
        const emptyState = document.getElementById('emptyState');
        const recordCount = document.getElementById('recordCount');

        if (this.filteredData.length === 0) {
            tableHeader.innerHTML = '';
            tableBody.innerHTML = '';
            emptyState.style.display = 'block';
            recordCount.textContent = '0 registros';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        emptyState.style.display = 'none';
        recordCount.textContent = this.filteredData.length + ' registros';

        // Encabezados
        if (tableHeader.innerHTML === '') {
            const headers = this.columnsOrder.length > 0 ? this.columnsOrder : Object.keys(this.filteredData[0]);
            tableHeader.innerHTML = headers.map(key => `<th>${key}</th>`).join('');
        }

        // Datos paginados
        const start = (this.currentPage - 1) * this.rowsPerPage;
        const end = start + this.rowsPerPage;
        const pageData = this.filteredData.slice(start, end);

        tableBody.innerHTML = pageData.map(row => {
            const cells = this.columnsOrder.length > 0 ? this.columnsOrder : Object.keys(row);
            return '<tr>' + cells.map(key => {
                let value = row[key] || '';
                // Truncar valores muy largos
                if (String(value).length > 50) {
                    value = String(value).substring(0, 50) + '...';
                }
                return `<td>${value}</td>`;
            }).join('') + '</tr>';
        }).join('');

        // Paginación
        this.updatePagination();
    }

    updatePagination() {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(this.filteredData.length / this.rowsPerPage);

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let html = '';
        const maxButtons = 5;
        const startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        const endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (startPage > 1) {
            html += `<button onclick="app.goToPage(1)">1</button>`;
            if (startPage > 2) html += '<span style="padding: 6px 5px;">...</span>';
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button ${i === this.currentPage ? 'class="active"' : ''} onclick="app.goToPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += '<span style="padding: 6px 5px;">...</span>';
            html += `<button onclick="app.goToPage(${totalPages})">${totalPages}</button>`;
        }

        pagination.innerHTML = html;
    }

    goToPage(page) {
        this.currentPage = page;
        this.displayData();
        document.querySelector('.table-wrapper').scrollTop = 0;
    }

    initMap() {
        const container = document.getElementById('map');
        if (!container) return;

        // Centro de El Salvador
        this.map = L.map('map').setView([13.5, -88.9], 8);

        // Capas base
        const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        });

        const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles © Esri',
            maxZoom: 18
        });

        const topoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenTopoMap',
            maxZoom: 17
        });

        // Control de capas
        L.control.layers({
            'Calles': streetMap,
            'Satélite': satelliteMap,
            'Topográfico': topoMap
        }).addTo(this.map);

        streetMap.addTo(this.map);

        // Cluster de marcadores
        this.markers = L.markerClusterGroup();
        this.map.addLayer(this.markers);

        this.updateMapMarkers();
    }

    updateMapMarkers() {
        if (!this.markers) return;

        this.markers.clearLayers();

        this.filteredData.forEach(row => {
            const lat = parseFloat(row['Latitud']);
            const lng = parseFloat(row['Longitud']);

            if (isNaN(lat) || isNaN(lng)) return;

            const marker = L.marker([lat, lng]);
            const popupContent = `
                <div style="width: 250px;">
                    <strong>${row['Centro Educativo']}</strong><br>
                    <small style="color: #666;">Código: ${row['Código']}</small><br>
                    <div style="margin-top: 8px; font-size: 12px;">
                        <p><strong>Departamento:</strong> ${row['Departamento']}</p>
                        <p><strong>Contrato:</strong> ${row['Número de contrato'] || 'Sin asignar'}</p>
                        <p><strong>Etapa:</strong> ${row['Etapa']}</p>
                        <p><strong>Avance:</strong> ${row['Porcentaje de avance 31/03/26']}%</p>
                    </div>
                </div>
            `;
            marker.bindPopup(popupContent);
            this.markers.addLayer(marker);
        });
    }

    centerMapToElSalvador() {
        if (this.map) {
            this.map.setView([13.5, -88.9], 8);
        }
    }

    async captureMapScreenshot() {
        const container = document.getElementById('mapView');
        if (!container) {
            alert('Primero cambia a la vista de mapa');
            return;
        }

        try {
            const canvas = await html2canvas(container, { allowTaint: true, useCORS: true });
            const link = document.createElement('a');
            const department = document.getElementById('departmentFilter').value || 'El Salvador';
            link.download = `mapa_${department}_${new Date().getTime()}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (error) {
            console.error('Error capturando mapa:', error);
            alert('Error al capturar la imagen');
        }
    }

    exportToExcel() {
        if (this.filteredData.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(this.filteredData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Datos');

        // Ajustar ancho de columnas
        const maxWidth = 20;
        ws['!cols'] = Object.keys(this.filteredData[0]).map(() => ({ wch: maxWidth }));

        const filename = `Centros_Educativos_${new Date().getTime()}.xlsx`;
        XLSX.writeFile(wb, filename);
    }

    switchView(viewName) {
        // Actualizar nav
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        // Actualizar vistas
        document.getElementById('analysisView').classList.remove('active');
        document.getElementById('mapView').classList.remove('active');
        document.getElementById('dashboardView').classList.remove('hidden');

        if (viewName === 'analysis') {
            document.getElementById('analysisView').classList.add('active');
            document.getElementById('dashboardView').classList.add('hidden');
        } else if (viewName === 'map') {
            document.getElementById('mapView').classList.add('active');
            document.getElementById('dashboardView').classList.add('hidden');
            setTimeout(() => {
                if (this.map) this.map.invalidateSize();
            }, 100);
        } else if (viewName === 'dashboard') {
            document.getElementById('dashboardView').classList.remove('hidden');
            setTimeout(() => this.updateCharts(), 100);
        }

        // Cerrar sidebar en móvil
        if (window.innerWidth <= 768) {
            this.toggleSidebar();
        }
    }

    updateCharts() {
        // Destruir gráficos existentes
        Object.values(this.chartInstances).forEach(chart => chart.destroy());
        this.chartInstances = {};

        // Gráfico de Departamentos
        const deptData = {};
        this.filteredData.forEach(row => {
            const dept = row['Departamento'] || 'Sin asignar';
            deptData[dept] = (deptData[dept] || 0) + 1;
        });

        const deptCtx = document.getElementById('departmentChart');
        if (deptCtx) {
            this.chartInstances.dept = new Chart(deptCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(deptData),
                    datasets: [{
                        label: 'Número de Centros',
                        data: Object.values(deptData),
                        backgroundColor: '#4CAF50',
                        borderColor: '#1a472a',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }

        // Gráfico de Etapas
        const stageData = {};
        this.filteredData.forEach(row => {
            const stage = row['Etapa'] || 'Sin asignar';
            stageData[stage] = (stageData[stage] || 0) + 1;
        });

        const stageCtx = document.getElementById('stageChart');
        if (stageCtx) {
            this.chartInstances.stage = new Chart(stageCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(stageData),
                    datasets: [{
                        data: Object.values(stageData),
                        backgroundColor: ['#4CAF50', '#ff9800', '#f44336', '#2196F3']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }

        // Gráfico PEGAS Diseño
        const pegasDesignData = {};
        this.filteredData.forEach(row => {
            const status = row['Estado de PEGAS Diseño'] || 'Sin asignar';
            pegasDesignData[status] = (pegasDesignData[status] || 0) + 1;
        });

        const pegasDesignCtx = document.getElementById('pegasDesignChart');
        if (pegasDesignCtx) {
            this.chartInstances.pegasDesign = new Chart(pegasDesignCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(pegasDesignData),
                    datasets: [{
                        label: 'Estado PEGAS Diseño',
                        data: Object.values(pegasDesignData),
                        backgroundColor: '#2196F3',
                        borderColor: '#1a472a',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }

        // Gráfico PEGAS Ejecución
        const pegasExecData = {};
        this.filteredData.forEach(row => {
            const status = row['Estado PEGAS Ejecución'] || 'Sin asignar';
            pegasExecData[status] = (pegasExecData[status] || 0) + 1;
        });

        const pegasExecCtx = document.getElementById('pegasExecutionChart');
        if (pegasExecCtx) {
            this.chartInstances.pegasExec = new Chart(pegasExecCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(pegasExecData),
                    datasets: [{
                        label: 'Estado PEGAS Ejecución',
                        data: Object.values(pegasExecData),
                        backgroundColor: '#ff9800',
                        borderColor: '#1a472a',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('toggleSidebar');
        sidebar.classList.toggle('closed');
        toggle.classList.toggle('show');
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add('show');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }
}

// Funciones globales para modales
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Inicializar aplicación
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DataApp();
});

// Responder a cambios de tamaño de pantalla
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        document.getElementById('sidebar').classList.remove('closed');
        document.getElementById('toggleSidebar').classList.remove('show');
    }
});
