// ==========================================
// 杨昊燃 Tools Bar - 核心业务引擎 (修复全功能弹窗)
// ==========================================

const CACHE_EXPIRE_MS = 24 * 60 * 60 * 1000; // 24小时防封禁缓存

// 核心工具配置清单：每个工具都必须有 htmlFile 才能触发全屏弹窗！
const tools = {
    calculator: { name: "高级科学计算器", icon: "calculate", htmlFile: "tools/calculator/calc_fragment.html" },
    carLoan: { name: "全能购车计算器", icon: "directions_car", htmlFile: "tools/car_loan/car_loan.html" },
    evTracker: { name: "电车电费日志", icon: "ev_station", htmlFile: "tools/ev_tracker/ev_tracker.html" },
    evEnergyCal: { name: "EV续航与成本", icon: "battery_charging_full", htmlFile: "tools/ev_energy/ev_energy_cal.html" },
    mortgage: { name: "房贷组合计算", icon: "real_estate_agent", htmlFile: "tools/mortgage/mortgage_fragment.html" },
    weather: { name: "多城实时天气", icon: "cloud", htmlFile: "tools/weather/weather.html" },
    currency: { name: "汇率多国对比", icon: "currency_exchange", htmlFile: "tools/currency/currency.html" },
    deposit: { name: "2025存款利率", icon: "savings", htmlFile: "tools/deposit/deposit.html" },
    stocks: { name: "股市行情预览", icon: "trending_up", htmlFile: "tools/stocks/stocks.html" },
    familyWealth: { name: "家庭资产韧性仿真引擎 v2.0", icon: "insights", htmlFile: "tools/family_wealth/family_wealth_sim_v2.html" }
};

const grid = document.getElementById('plugin-grid');
const panelsGrid = document.getElementById('panels-grid');
const dialog = document.getElementById('tool-dialog');
const featureView = document.getElementById('feature-view');


// ==========================================
// 全局数据中心 (支持跨 iframe 共享，每天只抓取一次)
// ==========================================
window.GlobalDataManager = {
    CACHE_MS: 24 * 60 * 60 * 1000,
    
    async fetchWithCache(key, fetcher, forceRefresh = false) {
        const cacheKey = `global_data_${key}`;
        const timeKey = `global_time_${key}`;
        const cached = localStorage.getItem(cacheKey);
        const savedTime = localStorage.getItem(timeKey);
        const now = Date.now();

        if (!forceRefresh && cached && savedTime && (now - savedTime < this.CACHE_MS)) {
            return JSON.parse(cached);
        }

        try {
            const data = await fetcher();
            localStorage.setItem(cacheKey, JSON.stringify(data));
            localStorage.setItem(timeKey, now);
            return data;
        } catch (e) {
            console.error(`[${key}] Fetch error:`, e);
            if (cached) return JSON.parse(cached); // fallback to old cache
            return null;
        }
    },

    
    async getWeather(forceRefresh = false) {
        return this.fetchWithCache('weather_multi_json', async () => {
            const cities = ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Hong Kong', 'London', 'Budapest', 'New York'];
            const results = {};
            
            // Fetch in parallel but gracefully handle failures
            await Promise.allSettled(cities.map(async (city) => {
                try {
                    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
                    if (res.ok) {
                        const data = await res.json();
                        results[city] = {
                            temp: data.current_condition[0].temp_C,
                            desc: data.current_condition[0].weatherDesc[0].value,
                            humidity: data.current_condition[0].humidity,
                            wind: data.current_condition[0].windspeedKmph
                        };
                    }
                } catch(e) {
                    console.error(`Failed to fetch weather for ${city}`);
                }
            }));
            
            if (Object.keys(results).length === 0) throw new Error("All weather APIs failed");
            return results;
        }, forceRefresh);
    },
async getCurrency(forceRefresh = false) {
        return this.fetchWithCache('currency_json', async () => {
            const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
            if (!res.ok) throw new Error("Currency API failed");
            return await res.json();
        }, forceRefresh);
    },

    async getStocks(forceRefresh = false) {
        return this.fetchWithCache('stocks_json', async () => {
            if (!window.StockMarketData || !window.StockMarketData.fetchStocksAndCrypto) {
                throw new Error('StockMarketData helper missing');
            }
            return await window.StockMarketData.fetchStocksAndCrypto();
        }, forceRefresh);
    }
};

