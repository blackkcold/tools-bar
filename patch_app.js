const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf-8');

// Replace CACHE_EXPIRE_MS
code = code.replace(
    'const CACHE_EXPIRE_MS = 12 * 60 * 60 * 1000; // 12小时防封禁缓存',
    'const CACHE_EXPIRE_MS = 24 * 60 * 60 * 1000; // 24小时防封禁缓存'
);

// Inject GlobalDataManager
const dataManagerCode = `
// ==========================================
// 全局数据中心 (支持跨 iframe 共享，每天只抓取一次)
// ==========================================
window.GlobalDataManager = {
    CACHE_MS: 24 * 60 * 60 * 1000,
    
    async fetchWithCache(key, fetcher, forceRefresh = false) {
        const cacheKey = \`global_data_\${key}\`;
        const timeKey = \`global_time_\${key}\`;
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
            console.error(\`[\${key}] Fetch error:\`, e);
            if (cached) return JSON.parse(cached); // fallback to old cache
            return null;
        }
    },

    async getWeather(forceRefresh = false) {
        return this.fetchWithCache('weather_json', async () => {
            const res = await fetch("https://wttr.in/Beijing?format=j1");
            if (!res.ok) throw new Error("Weather API failed");
            return await res.json();
        }, forceRefresh);
    },

    async getCurrency(forceRefresh = false) {
        return this.fetchWithCache('currency_json', async () => {
            // Using existing API but cached strictly to daily
            const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
            if (!res.ok) throw new Error("Currency API failed");
            return await res.json();
        }, forceRefresh);
    },

    async getStocks(forceRefresh = false) {
        return this.fetchWithCache('stocks_json', async () => {
            let result = { stocks: {}, crypto: {} };
            // Fetch Stocks
            try {
                const res = await fetch("https://qt.gtimg.cn/q=s_sh000001,s_sz399001,s_sz399006,s_sh000300,s_us.NDX,s_us.INX,s_us.DJI,s_hkHSI");
                const text = await res.text();
                const parseLine = (line, code, name) => {
                    const regex = new RegExp(\`v_s_\${code.replace('.', '\\\\.')}=".*?~.*?~.*?~(.*?)~(.*?)~(.*?)~\`);
                    const match = line.match(regex);
                    if (match) result.stocks[code] = { name, price: parseFloat(match[1]), change: parseFloat(match[2]), change_pct: parseFloat(match[3]) };
                };
                const lines = text.split(';');
                lines.forEach(line => {
                    parseLine(line, 'sh000001', '上证指数');
                    parseLine(line, 'sz399001', '深证成指');
                    parseLine(line, 'sz399006', '创业板指');
                    parseLine(line, 'sh000300', '沪深300');
                    parseLine(line, 'us.NDX', '纳斯达克100');
                    parseLine(line, 'us.INX', '标普500');
                    parseLine(line, 'us.DJI', '道琼斯');
                    parseLine(line, 'hkHSI', '恒生指数');
                });
            } catch(e) {}
            // Fetch Crypto
            try {
                const res = await fetch('https://data-api.binance.vision/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22DOGEUSDT%22%5D');
                const data = await res.json();
                data.forEach(item => {
                    result.crypto[item.symbol] = {
                        name: item.symbol.replace('USDT', ''),
                        price: parseFloat(item.lastPrice),
                        change: parseFloat(item.priceChange),
                        change_pct: parseFloat(item.priceChangePercent)
                    };
                });
            } catch(e) {}
            return result;
        }, forceRefresh);
    }
};
`;

code = code.replace('// ==========================================\n// 弹窗与交互模块', dataManagerCode + '\n// ==========================================\n// 弹窗与交互模块');

// Now rewrite getWidgetContent to use GlobalDataManager instead of fetching inside HTML templates!
// Let's replace the fetchers in `getWidgetContent`.
code = code.replace(/const res = await fetch\("https:\/\/wttr\.in\/Beijing\?format=j1".*?const data = await res\.json\(\);/s, 'const data = await window.GlobalDataManager.getWeather(isManualRefresh);');

// Currency
code = code.replace(/const res = await fetch\("https:\/\/api\.exchangerate-api\.com\/v4\/latest\/USD"\);\s*const data = await res\.json\(\);/s, 'const data = await window.GlobalDataManager.getCurrency(isManualRefresh);');

// Stocks: Replace the entire inner logic
code = code.replace(/let shData = \['3050\.12', '0\.00'\];.*?const formatPct = \(pct\)/s, `
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
            const formatPct = (pct)`);

// Ensure 'stocks' widget shows refresh btn
code = code.replace("const isDataWidget = ['weather', 'currency'].includes(key);", "const isDataWidget = ['weather', 'currency', 'stocks'].includes(key);");

fs.writeFileSync('app.js', code);
console.log('Successfully patched app.js');
