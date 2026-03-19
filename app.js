// ==========================================
// 杨昊燃 Tools Bar - 核心业务引擎 (修复全功能弹窗)
// ==========================================

const CACHE_EXPIRE_MS = 12 * 60 * 60 * 1000; // 12小时防封禁缓存

// 核心工具配置清单：每个工具都必须有 htmlFile 才能触发全屏弹窗！
const tools = {
    calculator: { name: "高级科学计算器", icon: "calculate", htmlFile: "calc_fragment.html" },
    carLoan: { name: "全能购车计算器", icon: "directions_car", htmlFile: "car_loan.html" },
    evTracker: { name: "电车电费日志", icon: "ev_station", htmlFile: "ev_tracker.html" },
    mortgage: { name: "房贷组合计算", icon: "real_estate_agent", htmlFile: "mortgage_fragment.html" },
    weather: { name: "多城实时天气", icon: "cloud", htmlFile: "weather.html" },
    currency: { name: "汇率多国对比", icon: "currency_exchange", htmlFile: "currency.html" },
    deposit: { name: "2025存款利率", icon: "savings", htmlFile: "deposit.html" },
    stocks: { name: "股市行情预览", icon: "trending_up", htmlFile: "stocks.html" },
    simulation: { name: "家庭资产仿真模型", icon: "insights", htmlFile: "asset_sim.html" }
};

const grid = document.getElementById('plugin-grid');
const panelsGrid = document.getElementById('panels-grid');
const dialog = document.getElementById('tool-dialog');
const featureView = document.getElementById('feature-view');

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
    featureView.innerHTML = `<iframe src="${tool.htmlFile}" style="width:100%;height:100%;border:none;border-radius:12px;flex:1;background:#fff;"></iframe>`;
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
// 数据与缓存引擎 (12小时免打扰策略)
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
    
    const content = await getWidgetContent(key, true); // true = 强制无视缓存
    if (contentBox) contentBox.innerHTML = content;
    
    if(btn) setTimeout(() => { btn.style.transform = "none"; }, 500);
};

// ==========================================
// 各小组件直出 HTML 构建器 (不影响全屏版的 iframe)
// ==========================================
async function getWidgetContent(key, isManualRefresh = false) {
    if (key === 'weather') {
        return await cachedFetch('weather', async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const res = await fetch("https://wttr.in/Beijing?format=j1", { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            const temp = data.current_condition[0].temp_C;
            const desc = data.current_condition[0].weatherDesc[0].value;
            const humidity = data.current_condition[0].humidity;
            const wind = data.current_condition[0].windspeedKmph;
            const dateStr = new Date().toLocaleDateString('zh-CN', {month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute:'2-digit'});
            
            return `
                <div style="text-align:center; padding:5px 0;">
                    <div style="font-size:54px; font-weight:bold; color:#2563eb; line-height:1; display:flex; align-items:center; justify-content:center;">${temp}<span style="font-size:24px;margin-left:5px;">°C</span></div>
                    <div style="font-size:14px; color:#4b5563; margin-top:15px; font-weight:500;">${desc} | 湿度 ${humidity}% | 风速 ${wind}km/h</div>
                    <div style="font-size:12px; color:#9ca3af; margin-top:15px; background:#f3f4f6; display:inline-block; padding:4px 12px; border-radius:20px;">数据更新于 ${dateStr}</div>
                </div>`;
        }, isManualRefresh);
    }
    else if (key === 'currency') {
        return await cachedFetch('currency', async () => {
            const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
            const data = await res.json();
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
        return `
            <div class="widget-row"><span>上证指数</span><b style="color:#ef4444;">3050.12 (+1.2%)</b></div>
            <div class="widget-row"><span>深证成指</span><b style="color:#ef4444;">9854.34 (+1.5%)</b></div>
            <div class="widget-row"><span>纳斯达克</span><b style="color:#059669;">16200.5 (-0.5%)</b></div>
            <div class="widget-row" style="border-bottom:none;"><span>比特币 (BTC)</span><b style="color:#ef4444;">$65,000 (+3.2%)</b></div>
            <button class="widget-action-btn" onclick="openTool('stocks')">点击查看全局实时图表大盘</button>`;
    }
    else if (key === 'simulation') {
        return `
            <div style="text-align:center; padding:10px 0;">
                <span class="material-icons" style="font-size:48px; color:#7c3aed; margin-bottom:10px;">insights</span>
                <div style="font-size:13px; color:#4b5563; margin-bottom:15px; line-height:1.6;">家庭资产韧性与现金流压力测试<br>搭载 Vue3 与 1500 次蒙特卡洛引擎</div>
                <button class="widget-action-btn" style="background:#f3e8ff;color:#6d28d9;" onclick="openTool('simulation')">启动极限压力仿真模型</button>
            </div>`;
    }
    else if (key === 'calculator') {
        return `
            <div style="text-align:center; padding:0;">
                <div style="font-size:13px; color:#6b7280; margin-bottom:10px;">支持复杂科学函数</div>
                <input type="text" placeholder="快捷输入 (如 3*4)" style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:8px; box-sizing:border-box; margin-bottom:10px;" id="fast-calc">
                <button class="widget-action-btn" style="margin-top:0;" onclick="try{document.getElementById('fast-calc').value=eval(document.getElementById('fast-calc').value)}catch{document.getElementById('fast-calc').value='Error'}">快捷计算</button>
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
}

// ==========================================
// 界面渲染层
// ==========================================
async function renderPanels() {
    if (!panelsGrid) return;
    panelsGrid.innerHTML = '';
    const pinned = JSON.parse(localStorage.getItem('pinnedTools') || '[]');
    for (const key of pinned) {
        const item = tools[key];
        if (item) {
            const panel = document.createElement('div');
            panel.className = 'panel-card';
            
            // 是否为需要刷新的数据组件？
            const isDataWidget = ['weather', 'currency'].includes(key);
            const refreshBtnHtml = isDataWidget ? `<button id="refresh-btn-${key}" onclick="refreshWidget('${key}')" style="background:none;border:none;color:#9ca3af;cursor:pointer;padding:0;margin-left:10px;transition:transform 0.5s;" title="强制刷新"><span class="material-icons" style="font-size:16px;">refresh</span></button>` : '';

            // Widget 标题栏
            panel.innerHTML = `
                <h4 style="margin: 0 0 15px 0; color: #2563eb; display: flex; justify-content: space-between; align-items: center; font-size: 16px;">
                    <span style="display:flex;align-items:center;"><span class="material-icons" style="font-size:18px;margin-right:8px;">${item.icon}</span>${item.name} ${refreshBtnHtml}</span>
                    <button onclick="unpinTool('${key}')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;padding:0;">取消固定</button>
                </h4>
                <div class="panel-content" id="widget-${key}">
                    <div style="text-align:center;padding:20px;color:#9ca3af;">加载中...</div>
                </div>`;
            panelsGrid.appendChild(panel);

            // 异步直出小组件内容
            const contentBox = document.getElementById(`widget-${key}`);
            const content = await getWidgetContent(key, false);
            if(contentBox) contentBox.innerHTML = content;
        }
    }
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
        localStorage.setItem('pinnedTools', JSON.stringify(['simulation', 'weather', 'currency', 'evTracker']));
    }
    render();
    await renderPanels(); // 初始化面板并执行缓存加载
    
    document.getElementById('close-btn').onclick = () => {
        dialog.style.display = 'none';
        featureView.innerHTML = ''; 
    };
});