// ==========================================
// 弹窗与交互模块
// ==========================================
window.openTool = function(key) {
    const tool = tools[key];
    if (!tool || !tool.htmlFile) {
        console.error("工具源码未配置", key);
        alert("此工具暂无全屏界面，请在上方看板查看。");
        return;
    }
    document.getElementById('dialog-title').innerText = tool.name;
    dialog.style.display = 'flex';
        // 强制使用沙盒 iframe，绝对保证所有高阶图表、Vue、表单、API 的完美独立运行
    featureView.innerHTML = `<iframe id="tool-iframe" src="${tool.htmlFile}" style="width:100%;height:100%;border:none;border-radius:12px;flex:1;background:#fff;"></iframe>`;
};

window.runQuickCalc = function(inputId) {
    const input = document.getElementById(inputId);
    if (!input || !window.CalculatorCore) {
        return;
    }

    try {
        input.value = window.CalculatorCore.evaluateExpression(input.value);
    } catch (error) {
        input.value = 'Error';
    }
};

window.closeTool = function() {
    dialog.style.display = 'none';
    featureView.innerHTML = '';
};

window.pinTool = function(e, key) {
    e.stopPropagation(); 
    let pinned = JSON.parse(localStorage.getItem('pinnedTools') || '[]');
    if (!pinned.includes(key)) {
        pinned.push(key);
        localStorage.setItem('pinnedTools', JSON.stringify(pinned));
        renderPanels();
    }
};

window.unpinTool = function(key) {
    let pinned = JSON.parse(localStorage.getItem('pinnedTools') || '[]');
    pinned = pinned.filter(k => k !== key);
    localStorage.setItem('pinnedTools', JSON.stringify(pinned));
    renderPanels();
};

// ==========================================
// 数据与缓存引擎 (24小时免打扰策略)
// ==========================================
async function cachedFetch(key, fetcher, isManualRefresh = false) {
    const cacheKey = `widget_data_${key}`;
    const cacheTimeKey = `widget_time_${key}`;
    
    const savedData = localStorage.getItem(cacheKey);
    const savedTime = localStorage.getItem(cacheTimeKey);
    const now = Date.now();

    // 未过期且非强制刷新，秒回缓存
    if (!isManualRefresh && savedData && savedTime && (now - savedTime < CACHE_EXPIRE_MS)) {
        return savedData;
    }

    try {
        const resultHtml = await fetcher();
        localStorage.setItem(cacheKey, resultHtml);
        localStorage.setItem(cacheTimeKey, now);
        return resultHtml;
    } catch (e) {
        console.error(`[${key}] API Error:`, e);
        if (savedData) return savedData + `<div style="font-size:11px;color:#ef4444;text-align:center;margin-top:8px;">网络异常，当前为历史缓存</div>`;
        return `<div style="color:#ef4444;text-align:center;padding:20px;"><span class="material-icons" style="font-size:36px;opacity:0.5;">cloud_off</span><br>数据加载失败</div>`;
    }
}

window.refreshWidget = async function(key) {
    const btn = document.getElementById(`refresh-btn-${key}`);
    if(btn) btn.style.transform = "rotate(360deg)";
    
    const contentBox = document.getElementById(`widget-${key}`);
    if (contentBox) contentBox.innerHTML = `<div style="text-align:center;padding:30px;color:#9ca3af;">🔄 数据同步中...</div>`;
    
    try {
        const content = await getWidgetContent(key, true); // true = 强制无视缓存
        if (contentBox) contentBox.innerHTML = content;
    } catch (error) {
        console.error(`Widget refresh failed for ${key}:`, error);
        if (contentBox) {
            contentBox.innerHTML = `<div style="text-align:center;padding:30px;color:#ef4444;">刷新失败，请稍后重试</div>`;
        }
    } finally {
        if(btn) setTimeout(() => { btn.style.transform = "none"; }, 500);
    }
};

