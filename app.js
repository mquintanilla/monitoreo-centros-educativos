// ============================================================================
// APLICACIÓN V2 - MONITOREO DE CENTROS EDUCATIVOS
// ============================================================================

class DataAppV2 {
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
        this.dashboardStats = {};
        
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.populateFilters();
            this.initHomeView();
            this.initMap();
            
            console.log('Aplicación inicializada. Total de registros:', this.data.length);
        } catch (error) {
            console.error('Error al inicializar:', error);
            alert('Error al cargar los datos. Por favor, recarga la página.');
        }
    }

    async loadData() {
        try {
            const dataUrl = 'https://raw.githubusercontent.com/tu-usuario/tu-repo/main/bdatos_bcie26.xlsx';
            
            try {
                const response = await fetch(dataUrl);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    this.data = XLSX.utils.sheet_to_json(worksheet);
                }
            } catch (e) {
                console.log('No se pudo cargar de GitHub, usando datos de ejemplo');
            }

            // Si no hay datos, usar ejemplos
            if (this.data.length < 100) {
                this.data = this.generateExampleData();
            }

            if (this.data.length > 0) {
                this.columnsOrder = Object.keys(this.data[0]);
            }

            this.filteredData = [...this.data];
            this.calculateDashboardStats();
        } catch (error) {
            console.error('Error cargando datos:', error);
            this.data = this.generateExampleData();
            this.filteredData = [...this.data];
        }
    }

    generateExampleData() {
        // Generar 115 registros de ejemplo como especifica el usuario
        const departments = ['SONSONATE', 'SAN MIGUEL', 'CUSCATLÁN', 'LA PAZ', 'CABAÑAS', 'CHALATENANGO', 'SANTA ANA', 'AHUACHAPÁN', 'SONSONATE', 'CUSCATLÁN', 'MÉXICO', 'SAN SALVADOR', 'LA LIBERTAD', 'MORAZÁN'];
        const companies = ['O.S. CONSTRUCTORES, S.A. DE C.V.', 'A.P. & G, CONSTRUCTORES S.A. DE C.V.', 'CONSTRUCTORA MODERNA', 'MEGA CONSTRUCCIONES', 'OBRAS Y SERVICIOS'];
        const supervisors = ['LEONEL AVILES, S.A. DE C.V.', 'CONSORCIO (APPLUS-INGELOG-NOVOTEC)', 'SUPERVISOR A', 'SUPERVISOR B'];
        const stages = ['Diseño', 'Constructivo', 'Constructivo finalizado'];
        const contracts = ['14/2023', '15/2023', '16/2024', '17/2024', 'Sin asignar', '', null];
        
        const data = [];
        for (let i = 0; i < 115; i++) {
            const hasContract = Math.random() > 0.4;
            const stage = stages[Math.floor(Math.random() * stages.length)];
            
            data.push({
                'Latitud': 13.5 + (Math.random() - 0.5) * 3,
                'Longitud': -88.9 + (Math.random() - 0.5) * 3,
                'Grupo': Math.floor(i / 30) + 1,
                'No': i + 1,
                'Código': 10000 + i,
                'Centro Educativo': `CENTRO EDUCATIVO ${i + 1}`,
                'Departamento': departments[Math.floor(Math.random() * departments.length)],
                'Distrito': 'DISTRITO ' + (i % 5 + 1),
                'Empresa obras': companies[Math.floor(Math.random() * companies.length)],
                'Número de contrato': hasContract ? contracts[Math.floor(Math.random() * 4)] : 'Sin asignar',
                'Empresa supervisión': supervisors[Math.floor(Math.random() * supervisors.length)],
                'Administrador de contrato': 'ADMIN ' + (i % 3 + 1),
                'Etapa': stage,
                'Porcentaje de avance 31/03/26': stage === 'Diseño' ? Math.floor(Math.random() * 40) : stage === 'Constructivo' ? 40 + Math.floor(Math.random() * 60) : 100,
                'Estado de PEGAS Diseño': Math.random() > 0.3 ? 'Aprobado' : 'En revisión',
                'Estado PEGAS Ejecución': Math.random() > 0.2 ? 'Cumple' : 'No cumple',
                'Accidentes laborales acumulados': Math.floor(Math.random() * 3),
                'Reubicación Temporal': Math.random() > 0.5 ? 'Finalizado' : 'Pendiente'
            });
        }
        return data;
    }

    calculateDashboardStats() {
        const total = this.data.length;
        const withContract = this.data.filter(row => 
            row['Número de contrato'] && 
            String(row['Número de contrato']).trim() !== '' &&
            String(row['Número de contrato']).toLowerCase() !== 'sin asignar'
        ).length;

        // Contar empresas únicas
        const uniqueWorksCompanies = new Set(this.data.map(row => row['Empresa obras']).filter(Boolean));
        const uniqueSupervisionCompanies = new Set(this.data.map(row => row['Empresa supervisión']).filter(Boolean));

        // Promedios por etapa
        const designData = this.data.filter(row => row['Etapa'] === 'Diseño');
        const constructionData = this.data.filter(row => row['Etapa'] === 'Constructivo');
        const unassignedData = this.data.filter(row => !row['Número de contrato'] || String(row['Número de contrato']).trim() === '' || String(row['Número de contrato']).toLowerCase() === 'sin asignar');

        const avgDesign = designData.length > 0 ? 
            Math.round(designData.reduce((sum, row) => sum + (parseFloat(row['Porcentaje de avance 31/03/26']) || 0), 0) / designData.length) : 0;
        const avgConstruction = constructionData.length > 0 ? 
            Math.round(constructionData.reduce((sum, row) => sum + (parseFloat(row['Porcentaje de avance 31/03/26']) || 0), 0) / constructionData.length) : 0;

        this.dashboardStats = {
            total,
            withContract,
            uniqueWorksCompanies: uniqueWorksCompanies.size,
            uniqueSupervisionCompanies: uniqueSupervisionCompanies.size,
            avgDesign,
            avgConstruction,
            unassignedCount: unassignedData.length,
            percentageContracted: total > 0 ? Math.round((withContract / total) * 100) : 0
        };
    }

    initHomeView() {
        const homeGrid = document.getElementById('homeGrid');
        const stats = this.dashboardStats;

        homeGrid.innerHTML = `
            <div class="stat-card" onclick="app.navigateToView('analysis')">
                <div class="stat-icon"><i class="fas fa-school"></i></div>
                <div class="stat-label">Total de Centros</div>
                <div class="stat-value">${stats.total}</div>
                <div class="stat-subtitle">Centros Educativos</div>
            </div>

            <div class="stat-card" onclick="app.navigateToView('analysis')">
                <div class="stat-icon"><i class="fas fa-file-contract"></i></div>
                <div class="stat-label">Centros Habilitados</div>
                <div class="stat-value">${stats.withContract}</div>
                <div class="stat-subtitle">Con contrato asignado</div>
            </div>

            <div class="stat-card" onclick="app.navigateToView('dashboard')">
                <div class="stat-icon"><i class="fas fa-hard-hat"></i></div>
                <div class="stat-label">Empresas de Obras</div>
                <div class="stat-value">${stats.uniqueWorksCompanies}</div>
                <div class="stat-subtitle">Contratistas</div>
            </div>

            <div class="stat-card" onclick="app.navigateToView('dashboard')">
                <div class="stat-icon"><i class="fas fa-glasses"></i></div>
                <div class="stat-label">Supervisores</div>
                <div class="stat-value">${stats.uniqueSupervisionCompanies}</div>
                <div class="stat-subtitle">Empresas supervisoras</div>
            </div>

            <div class="stat-card" onclick="app.navigateToView('analysis')">
                <div class="stat-icon"><i class="fas fa-tools"></i></div>
                <div class="stat-label">Avance Diseño</div>
                <div class="stat-value">${stats.avgDesign}%</div>
                <div class="stat-subtitle">Promedio</div>
            </div>

            <div class="stat-card" onclick="app.navigateToView('analysis')">
                <div class="stat-icon"><i class="fas fa-hammer"></i></div>
                <div class="stat-label">Avance Construcción</div>
                <div class="stat-value">${stats.avgConstruction}%</div>
                <div class="stat-subtitle">Promedio</div>
            </div>

            <div class="stat-card" onclick="app.navigateToView('analysis')">
                <div class="stat-icon"><i class="fas fa-inbox"></i></div>
                <div class="stat-label">Sin Asignar</div>
                <div class="stat-value" style="font-size: 36px;">${stats.unassignedCount}</div>
                <div class="stat-subtitle">Centros sin contrato</div>
            </div>
        `;
    }

    navigateToView(viewName) {
        document.getElementById('homeView').classList.remove('active');
        document.getElementById('mainContainer').classList.add('active');
        this.switchView(viewName);
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
        document.getElementById('exportExcelBtn').addEventListener('click', () => this.exportToExcel());
        document.getElementById('exportPdfBtn').addEventListener('click', () => this.exportToPdf());
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

        uniqueValues('Grupo').forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            document.getElementById('groupFilter').appendChild(option);
        });

        uniqueValues('Departamento').forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            document.getElementById('departmentFilter').appendChild(option);
        });

        uniqueValues('Empresa obras').forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            document.getElementById('worksCompanyFilter').appendChild(option);
        });

        uniqueValues('Etapa').forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            document.getElementById('stageFilter').appendChild(option);
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
            department: document.getElementById('departmentFilter').value,
            district: document.getElementById('districtFilter').value,
            worksCompany: document.getElementById('worksCompanyFilter').value,
            stage: document.getElementById('stageFilter').value,
            contract: document.getElementById('contractFilter').value
        };

        this.filteredData = this.data.filter(row => {
            if (filters.group && row['Grupo'] != filters.group) return false;
            if (filters.department && row['Departamento'] !== filters.department) return false;
            if (filters.district && row['Distrito'] !== filters.district) return false;
            if (filters.worksCompany && row['Empresa obras'] !== filters.worksCompany) return false;
            if (filters.stage && row['Etapa'] !== filters.stage) return false;

            if (filters.contract === 'contracted') {
                const hasContract = row['Número de contrato'] && String(row['Número de contrato']).trim() !== '' && String(row['Número de contrato']).toLowerCase() !== 'sin asignar';
                if (!hasContract) return false;
            } else if (filters.contract === 'unassigned') {
                const hasContract = row['Número de contrato'] && String(row['Número de contrato']).trim() !== '' && String(row['Número de contrato']).toLowerCase() !== 'sin asignar';
                if (hasContract) return false;
            }

            return true;
        });

        this.currentPage = 1;
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
        this.displayData();
        this.updateMapMarkers();
    }

    clearAllFilters() {
        document.getElementById('groupFilter').value = '';
        document.getElementById('departmentFilter').value = '';
        document.getElementById('districtFilter').value = '';
        document.getElementById('districtFilter').disabled = true;
        document.getElementById('worksCompanyFilter').value = '';
        document.getElementById('stageFilter').value = '';
        document.getElementById('contractFilter').value = '';
        document.getElementById('searchInput').value = '';

        this.filteredData = [...this.data];
        this.currentPage = 1;
        this.displayData();
        this.updateMapMarkers();
        this.updateCharts();
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

        if (tableHeader.innerHTML === '') {
            const headers = this.columnsOrder.length > 0 ? this.columnsOrder : Object.keys(this.filteredData[0]);
            tableHeader.innerHTML = headers.map(key => `<th>${key}</th>`).join('');
        }

        const start = (this.currentPage - 1) * this.rowsPerPage;
        const end = start + this.rowsPerPage;
        const pageData = this.filteredData.slice(start, end);

        tableBody.innerHTML = pageData.map(row => {
            const cells = this.columnsOrder.length > 0 ? this.columnsOrder : Object.keys(row);
            return '<tr>' + cells.map(key => {
                let value = row[key] || '';
                if (String(value).length > 50) {
                    value = String(value).substring(0, 50) + '...';
                }
                return `<td>${value}</td>`;
            }).join('') + '</tr>';
        }).join('');

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

        this.map = L.map('map').setView([13.5, -88.9], 8);

        const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
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

        L.control.layers({
            'Calles': streetMap,
            'Satélite': satelliteMap,
            'Topográfico': topoMap
        }).addTo(this.map);

        streetMap.addTo(this.map);
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
        if (!container || !container.classList.contains('active')) {
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

        ws['!cols'] = Object.keys(this.filteredData[0]).map(() => ({ wch: 20 }));

        const filename = `Centros_Educativos_${new Date().getTime()}.xlsx`;
        XLSX.writeFile(wb, filename);
    }

    exportToPdf() {
        if (this.filteredData.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        const element = document.createElement('div');
        element.innerHTML = `
            <h1 style="text-align: center; color: #003d82;">Centros Educativos - Monitoreo BCIE 2256</h1>
            <p style="text-align: center; font-size: 12px;">Fecha: ${new Date().toLocaleDateString()}</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <thead>
                    <tr style="background-color: #003d82; color: white;">
                        ${Object.keys(this.filteredData[0]).map(key => `<th style="border: 1px solid #000; padding: 5px;">${key}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredData.slice(0, 100).map(row => `
                        <tr>
                            ${Object.keys(row).map(key => `<td style="border: 1px solid #ddd; padding: 5px;">${row[key] || ''}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        const opt = {
            margin: 5,
            filename: `Centros_Educativos_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
        };

        html2pdf().set(opt).from(element).save();
    }

    switchView(viewName) {
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

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

        if (window.innerWidth <= 768) {
            this.toggleSidebar();
        }
    }

    updateCharts() {
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
                        label: 'Centros',
                        data: Object.values(deptData),
                        backgroundColor: '#0066cc',
                        borderColor: '#003d82',
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
                        backgroundColor: ['#0066cc', '#ff9800', '#4caf50']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }

        // Gráfico de Empresas
        const companyData = {};
        this.filteredData.forEach(row => {
            const company = row['Empresa obras'] || 'Sin asignar';
            companyData[company] = (companyData[company] || 0) + 1;
        });

        const companyCtx = document.getElementById('worksCompanyChart');
        if (companyCtx) {
            this.chartInstances.company = new Chart(companyCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(companyData).slice(0, 5),
                    datasets: [{
                        label: 'Proyectos',
                        data: Object.values(companyData).slice(0, 5),
                        backgroundColor: '#005bb8',
                        borderColor: '#003d82',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: { x: { beginAtZero: true } }
                }
            });
        }

        // Gráfico de Avance
        const advanceData = {};
        this.filteredData.forEach(row => {
            const stage = row['Etapa'] || 'Sin asignar';
            if (!advanceData[stage]) {
                advanceData[stage] = {
                    total: 0,
                    sum: 0
                };
            }
            advanceData[stage].total += 1;
            advanceData[stage].sum += parseFloat(row['Porcentaje de avance 31/03/26']) || 0;
        });

        const advanceCtx = document.getElementById('advanceChart');
        if (advanceCtx) {
            this.chartInstances.advance = new Chart(advanceCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(advanceData),
                    datasets: [{
                        label: 'Avance Promedio (%)',
                        data: Object.values(advanceData).map(d => Math.round(d.sum / d.total)),
                        backgroundColor: '#0066cc',
                        borderColor: '#003d82',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, max: 100 } }
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

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DataAppV2();
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        document.getElementById('sidebar').classList.remove('closed');
        document.getElementById('toggleSidebar').classList.remove('show');
    }
});
