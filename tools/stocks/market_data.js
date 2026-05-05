(function (global) {
  const STOCK_API_URL = 'https://qt.gtimg.cn/q=s_sh000001,s_sz399001,s_sz399006,s_sh000300,s_us.NDX,s_us.INX,s_us.DJI,s_hkHSI';
  const CRYPTO_API_URL = 'https://data-api.binance.vision/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22DOGEUSDT%22%5D';

  const STOCK_SYMBOLS = [
    { code: 'sh000001', name: '上证指数' },
    { code: 'sz399001', name: '深证成指' },
    { code: 'sz399006', name: '创业板指' },
    { code: 'sh000300', name: '沪深300' },
    { code: 'us.NDX', name: '纳斯达克100' },
    { code: 'us.INX', name: '标普500' },
    { code: 'us.DJI', name: '道琼斯' },
    { code: 'hkHSI', name: '恒生指数' }
  ];

  const CRYPTO_SYMBOLS = [
    { symbol: 'BTCUSDT', name: 'BTC' },
    { symbol: 'ETHUSDT', name: 'ETH' },
    { symbol: 'SOLUSDT', name: 'SOL' },
    { symbol: 'DOGEUSDT', name: 'DOGE' }
  ];

  function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function parseQtStocksText(text) {
    const result = {};

    STOCK_SYMBOLS.forEach(({ code, name }) => {
      const pattern = new RegExp(`v_s_${escapeRegex(code)}=".*?~.*?~.*?~(.*?)~(.*?)~(.*?)~`);
      const match = String(text || '').match(pattern);
      if (!match) return;

      result[code] = {
        name,
        price: parseFloat(match[1]),
        change: parseFloat(match[2]),
        change_pct: parseFloat(match[3])
      };
    });

    return result;
  }

  async function fetchStocksAndCrypto(fetchImpl) {
    const fetchFn = fetchImpl || global.fetch.bind(global);
    const result = { stocks: {}, crypto: {} };

    try {
      const res = await fetchFn(STOCK_API_URL);
      if (res.ok) {
        const text = await res.text();
        result.stocks = parseQtStocksText(text);
      }
    } catch (error) {
      console.error('Stock fetch failed:', error);
    }

    try {
      const res = await fetchFn(CRYPTO_API_URL);
      if (res.ok) {
        const data = await res.json();
        data.forEach((item) => {
          result.crypto[item.symbol] = {
            name: item.symbol.replace('USDT', ''),
            price: parseFloat(item.lastPrice),
            change: parseFloat(item.priceChange),
            change_pct: parseFloat(item.priceChangePercent)
          };
        });
      }
    } catch (error) {
      console.error('Crypto fetch failed:', error);
    }

    return result;
  }

  global.StockMarketData = {
    parseQtStocksText,
    fetchStocksAndCrypto
  };
})(window);