// ==========================================
// 各小组件直出 HTML 构建器 (不影响全屏版的 iframe)
// ==========================================
async function getWidgetContent(key, isManualRefresh = false) {
    
    if (key === 'weather') {
        return await cachedFetch('weather_widget', async () => {
            const data = await window.GlobalDataManager.getWeather(isManualRefresh);
            
            // Read widget preference from localStorage
            let selectedCities = JSON.parse(localStorage.getItem('weather_widget_cities') || '["Beijing"]');
            
            let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
            
            for (const city of selectedCities) {
                const cityData = data[city] || data['Beijing']; // fallback if missing
                if (!cityData) continue;
                
                // Show city name label
                const cityNameMap = {
                    'Beijing': '北京', 'Shanghai': '上海', 'Guangzhou': '广州', 
                    'Shenzhen': '深圳', 'Hong Kong': '香港', 'London': '伦敦', 
                    'Budapest': '布达佩斯', 'New York': '纽约'
                };
                const displayCity = cityNameMap[city] || city;
                
                html += `
                    <div style="background:#f8fafc; border-radius:12px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="text-align:left;">
                            <div style="font-size:14px; font-weight:bold; color:#1e293b;">${displayCity}</div>
                            <div style="font-size:12px; color:#64748b;">${cityData.desc}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:24px; font-weight:bold; color:#2563eb; line-height:1;">${cityData.temp}°</div>
                        </div>
                    </div>
                `;
            }
            
            const dateStr = new Date().toLocaleDateString('zh-CN', {month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute:'2-digit'});
            
            html += `
                <div style="font-size:11px; color:#9ca3af; text-align:center; margin-top:5px;">更新于 ${dateStr}</div>
                <button class="widget-action-btn" onclick="openTool('weather')" style="margin-top:8px;">查看全局天气详情与设置</button>
            </div>`;
            return html;
        }, isManualRefresh);
    }
    else if (key === 'currency') {
        return await cachedFetch('currency', async () => {
            const data = await window.GlobalDataManager.getCurrency(isManualRefresh);
            return `
                <div class="widget-row"><span>USD -> CNY (人民币)</span><b>${data.rates.CNY.toFixed(4)}</b></div>
                <div class="widget-row"><span>USD -> EUR (欧元)</span><b>${data.rates.EUR.toFixed(4)}</b></div>
                <div class="widget-row"><span>USD -> JPY (日元)</span><b>${data.rates.JPY.toFixed(4)}</b></div>
                <div class="widget-row"><span>USD -> GBP (英镑)</span><b>${data.rates.GBP.toFixed(4)}</b></div>
                <div class="widget-row" style="border-bottom:none;"><span>USD -> AUD (澳元)</span><b>${data.rates.AUD.toFixed(4)}</b></div>
                <button class="widget-action-btn" onclick="openTool('currency')">进行全能精准换算</button>`;
        }, isManualRefresh);
    }
    else if (key === 'deposit') {
        return `
            <div style="margin-bottom:15px;color:#059669;font-weight:bold;font-size:12px;text-align:center;background:#ecfdf5;padding:6px;border-radius:6px;">🟢 2025四大行挂牌基准利率</div>
            <div class="widget-row"><span>活期存款</span><b>0.10%</b></div>
            <div class="widget-row"><span>定期一年</span><b>1.10%</b></div>
            <div class="widget-row"><span>定期三年</span><b>1.50%</b></div>
            <div class="widget-row" style="border-bottom:none;"><span>定期五年</span><b>1.55%</b></div>
            <button class="widget-action-btn" onclick="openTool('deposit')">进入本息复利试算</button>`;
    }
    else if (key === 'stocks') {
        return await cachedFetch('stocks', async () => {
            const data = await window.GlobalDataManager.getStocks(isManualRefresh);
            let shData = ['--', '0'];
            let szData = ['--', '0'];
            let ndxData = ['--', '0'];
            let btcData = ['--', '0'];
            
            if (data && data.stocks) {
                if (data.stocks['sh000001']) shData = [data.stocks['sh000001'].price.toFixed(2), data.stocks['sh000001'].change_pct.toFixed(2)];
                if (data.stocks['sz399001']) szData = [data.stocks['sz399001'].price.toFixed(2), data.stocks['sz399001'].change_pct.toFixed(2)];
                if (data.stocks['us.NDX']) ndxData = [data.stocks['us.NDX'].price.toFixed(2), data.stocks['us.NDX'].change_pct.toFixed(2)];
            }
            if (data && data.crypto && data.crypto['BTCUSDT']) {
                btcData = [data.crypto['BTCUSDT'].price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}), data.crypto['BTCUSDT'].change_pct.toFixed(2)];
            }

            const colorStyle = (pct) => parseFloat(pct) > 0 ? "color:#ef4444;" : parseFloat(pct) < 0 ? "color:#059669;" : "color:#6b7280;";
            const formatPct = (pct) => parseFloat(pct) > 0 ? `+${pct}%` : `${pct}%`;

            return `
                <div class="widget-row"><span>上证指数</span><b style="${colorStyle(shData[1])}">${shData[0]} (${formatPct(shData[1])})</b></div>
                <div class="widget-row"><span>深证成指</span><b style="${colorStyle(szData[1])}">${szData[0]} (${formatPct(szData[1])})</b></div>
                <div class="widget-row"><span>纳斯达克</span><b style="${colorStyle(ndxData[1])}">${ndxData[0]} (${formatPct(ndxData[1])})</b></div>
                <div class="widget-row" style="border-bottom:none;"><span>比特币 (BTC)</span><b style="${colorStyle(btcData[1])}">$${btcData[0]} (${formatPct(btcData[1])})</b></div>
                <button class="widget-action-btn" onclick="openTool('stocks')">点击查看全局实时图表大盘</button>`;
        }, isManualRefresh);
    }
    else if (key === 'familyWealth') {
        return `
            <div style="text-align:center; padding:10px 0;">
                <span class="material-icons" style="font-size:48px; color:#7c3aed; margin-bottom:10px;">insights</span>
                <div style="font-size:13px; color:#4b5563; margin-bottom:15px; line-height:1.6;">家庭资产韧性与现金流压力测试<br>Vue3 引擎 | 单/双收入切换 | 简化/复杂模式<br>支持配置导出导入 | 500-5000 次仿真</div>
                <button class="widget-action-btn" style="background:#f3e8ff;color:#6d28d9;" onclick="openTool('familyWealth')">启动极限压力仿真模型</button>
            </div>`;
    }
    else if (key === 'calculator') {
        return `
            <div style="text-align:center; padding:0;">
                <div style="font-size:13px; color:#6b7280; margin-bottom:10px;">支持复杂科学函数</div>
                <input type="text" placeholder="快捷输入 (如 3*4)" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:8px; box-sizing:border-box; margin-bottom:10px;" id="fast-calc">
                <button class="widget-action-btn" style="margin-top:0;" onclick="runQuickCalc('fast-calc')">快捷计算</button>
                <div style="margin-top:15px;"><a href="#" onclick="openTool('calculator')" style="color:#2563eb; font-size:13px; text-decoration:none; font-weight:bold;">进入完整高级计算器 →</a></div>
            </div>`;
    }
    else if (key === 'carLoan' || key === 'mortgage') {
        const title = key === 'carLoan' ? '全能购车方案' : '房贷组合方案';
        return `
            <div style="text-align:center; padding:10px 0;">
                <span class="material-icons" style="font-size:48px; color:#9ca3af; margin-bottom:10px;">${tools[key].icon}</span>
                <div style="font-size:13px; color:#4b5563; margin-bottom:15px;">计算包含LPR浮动、提前还款违约金<br>以及多种还款方式对比的${title}</div>
                <button class="widget-action-btn" onclick="openTool('${key}')">唤起${title}面板</button>
            </div>`;
    }
    else if (key === 'evTracker') {
        return `
            <div style="text-align:center; padding:10px 0;">
                <span class="material-icons" style="font-size:48px; color:#059669; margin-bottom:10px;">bolt</span>
                <div style="font-size:13px; color:#4b5563; margin-bottom:15px;">记录您的每一次充电、换电与电耗分析<br>支持多车管理与 Excel 导出</div>
                <button class="widget-action-btn" style="background:#ecfdf5;color:#059669;" onclick="openTool('evTracker')">进入车辆日志系统</button>
            </div>`;
    }
    else if (key === 'evEnergyCal') {
        return `
            <div style="padding:5px 0;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:15px;">
                    <div style="background:#eff6ff; border-radius:8px; padding:12px; text-align:center;">
                        <div style="font-size:11px; color:#6b7280; margin-bottom:4px;">CLTC 续航</div>
                        <div style="font-size:20px; font-weight:bold; color:#1e88e5;">500 km</div>
                    </div>
                    <div style="background:#f0fdf4; border-radius:8px; padding:12px; text-align:center;">
                        <div style="font-size:11px; color:#6b7280; margin-bottom:4px;">百公里电耗</div>
                        <div style="font-size:20px; font-weight:bold; color:#16a34a;">15 kWh</div>
                    </div>
                    <div style="background:#fef3c7; border-radius:8px; padding:12px; text-align:center;">
                        <div style="font-size:11px; color:#6b7280; margin-bottom:4px;">家充谷电成本</div>
                        <div style="font-size:20px; font-weight:bold; color:#d97706;">¥0.43/km</div>
                    </div>
                    <div style="background:#fce7f3; border-radius:8px; padding:12px; text-align:center;">
                        <div style="font-size:11px; color:#6b7280; margin-bottom:4px;">商业快充成本</div>
                        <div style="font-size:20px; font-weight:bold; color:#db2777;">¥0.90/km</div>
                    </div>
                </div>
                <div style="font-size:12px; color:#9ca3af; text-align:center; margin-bottom:10px;">支持 CLTC/WLTP/EPA 续航换算 | 峰谷电价精算</div>
                <button class="widget-action-btn" style="background:#eff6ff;color:#1e88e5;" onclick="openTool('evEnergyCal')">启动 EV 续航成本计算</button>
            </div>`;
    }
}

