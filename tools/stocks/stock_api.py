#!/usr/bin/env python3
"""Stock Market API Server - Free real-time stock index data"""

import json
import urllib.request
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import time

STOCK_SYMBOLS = {
    "000001": {"name": "上证指数", "symbol": "000001.SS"},
    "399001": {"name": "深证成指", "symbol": "399001.SZ"},
    "000016": {"name": "上证50", "symbol": "000016.SS"},
    "000300": {"name": "沪深300", "symbol": "000300.SS"},
    "SPX": {"name": "标普500", "symbol": "^GSPC"},
    "IXIC": {"name": "纳斯达克", "symbol": "^IXIC"},
    "DJI": {"name": "道琼斯", "symbol": "^DJI"},
    "HSI": {"name": "恒生指数", "symbol": "^HSI"},
    "N225": {"name": "日经225", "symbol": "^N225"},
}

CRYPTO_SYMBOLS = {
    "BTC": {"name": "比特币", "symbol": "bitcoin"},
    "ETH": {"name": "以太坊", "symbol": "ethereum"},
    "BNB": {"name": "币安币", "symbol": "binancecoin"},
    "SOL": {"name": "Solana", "symbol": "solana"},
}

CACHE = {}
CACHE_TIME = {}
CACHE_DURATION = 60


def fetch_yahoo_finance(symbol):
    """Fetch stock data from Yahoo Finance"""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read())
            result = data["chart"]["result"][0]
            meta = result["meta"]
            price = meta.get("regularMarketPrice", 0)
            prev_close = meta.get(
                "chartPreviousClose", meta.get("previousClose", price)
            )
            change = price - prev_close
            change_pct = (change / prev_close * 100) if prev_close else 0
            return {
                "price": round(price, 2),
                "change": round(change, 2),
                "change_pct": round(change_pct, 2),
                "prev_close": round(prev_close, 2),
            }
    except Exception as e:
        return None


def fetch_coingecko(symbol):
    """Fetch crypto data from CoinGecko"""
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={symbol}&vs_currencies=usd&include_24hr_change=true"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read())
            price = data[symbol]["usd"]
            change_pct = data[symbol].get("usd_24h_change", 0)
            change = price * change_pct / 100
            return {
                "price": round(price, 2),
                "change": round(change, 2),
                "change_pct": round(change_pct, 2),
                "prev_close": round(price - change, 2),
            }
    except Exception as e:
        return None


def get_stock_data(symbol):
    """Get stock data with caching"""
    cache_key = f"stock_{symbol}"
    now = time.time()

    if cache_key in CACHE and (now - CACHE_TIME.get(cache_key, 0)) < CACHE_DURATION:
        return CACHE[cache_key]

    data = fetch_yahoo_finance(symbol)
    if data:
        CACHE[cache_key] = data
        CACHE_TIME[cache_key] = now
        return data

    return None


def get_crypto_data(symbol):
    """Get crypto data with caching"""
    cache_key = f"crypto_{symbol}"
    now = time.time()

    if cache_key in CACHE and (now - CACHE_TIME.get(cache_key, 0)) < CACHE_DURATION:
        return CACHE[cache_key]

    data = fetch_coingecko(symbol)
    if data:
        CACHE[cache_key] = data
        CACHE_TIME[cache_key] = now
        return data

    return None


class StockAPIHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if path == "/api/stocks":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            results = {}
            for key, info in STOCK_SYMBOLS.items():
                data = get_stock_data(info["symbol"])
                if data:
                    results[key] = {"name": info["name"], **data}
                else:
                    results[key] = {
                        "name": info["name"],
                        "price": None,
                        "change": None,
                        "change_pct": None,
                        "error": "数据获取失败",
                    }

            self.wfile.write(json.dumps(results, ensure_ascii=False).encode("utf-8"))

        elif path == "/api/crypto":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            results = {}
            for key, info in CRYPTO_SYMBOLS.items():
                data = get_crypto_data(info["symbol"])
                if data:
                    results[key] = {"name": info["name"], **data}
                else:
                    results[key] = {
                        "name": info["name"],
                        "price": None,
                        "change": None,
                        "change_pct": None,
                        "error": "数据获取失败",
                    }

            self.wfile.write(json.dumps(results, ensure_ascii=False).encode("utf-8"))

        elif path == "/api/quote":
            query = parse_qs(parsed_url.query)
            symbol = query.get("symbol", [""])[0]

            if not symbol:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(
                    json.dumps({"error": "Missing symbol parameter"}).encode()
                )
                return

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            if symbol in STOCK_SYMBOLS:
                data = get_stock_data(STOCK_SYMBOLS[symbol]["symbol"])
            elif symbol in CRYPTO_SYMBOLS:
                data = get_crypto_data(CRYPTO_SYMBOLS[symbol]["symbol"])
            else:
                data = get_stock_data(symbol)

            if data:
                self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
            else:
                self.wfile.write(json.dumps({"error": "Failed to fetch data"}).encode())

        elif path == "/api/symbols":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            symbols = {"stocks": STOCK_SYMBOLS, "crypto": CRYPTO_SYMBOLS}
            self.wfile.write(json.dumps(symbols, ensure_ascii=False).encode("utf-8"))

        else:
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode())

    def log_message(self, format, *args):
        pass


def run_server(port=8766):
    server = HTTPServer(("localhost", port), StockAPIHandler)
    print(f"Stock API Server running on http://localhost:{port}")
    print("Available endpoints:")
    print("  GET /api/stocks    - All stock indices")
    print("  GET /api/crypto    - All crypto prices")
    print("  GET /api/quote?symbol=XXX - Single quote")
    print("  GET /api/symbols   - Available symbols")
    server.serve_forever()


if __name__ == "__main__":
    run_server()
