// ============================================================
// charts.js - Chart builder and export helpers
// ============================================================

// ============================================================
// 模块13: 图表构建器 (chartBuilder)
// ============================================================
const chartBuilder = {
    instances: {},

    destroyAll: function() {
        for (const key in this.instances) {
            if (this.instances[key]) {
                try { this.instances[key].destroy(); } catch(e) {}
                delete this.instances[key];
            }
        }
    },

    destroyOne: function(canvasId) {
        if (this.instances[canvasId]) {
            try { this.instances[canvasId].destroy(); } catch(e) {}
            delete this.instances[canvasId];
        }
    },

    createMainChart: function(canvasId, buyMedian, rentMedian) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) { try { this.instances[canvasId].destroy(); } catch(e) {} }

        const labels = buyMedian.map((_, i) => `Y${i + 1}`);
        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Buy / 买房',
                        data: buyMedian,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.08)',
                        borderWidth: 2.5,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 2,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Rent / 租房',
                        data: rentMedian,
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        borderWidth: 2.5,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 2,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.dataset.label + ': ' + (ctx.parsed.y || 0).toFixed(2) + ' 万'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(0,0,0,0.04)' }
                    },
                    y: {
                        title: { display: true, text: 'Real Wealth / 真实购买力 (万元)' },
                        grid: { color: 'rgba(0,0,0,0.04)' }
                    }
                }
            }
        });
    },

    createRangeChart: function(canvasId, buyP10, buyMedian, buyP90, rentP10, rentMedian, rentP90) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) { try { this.instances[canvasId].destroy(); } catch(e) {} }

        const labels = buyMedian.map((_, i) => `Y${i + 1}`);

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'Buy P90', data: buyP90, borderColor: 'rgba(59,130,246,0.25)', fill: false, tension: 0.3, pointRadius: 0 },
                    { label: 'Buy P50', data: buyMedian, borderColor: 'rgb(59,130,246)', borderWidth: 2, fill: false, tension: 0.3, pointRadius: 0 },
                    { label: 'Buy P10', data: buyP10, borderColor: 'rgba(59,130,246,0.25)', fill: '-1', tension: 0.3, pointRadius: 0 },
                    { label: 'Rent P90', data: rentP90, borderColor: 'rgba(16,185,129,0.25)', fill: false, tension: 0.3, pointRadius: 0 },
                    { label: 'Rent P50', data: rentMedian, borderColor: 'rgb(16,185,129)', borderWidth: 2, fill: false, tension: 0.3, pointRadius: 0 },
                    { label: 'Rent P10', data: rentP10, borderColor: 'rgba(16,185,129,0.25)', fill: '-1', tension: 0.3, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    y: {
                        title: { display: true, text: 'Real Wealth / 真实购买力 (万元)' }
                    }
                }
            }
        });
    },

    createPieChart: function(canvasId, data, labels, colors) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) { try { this.instances[canvasId].destroy(); } catch(e) {} }

        const safeData = data.map(v => (isNaN(v) || v == null ? 0 : v));
        this.instances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: safeData,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const total = safeData.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? (ctx.raw / total * 100).toFixed(1) : 0;
                                return ctx.label + ' ' + (ctx.raw || 0).toFixed(2) + ' 万 (' + pct + '%)';
                            }
                        }
                    }
                }
            }
        });
    },

    createScenarioChart: function(canvasId, scenarios) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) { try { this.instances[canvasId].destroy(); } catch(e) {} }

        const labels = ['Base', 'High Inf', 'Housing Dn', 'Low Grwth', 'Job Loss', 'Bull Mkt', 'Dbl Shck'];
        const buyMedians = scenarios.map(s => s && s.results ? (s.results.summary.buy_house.median_real_wan || 0) : 0);
        const rentMedians = scenarios.map(s => s && s.results ? (s.results.summary.rent_house.median_real_wan || 0) : 0);

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Buy / 买房', data: buyMedians, backgroundColor: 'rgba(59,130,246,0.8)' },
                    { label: 'Rent / 租房', data: rentMedians, backgroundColor: 'rgba(16,185,129,0.8)' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { title: { display: true, text: 'Real Wealth / 真实购买力 (万元)' } } }
            }
        });
    },

    createCrisisChart: function(canvasId, distribution) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) { try { this.instances[canvasId].destroy(); } catch(e) {} }

        const keys = Object.keys(distribution).map(Number).sort((a, b) => a - b);
        const values = keys.map(k => distribution[k] || 0);

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: keys.map(k => k + 'x'),
                datasets: [{
                    label: 'Count / 次数',
                    data: values,
                    backgroundColor: 'rgba(239,68,68,0.6)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    },


    createCostChart: function(canvasId, comparison) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) { try { this.instances[canvasId].destroy(); } catch(e) {} }

        const labels = comparison.buy.map((_, i) => `Y${i + 1}`);
        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: '买房累计成本（折现） / Buy Cost (Discounted)', data: comparison.buy, borderColor: 'rgb(59,130,246)', backgroundColor: 'rgba(59,130,246,0.08)', borderWidth: 2, tension: 0.3, fill: false, pointRadius: 0 },
                    { label: '租房累计成本（折现） / Rent Cost (Discounted)', data: comparison.rent, borderColor: 'rgb(16,185,129)', backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 2, tension: 0.3, fill: false, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { title: { display: true, text: '累计成本（折现）/ Discounted Cost (万元)' } } }
            }
        });
    },

    createPortfolioChart: function(canvasId, allocation) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) { try { this.instances[canvasId].destroy(); } catch(e) {} }

        this.instances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Cash', 'Bond', 'Equity', 'Gold', 'Overseas'],
                datasets: [{
                    data: [
                        (allocation.cash || 0) * 100,
                        (allocation.bond || 0) * 100,
                        (allocation.equity || 0) * 100,
                        (allocation.gold || 0) * 100,
                        (allocation.overseas || 0) * 100
                    ],
                    backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#6366f1']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
};

// ============================================================
// 模块14: 导出助手 (exportHelpers)
// ============================================================
const exportHelpers = {
    exportConfig: function(appConfig) {
        const data = {
            version: appConfig.meta.version,
            exportedAt: new Date().toISOString(),
            config: JSON.parse(JSON.stringify(appConfig))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `family_wealth_config_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    importConfig: function(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                callback(data.config);
            } catch (err) {
                alert('File error: ' + err.message);
            }
        };
        reader.readAsText(file);
    },

    exportResults: function(results, appConfig) {
        const data = {
            exportedAt: new Date().toISOString(),
            meta: {
                years: appConfig.meta.years,
                nSims: appConfig.meta.n_sims,
                householdMode: appConfig.meta.household_mode
            },
            summary: results.summary,
            composition: results.composition
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `family_wealth_results_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
};