// ==========================================
// 界面渲染层
// ==========================================
async function renderPanels() {
    if (!panelsGrid) return;
    panelsGrid.innerHTML = '';
    const pinned = JSON.parse(localStorage.getItem('pinnedTools') || '[]');
    const panelTasks = pinned.map(async (key) => {
        const item = tools[key];
        if (!item) return null;

        const panel = document.createElement('div');
        panel.className = 'panel-card';

        const isDataWidget = ['weather', 'currency', 'stocks'].includes(key);
        const refreshBtnHtml = isDataWidget ? `<button id="refresh-btn-${key}" onclick="refreshWidget('${key}')" style="background:none;border:none;color:#9ca3af;cursor:pointer;padding:0;margin-left:10px;transition:transform 0.5s;" title="强制刷新"><span class="material-icons" style="font-size:16px;">refresh</span></button>` : '';

        panel.innerHTML = `
            <h4 style="margin: 0 0 15px 0; color: #2563eb; display: flex; justify-content: space-between; align-items: center; font-size: 16px;">
                <span style="display:flex;align-items:center;"><span class="material-icons" style="font-size:18px;margin-right:8px;">${item.icon}</span>${item.name} ${refreshBtnHtml}</span>
                <button onclick="unpinTool('${key}')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;padding:0;">取消固定</button>
            </h4>
            <div class="panel-content" id="widget-${key}">
                <div style="text-align:center;padding:20px;color:#9ca3af;">加载中...</div>
            </div>`;

        const contentBox = panel.querySelector('.panel-content');
        try {
            const content = await getWidgetContent(key, false);
            if (contentBox) contentBox.innerHTML = content;
        } catch (error) {
            console.error(`Widget render failed for ${key}:`, error);
            if (contentBox) {
                contentBox.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444;">加载失败，请稍后重试</div>`;
            }
        }

        return panel;
    });

    const panels = await Promise.all(panelTasks);
    panels.filter(Boolean).forEach(panel => panelsGrid.appendChild(panel));
}

