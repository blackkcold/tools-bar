const { createApp } = Vue;

const ParamInput = {
    props: ['label', 'modelValue', 'step', 'min', 'max', 'tip'],
    template: '#param-input-tpl'
};

const app = createApp({
    components: { ParamInput },
    data() {
        return {
                mobileMenuOpen: false,
            appConfig: JSON.parse(JSON.stringify(defaultConfig)),
            lastComputedConfig: null,
            simulationResults: null,
            assetComposition: null,
            scenarioResults: null,
            crisisDistribution: null,
            portfolioAllocation: null,
            costComparison: null,
            isDirty: false,
            isSimulating: false,
            simProgress: 0,
            simError: '',
            simTimeoutId: null,
            simTimerId: null,
            simChunkTimerId: null,
            activeTab: 'base',
            moduleTabs: uiSchema.moduleTabs,
            tableRows: uiSchema.tableRows,
            scenarioLabels: uiSchema.scenarioLabels,
            availableScenarios: ['base', 'high_inflation', 'housing_downturn', 'low_growth', 'job_loss', 'bull_market', 'double_shock'],
            draggingKey: null,
            sliderValues: { cash: 0, bond: 0, equity: 0, gold: 0, overseas: 0 }
        };
    },
    computed: {
        isAdvancedMode() {
            return this.appConfig.meta.model_complexity_mode === 'advanced';
        },
        isDualIncome() {
            return this.appConfig.meta.household_mode === 'dual_income';
        },
        incomeTaxModule() { return this.appConfig.income_tax_module; },
        pfModule() { return this.appConfig.pf_module; },
        housingModule() { return this.appConfig.housing_module; },
        mortgageModule() { return this.appConfig.mortgage_module; },
        portfolioModule() { return this.appConfig.portfolio_module; },
        crisisModule() { return this.appConfig.crisis_module; },
        lifeEventsModule() { return this.appConfig.life_events_module; },
        insuranceModule() { return this.appConfig.insurance_module; },
        analysisModule() { return this.appConfig.analysis_module; },
        hasResults() {
            return !!(this.simulationResults && this.simulationResults.buy_house && this.simulationResults.rent_house);
        },
        showLoadingResults() {
            return this.isSimulating && !this.hasResults;
        },
        allocTotalPct() {
            return this.sliderValues.cash + this.sliderValues.bond + this.sliderValues.equity + this.sliderValues.gold + this.sliderValues.overseas;
        },
        allocTotalClass() {
            return this.allocTotalPct === 100 ? 'ok' : 'warn';
        },
        allocPcts() {
            return this.sliderValues;
        }
    },
    methods: {

        getFieldTip(key) {
            return (uiSchema.fieldTips && uiSchema.fieldTips[key]) || '';
        },
        getButtonTip(key) {
            return (uiSchema.buttonTips && uiSchema.buttonTips[key]) || '';
        },
        
        // 资产配置滑块方法
        initSliderValues() {
            const p = this.appConfig.portfolio_module.params;
            this.sliderValues = {
                cash: Math.round(Number(p.cash_alloc || 0) * 100),
                bond: Math.round(Number(p.bond_alloc || 0) * 100),
                equity: Math.round(Number(p.equity_alloc || 0) * 100),
                gold: Math.round(Number(p.gold_alloc || 0) * 100),
                overseas: Math.round(Number(p.overseas_alloc || 0) * 100)
            };
        },
        startDrag(key) {
            this.draggingKey = key;
        },
        onDrag(key) {
            if (this.draggingKey !== key) return;
            const val = Math.max(0, Math.min(100, this.sliderValues[key]));
            const others = ['cash', 'bond', 'equity', 'gold'].filter(k => k !== key);
            const othersSum = others.reduce((a, k) => a + this.sliderValues[k], 0);
            const maxAllowed = 100 - othersSum;
            if (val > maxAllowed) {
                this.sliderValues[key] = maxAllowed;
            }
            this.sliderValues.overseas = Math.max(0, 100 - this.sliderValues.cash - this.sliderValues.bond - this.sliderValues.equity - this.sliderValues.gold);
        },
        endDrag(key) {
            this.draggingKey = null;
            this.commitAlloc(key);
        },
        commitAlloc(key) {
            const val = Math.max(0, Math.min(100, this.sliderValues[key]));
            const others = ['cash', 'bond', 'equity', 'gold'].filter(k => k !== key);
            const othersSum = others.reduce((a, k) => a + this.sliderValues[k], 0);
            const maxAllowed = 100 - othersSum;
            this.sliderValues[key] = Math.min(val, maxAllowed);
            this.sliderValues.overseas = Math.max(0, 100 - this.sliderValues.cash - this.sliderValues.bond - this.sliderValues.equity - this.sliderValues.gold);
            const p = this.appConfig.portfolio_module.params;
            p.cash_alloc = this.sliderValues.cash / 100;
            p.bond_alloc = this.sliderValues.bond / 100;
            p.equity_alloc = this.sliderValues.equity / 100;
            p.gold_alloc = this.sliderValues.gold / 100;
            p.overseas_alloc = this.sliderValues.overseas / 100;
            this.markDirty();
        },
        setMaxAlloc(key) {
            this.sliderValues.cash = 0;
            this.sliderValues.bond = 0;
            this.sliderValues.equity = 0;
            this.sliderValues.gold = 0;
            this.sliderValues[key] = 100;
            this.sliderValues.overseas = 0;
            this.commitAlloc(key);
        },
        setHouseholdMode(mode) {
            this.appConfig.meta.household_mode = mode;
            this.markDirty();
        },
        toggleHouseholdMode() {
            this.appConfig.meta.household_mode = this.appConfig.meta.household_mode === 'dual_income' ? 'single_income' : 'dual_income';
            this.markDirty();
        },
        setComplexityMode(mode) {
            this.appConfig.meta.model_complexity_mode = mode;
            if (mode === 'advanced') {
                this.appConfig.income_tax_module.mode = 'advanced';
                this.appConfig.pf_module.mode = 'advanced';
                this.appConfig.housing_module.mode = 'advanced';
                this.appConfig.mortgage_module.mode = 'advanced';
                this.appConfig.portfolio_module.mode = 'advanced';
                this.appConfig.crisis_module.mode = 'advanced';
                this.appConfig.analysis_module.mode = 'advanced';
            } else {
                this.appConfig.income_tax_module.mode = 'simple';
                this.appConfig.pf_module.mode = 'simple';
                this.appConfig.housing_module.mode = 'simple';
                this.appConfig.mortgage_module.mode = 'simple';
                this.appConfig.portfolio_module.mode = 'simple';
                this.appConfig.crisis_module.mode = 'simple';
                this.appConfig.analysis_module.mode = 'simple';
            }
            this.markDirty();
        },
        toggleComplexityMode() {
            const newMode = this.appConfig.meta.model_complexity_mode === 'simple' ? 'advanced' : 'simple';
            this.setComplexityMode(newMode);
        },
        toggleModuleMode(moduleName) {
            const module = this.appConfig[moduleName];
            if (module.hasOwnProperty('enabled')) {
                module.enabled = !module.enabled;
            } else {
                module.mode = module.mode === 'simple' ? 'advanced' : 'simple';
            }
            this.markDirty();
        },
        markDirty() {
            this.isDirty = true;
        },

        resetParams() {
            this.appConfig = JSON.parse(JSON.stringify(defaultConfig));
            this.simulationResults = null;
            this.assetComposition = null;
            this.scenarioResults = null;
            this.crisisDistribution = null;
            this.portfolioAllocation = null;
            this.lastComputedConfig = null;
            this.isDirty = false;
            this.normalizePortfolioAllocations();
            this.initSliderValues();
            chartBuilder.destroyAll();
        },
        restoreLastParams() {
            if (this.lastComputedConfig) {
                this.appConfig = JSON.parse(JSON.stringify(this.lastComputedConfig));
                this.isDirty = false;
                this.initSliderValues();
            }
        },

        validateConfig() {
            const cfg = this.appConfig;
            const errs = [];
            const m = cfg.meta, b = cfg.base, h = cfg.housing_module.params, p = cfg.portfolio_module.params;
            if (!m.n_sims || m.n_sims < 100) errs.push('Sims >= 100');
            if (!m.years || m.years < 5 || m.years > 50) errs.push('Years 5-50');
            if (!b.start_cash || b.start_cash < 0) errs.push('Start Cash >= 0');
            if (!h.house_price || h.house_price < 0) errs.push('House Price >= 0');
            if (h.loan_balance < 0) errs.push('Loan >= 0');
            if (h.loan_balance > h.house_price * 1.5) errs.push('Loan <= 1.5x Price');
            if (!b.annual_living_cost || b.annual_living_cost <= 0) errs.push('Living Cost > 0');
            if (!p.invest_mu || p.invest_mu < -0.3 || p.invest_mu > 0.5) errs.push('Return -30%~50%');
            if (!p.invest_sigma || p.invest_sigma < 0 || p.invest_sigma > 1) errs.push('Sigma 0~100%');
            return errs;
        },

        cancelSimulation() {
            this._clearAllTimers();
            this.isSimulating = false;
            this.simProgress = 0;
            this.simError = 'Cancelled / 已取消';
        },

        _clearAllTimers() {
            if (this.simTimeoutId) { clearTimeout(this.simTimeoutId); this.simTimeoutId = null; }
            if (this.simTimerId) { clearInterval(this.simTimerId); this.simTimerId = null; }
            if (this.simChunkTimerId) { clearTimeout(this.simChunkTimerId); this.simChunkTimerId = null; }
        },

        runSimulation() {
            if (this.isSimulating) return;

            const errs = this.validateConfig();
            if (errs.length > 0) {
                this.simError = errs[0];
                return;
            }

            this._clearAllTimers();
            this.simError = '';
            this.isSimulating = true;
            this.isDirty = false;
            this.simProgress = 0;

            const years = this.appConfig.meta.years;
            const n_sims = this.appConfig.meta.n_sims;
            const dualIncome = this.appConfig.meta.household_mode === 'dual_income';
            this.lastComputedConfig = JSON.parse(JSON.stringify(this.appConfig));

            const CHUNK = 25;
            let buyIdx = 0, rentIdx = 0;
            const buyArr = [], rentArr = [];

            const totalItems = n_sims * 2;
            const updateProgress = () => {
                const done = buyIdx + rentIdx;
                this.simProgress = Math.min(99, Math.round(done / totalItems * 100));
            };

            const runChunk = () => {
                if (!this.isSimulating) return;

                try {
                    const endBuy = Math.min(buyIdx + CHUNK, n_sims);
                    for (let i = buyIdx; i < endBuy; i++) {
                        buyArr.push(simulationEngine.simulateOnePath(this.appConfig, true, dualIncome));
                    }
                    buyIdx = endBuy;

                    const endRent = Math.min(rentIdx + CHUNK, n_sims);
                    for (let i = rentIdx; i < endRent; i++) {
                        rentArr.push(simulationEngine.simulateOnePath(this.appConfig, false, dualIncome));
                    }
                    rentIdx = endRent;

                    updateProgress();

                    if (buyIdx < n_sims || rentIdx < n_sims) {
                        this.simChunkTimerId = setTimeout(runChunk, 0);
                    } else {
                        this._finalize(buyArr, rentArr, years);
                    }
                } catch (e) {
                    this._clearAllTimers();
                    this.isSimulating = false;
                    this.simProgress = 0;
                    this.simError = 'Error: ' + e.message;
                }
            };

            this.simChunkTimerId = setTimeout(runChunk, 0);

            this.simTimeoutId = setTimeout(() => {
                if (this.isSimulating) {
                    this._clearAllTimers();
                    this.isSimulating = false;
                    this.simProgress = 0;
                    this.simError = 'Timeout 30s. Reduce sims or refresh / 超时请减少仿真次数';
                }
            }, 30000);
        },

        _finalize(buyArr, rentArr, years) {
            this._clearAllTimers();
            this.simProgress = 100;

            try {
                const buySummary = simulationEngine.summarizeResults(buyArr, years);
                const rentSummary = simulationEngine.summarizeResults(rentArr, years);
                const composition = simulationEngine.computeAssetComposition(buyArr, rentArr, years, this.appConfig.base.inflation);
                const crisisDist = simulationEngine.computeCrisisDistribution(buyArr);

                this.simulationResults = {
                    buy_house: buySummary,
                    rent_house: rentSummary,
                    summary: { buy_house: buySummary, rent_house: rentSummary },
                    traces: { buy_house: buyArr, rent_house: rentArr },
                    composition,
                    crisisDistribution: crisisDist,
                    diagnostics: {
                        ruin_prob_buy: buySummary.ruin_probability,
                        ruin_prob_rent: rentSummary.ruin_probability
                    }
                };
                this.assetComposition = composition;
                this.crisisDistribution = crisisDist;

                const p = this.appConfig.portfolio_module.params;
                this.portfolioAllocation = {
                    cash: p.cash_alloc, bond: p.bond_alloc, equity: p.equity_alloc,
                    gold: p.gold_alloc, overseas: p.overseas_alloc
                };
                this.costComparison = simulationEngine.computeCostComparison
                    ? simulationEngine.computeCostComparison(this.appConfig, years)
                    : null;

                if (this.isAdvancedMode && this.analysisModule.params.selected_scenarios?.length) {
                    this.runScenariosAsync();
                } else {
                    this.scenarioResults = null;
                }

                this.isSimulating = false;
                this.simProgress = 0;

                setTimeout(() => {
                    try { this.updateCharts(); } catch(e) { console.error('Chart:', e); this.simError = 'Chart render error: ' + e.message; }
                }, 0);

            } catch (e) {
                this.isSimulating = false;
                this.simProgress = 0;
                this.simError = 'Summary error: ' + e.message;
            }
        },

        updateCharts() {
            if (!this.simulationResults) return;

            const { buy_house, rent_house } = this.simulationResults.summary || this.simulationResults;

            try { chartBuilder.createMainChart('mainChart', buy_house.median_trace, rent_house.median_trace); } catch(e) { console.error('Main chart:', e); }

            if (this.isAdvancedMode) {
                try {
                    chartBuilder.createRangeChart('rangeChart',
                        buy_house.p10_trace, buy_house.median_trace, buy_house.p90_trace,
                        rent_house.p10_trace, rent_house.median_trace, rent_house.p90_trace
                    );
                } catch(e) { console.error('Range chart:', e); }
            }

            if (this.assetComposition) {
                const comp = this.assetComposition;
                try {
                    chartBuilder.createPieChart('pieBuyChart',
                        [parseFloat(comp.buy.cashWan) || 0, parseFloat(comp.buy.equityWan) || 0],
                        ['Cash / 现金', 'House Equity / 房产净值'],
                        ['#3b82f6', '#818cf8']
                    );
                } catch(e) { console.error('Buy pie:', e); }
                try {
                    chartBuilder.createPieChart('pieRentChart',
                        [parseFloat(comp.rent.cashWan) || 0],
                        ['Cash / 现金'],
                        ['#10b981']
                    );
                } catch(e) { console.error('Rent pie:', e); }
            }

            if (this.isAdvancedMode && this.crisisDistribution) {
                try { chartBuilder.createCrisisChart('crisisChart', this.crisisDistribution); } catch(e) { console.error('Crisis chart:', e); }
            }

            if (this.isAdvancedMode && this.portfolioAllocation) {
                try { chartBuilder.createPortfolioChart('portfolioChart', this.portfolioAllocation); } catch(e) { console.error('Portfolio chart:', e); }
            }

            if (this.isAdvancedMode && this.costComparison) {
                try { chartBuilder.createCostChart('costChart', this.costComparison); } catch(e) { console.error('Cost chart:', e); }
            }
        },

        runScenariosAsync() {
            const selected = this.appConfig.analysis_module.params.selected_scenarios;
            const { years, n_sims } = this.appConfig.meta;
            this.scenarioResults = {};
            chartBuilder.destroyOne && chartBuilder.destroyOne('scenarioChart');
            let idx = 0;

            const runOne = () => {
                if (idx >= selected.length) {
                    setTimeout(() => {
                        try {
                            const scenarios = selected.map(s => this.scenarioResults[s]);
                            chartBuilder.createScenarioChart('scenarioChart', scenarios);
                        } catch(e) { console.error('Scenario chart:', e); }
                    }, 0);
                    return;
                }
                const scenarioName = selected[idx++];
                try {
                    this.scenarioResults[scenarioName] = scenarioRunner.runScenario(
                        this.appConfig, scenarioName, years, Math.min(n_sims, 200)
                    );
                } catch(e) { console.error('Scenario ' + scenarioName + ':', e); }
                setTimeout(runOne, 0);
            };

            setTimeout(runOne, 0);
        },

        exportConfig() { exportHelpers.exportConfig(this.appConfig); },
        exportResults() {
            if (this.simulationResults) exportHelpers.exportResults(this.simulationResults, this.appConfig);
        },
        importConfig(event) {
            const file = event.target.files[0];
            if (!file) return;
            exportHelpers.importConfig(file, (config) => {
                if (config) {
                    this.appConfig = this.deepMerge(this.appConfig, config);
                    this.normalizePortfolioAllocations();
                    this.markDirty();
                    this.$nextTick(() => this.applyAutoTooltips());
                }
            });
            event.target.value = '';
        },

        addLifeEvent() {
            this.appConfig.life_events_module.params.events.push({
                id: 'event_' + Date.now(),
                type: 'custom',
                start_year: 5,
                duration_years: 3,
                amount_annual: 50000,
                growth_rate: 0.03,
                probability: 1.0,
                inflation_linked: true
            });
            this.markDirty();
        },
        removeLifeEvent(idx) {
            this.appConfig.life_events_module.params.events.splice(idx, 1);
            this.markDirty();
        },


        allocationControlledKeys() {
            return ['cash_alloc', 'bond_alloc', 'equity_alloc', 'gold_alloc'];
        },
        allocationLabels() {
            return {
                mobileMenuOpen: false,
                cash_alloc: '现金 / Cash',
                bond_alloc: '债券 / Bond',
                equity_alloc: '股票 / Equity',
                gold_alloc: '黄金 / Gold',
                overseas_alloc: '海外 / Overseas'
            };
        },
        portfolioSliderTip(label) {
            const tips = {
                '现金 / Cash': '建议值：10%–30%。原因：承担应急与低波动缓冲，比例过低会削弱抗风险能力，过高会拖累长期回报。',
                '债券 / Bond': '建议值：10%–30%。原因：用于降低组合波动、平滑回撤，适合作为股票资产的稳定器。',
                '股票 / Equity': '建议值：40%–70%。原因：承担长期增长的核心收益来源，但波动最高，应结合风险承受能力控制比例。',
                '黄金 / Gold': '建议值：0%–15%。原因：主要对冲通胀、地缘与极端波动，不宜过高，否则会压低长期复合收益。',
                '海外 / Overseas': '建议值：0%–20%。原因：用于分散单一市场风险，剩余比例自动分配到该项，便于精确控制前四类资产。'
            };
            return tips[label] || '';
        },
        getAllocationPercent(key) {
            const v = Number(this.appConfig.portfolio_module.params[key] || 0);
            return Math.round(v * 100);
        },
        getAllocationRemaining(excludeKey = null) {
            const p = this.appConfig.portfolio_module.params;
            let used = 0;
            for (const key of this.allocationControlledKeys()) {
                if (key === excludeKey) continue;
                used += Number(p[key] || 0) * 100;
            }
            return Math.max(0, Math.round((100 - used) * 100) / 100);
        },
        normalizePortfolioAllocations() {
            const p = this.appConfig.portfolio_module.params;
            const keys = this.allocationControlledKeys();
            let vals = keys.map(k => Math.max(0, Number(p[k] || 0)));
            let sum = vals.reduce((a,b)=>a+b,0);
            if (sum > 1) {
                vals = vals.map(v => v / sum);
                sum = 1;
            }
            keys.forEach((k,i) => {
                p[k] = Number(vals[i].toFixed(4));
            });
            p.overseas_alloc = Number(Math.max(0, 1 - keys.reduce((a,k)=>a+Number(p[k]||0),0)).toFixed(4));
        },
        setControlledAllocation(key, value) {
            const p = this.appConfig.portfolio_module.params;
            const raw = Math.max(0, Number(value || 0));
            const max = this.getAllocationRemaining(key);
            const next = Math.min(raw, max);
            p[key] = Number((next / 100).toFixed(4));
            const controlledSum = this.allocationControlledKeys().reduce((a,k)=>a + Number(p[k] || 0), 0);
            p.overseas_alloc = Number(Math.max(0, 1 - controlledSum).toFixed(4));
            this.markDirty();
        },

        formatWan(val) {
            if (val === undefined || val === null || isNaN(val)) return '-';
            return val.toFixed(2) + ' 万';
        },
        formatPct(val) {
            if (val === undefined || val === null || isNaN(val)) return '-';
            return (val * 100).toFixed(2) + ' %';
        },
        formatVal(val, type) {
            if (val === undefined || val === null || isNaN(val)) return '-';
            if (type === 'pct') return (val * 100).toFixed(2) + ' %';
            if (type === 'year') return val.toFixed(1) + ' 年';
            if (type === 'count') return val.toFixed(2) + ' 次';
            return val.toFixed(2) + ' 万';
        },
        diffColor(diff, reverseColor) {
            if (isNaN(diff)) return '';
            let good = diff > 0;
            if (reverseColor) good = !good;
            return good ? 'text-green-600' : 'text-red-600';
        },

        deepMerge(target, source) {
            if (!source || typeof source !== 'object') return target;
            const output = Array.isArray(target) ? [...target] : { ...target };
            for (const key of Object.keys(source)) {
                const srcVal = source[key];
                const tgtVal = output[key];
                if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal) && tgtVal && typeof tgtVal === 'object' && !Array.isArray(tgtVal)) {
                    output[key] = this.deepMerge(tgtVal, srcVal);
                } else {
                    output[key] = srcVal;
                }
            }
            return output;
        }
    },
    mounted() {
        this.normalizePortfolioAllocations();
        this.initSliderValues();
    }
});

app.mount('#app');
