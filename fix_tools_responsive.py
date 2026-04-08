import re
import glob

# 1. Fix calc_fragment.html
with open('calc_fragment.html', 'r', encoding='utf-8') as f:
    calc = f.read()
# Replace fixed heights if necessary. It uses 1fr so grid is flexible. 
# Make font-sizes slightly smaller for mobile or keep 100% width.
calc = calc.replace('height:60px;', 'height:min(15vh, 60px);')
calc = calc.replace('height:50px;', 'height:min(12vh, 50px);')
with open('calc_fragment.html', 'w', encoding='utf-8') as f:
    f.write(calc)


# 2. Fix car_loan.html
with open('car_loan.html', 'r', encoding='utf-8') as f:
    car = f.read()

# Make the grid responsive (already has max-width: 900px, but let's ensure padding on smaller devices)
css_additions = """
        @media (max-width: 600px) {
            body { padding: 10px; }
            .card { padding: 15px; margin-bottom: 15px; }
            h2 { font-size: 1.1rem; }
            .form-grid { grid-template-columns: 1fr; gap: 10px; }
            .toggle-group { flex-direction: column; gap: 5px; }
            .big-num { font-size: 1.8rem; }
            .detail-row { font-size: 0.85rem; }
        }
"""
car = car.replace('</style>', css_additions + '</style>')
with open('car_loan.html', 'w', encoding='utf-8') as f:
    f.write(car)


# 3. Fix weather.html
with open('weather.html', 'r', encoding='utf-8') as f:
    weather = f.read()

weather_css = """
        @media (max-width: 600px) {
            body { padding: 10px; }
            .container { padding: 15px; border-radius: 12px; }
            .grid { grid-template-columns: 1fr; gap: 10px; margin-bottom: 20px; }
            .city-card { padding: 12px; flex-direction: row; align-items: center; justify-content: space-between; }
            .city-name { font-size: 16px; margin-bottom: 0; }
            .city-temp { font-size: 28px; margin: 0; }
            .city-desc, .city-details { text-align: right; }
            .controls { flex-direction: column; gap: 15px; align-items: stretch; text-align: center; }
        }
"""
weather = weather.replace('</style>', weather_css + '</style>')
with open('weather.html', 'w', encoding='utf-8') as f:
    f.write(weather)


# 4. Fix currency.html
with open('currency.html', 'r', encoding='utf-8') as f:
    currency = f.read()

currency_css = """
    <style>
        @media (max-width: 600px) {
            body { padding: 10px; }
            .flex-row { flex-direction: column !important; gap: 10px; }
            input, select { width: 100% !important; box-sizing: border-box; }
            h3 { font-size: 1.1rem; }
            .row { font-size: 14px; }
            .cache-controls { flex-direction: column !important; gap: 10px; align-items: stretch !important; text-align: center; }
        }
    </style>
"""
currency = currency.replace('<div style="display:flex; gap:10px;">', '<div class="flex-row" style="display:flex; gap:10px;">')
currency = currency.replace('<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">', '<div class="cache-controls" style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">')
currency = currency.replace('</head>', currency_css + '</head>')
with open('currency.html', 'w', encoding='utf-8') as f:
    f.write(currency)


# 5. Fix deposit.html
with open('deposit.html', 'r', encoding='utf-8') as f:
    deposit = f.read()

deposit_css = """
    <style>
        @media (max-width: 600px) {
            body { padding: 15px; }
            h2 { font-size: 1.2rem; }
            .form-group { display: flex; flex-direction: column; gap: 5px; }
            .form-group > div { display: flex; flex-direction: column; gap: 10px; }
            #results p { font-size: 16px !important; }
        }
    </style>
"""
deposit = deposit.replace('</head>', deposit_css + '</head>')
with open('deposit.html', 'w', encoding='utf-8') as f:
    f.write(deposit)


# 6. Fix stocks.html
with open('stocks.html', 'r', encoding='utf-8') as f:
    stocks = f.read()

stocks_css = """
        @media (max-width: 600px) {
            body { padding: 10px; }
            .header h1 { font-size: 22px; }
            .grid { grid-template-columns: 1fr; gap: 12px; margin-bottom: 20px; }
            .card { padding: 15px; }
            .card-price { font-size: 26px; }
            .status-bar { flex-direction: column; gap: 10px; text-align: center; }
            .refresh-btn { bottom: 15px; right: 15px; width: 48px; height: 48px; }
        }
"""
stocks = stocks.replace('</style>', stocks_css + '</style>')
with open('stocks.html', 'w', encoding='utf-8') as f:
    f.write(stocks)

print("Responsive patches applied.")