function render() {
    if (!grid) return;
    grid.innerHTML = '';
    Object.keys(tools).forEach(key => {
        const item = tools[key];
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <button class="pin-btn" onclick="pinTool(event, '${key}')" title="固定到仪表盘">
                <span class="material-icons" style="font-size:16px;">push_pin</span>
            </button>
            <div style="display:flex;flex-direction:column;align-items:center;width:100%;text-align:center;">
                <span class="material-icons" style="font-size:48px;color:#2563eb;margin-bottom:15px;">${item.icon}</span>
                <h3 style="margin:0;font-size:16px;font-weight:600;">${item.name}</h3>
            </div>`;
        
        // 只有点击卡片主体时才打开工具，绝不触发图钉
        card.onclick = () => window.openTool(key);
        grid.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // 初始化默认监控项
    if (localStorage.getItem('pinnedTools') === null) {
        localStorage.setItem('pinnedTools', JSON.stringify(['familyWealth', 'weather', 'currency', 'evTracker', 'evEnergyCal']));
    }
    render();
    await renderPanels(); // 初始化面板并执行缓存加载
    
    document.getElementById('close-btn').onclick = () => closeTool();
    
    // 点击遮罩层关闭弹窗（但不影响 iframe 内部交互）
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) closeTool();
    });
    
    // ESC 键关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dialog.style.display === 'flex') closeTool();
    });
});
