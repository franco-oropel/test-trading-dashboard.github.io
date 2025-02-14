const exchanges = ['Kraken', 'Binance', 'Stillman', 'OKX', 'KuCoin', 'Bybit', 'Bitstamp'];
const tableBody = document.querySelector('#priceTable tbody');
let updateInterval = 30000; // Default: 30 seconds
let intervalId;
let countdownId;
let countdownValue = 30;
let isPaused = false;

async function fetchBinancePrice(pair) {
    try {
        const binancePair = `${pair.slice(4)}${pair.slice(0, 4)}`; // Formato: EURUSDT
        
        const response = await fetch(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${binancePair}`);
        if (!response.ok) throw new Error('Failed to fetch data from Binance');
        const data = await response.json();
        return {
            buy: 1 / parseFloat(data.askPrice),
            sell: 1 / parseFloat(data.bidPrice),
        };
    } catch (error) {
        console.error('Error fetching Binance data:', error);
        return { buy: 0, sell: 0 };
    }
}

async function fetchKrakenPrice(pair) {
    try {
        const response = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${pair}`);
        if (!response.ok) throw new Error('Failed to fetch data from Kraken');
        const data = await response.json();
        
        const ticker = Object.values(data.result)[0];

        return {
            buy: parseFloat(ticker.a[0]),
            sell: parseFloat(ticker.b[0]),
        };
    } catch (error) {
        console.error('Error fetching Kraken data:', error);
        return { buy: 0, sell: 0 };
    }
}

async function fetchStillmanPrice(pair) {
    try {
        let response = null;
        if(pair === 'USDTUSD') response = await fetch(`https://trading-dashboard-app-abwdihbx-e82b79b43422.herokuapp.com/api/stillman-rate?pair=USDT/USD`);
        if(pair === 'USDTEUR') response = await fetch(`https://trading-dashboard-app-abwdihbx-e82b79b43422.herokuapp.com/api/stillman-rate?pair=USDT/EUR`);
        
        if (!response.ok) throw new Error('Failed to fetch data from Stillman');
        const data = await response.json();
        return {
            buy: parseFloat(data.buyRate),
            sell: parseFloat(data.sellRate),
        };
    } catch (error) {
        console.error('Error fetching Stillman data:', error);
        return { buy: 0, sell: 0 };
    }
}

async function fetchOKXPrice(pair) {
    try {
        const okxPair = `${pair.slice(0, 4)}-${pair.slice(4)}`; // Formato: USDT-EUR
        const response = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${okxPair}`);
        if (!response.ok) throw new Error('Failed to fetch data from OKX');
        const data = await response.json();
        const ticker = data.data[0];
        
        // Invertir los precios
        return {
            buy: parseFloat(ticker.askPx),
            sell: parseFloat(ticker.bidPx),
        };
    } catch (error) {
        console.error('Error fetching OKX data:', error);
        return { buy: 0, sell: 0 };
    }
}

async function fetchKucoinPrice(pair) {
    try {
        throw new Error("Failed to fetch data from KuCoin");
        const kucoinPair = `${pair.slice(3)}-${pair.slice(0, 3)}`; // Formato: USDT-EUR

        const response = await fetch(`https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${kucoinPair}`);

        if (!response.ok) throw new Error("Failed to fetch data from KuCoin");
        const data = await response.json();

        if (!data.data || !data.data.bestAsk || !data.data.bestBid) {
            throw new Error("Invalid data format from KuCoin API");
        }

        return {
            buy: 1 / parseFloat(data.data.bestAsk),
            sell: 1 / parseFloat(data.data.bestBid),
        };
    } catch (error) {
        console.error("Error fetching KuCoin data:", error);
        return { buy: 0, sell: 0 };
    }
}

async function fetchBybitPrice(pair) {
    try {
        const bybitPair = `${pair.slice(0, 4)}${pair.slice(4)}`; // Formato: "USDTEUR"

        const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${bybitPair}`);

        if (!response.ok) throw new Error("Failed to fetch data from Bybit");
        const data = await response.json();

        if (!data.result || !data.result.list[0].bid1Price || !data.result.list[0].ask1Price) {
            throw new Error("Invalid data format from Bybit API");
        }

        return {
            buy: parseFloat(data.result.list[0].ask1Price),
            sell: parseFloat(data.result.list[0].bid1Price),
        };
    } catch (error) {
        console.error("Error fetching Bybit data:", error);
        return { buy: 0, sell: 0 };
    }
}

async function fetchBitstampPrice(pair) {
    try {
        const response = await fetch(`https://www.bitstamp.net/api/v2/ticker/${pair.toLowerCase()}`);

        if (!response.ok) throw new Error("Failed to fetch data from Bitstamp");
        const data = await response.json();

        if (!data || !data.bid || !data.ask) {
            throw new Error("Invalid data format from Bitstamp API");
        }

        return {
            buy: parseFloat(data.ask),
            sell: parseFloat(data.bid),
        };
    } catch (error) {
        console.error("Error fetching Bitstamp data:", error);
        return { buy: 0, sell: 0 };
    }
}

async function updatePrices() {
    if (isPaused) return; // Skip updates if paused

    const pair = document.querySelector('#pair').value;
    const type = document.querySelector('#type').value;
    const commission = parseFloat(document.querySelector('#commission').value) / 100;

    // Fetch data for each exchange
    const [binanceData, krakenData, stillmanData, okxData, kucoinData, bybitData, bitstampData] = await Promise.all([
        fetchBinancePrice(pair),
        fetchKrakenPrice(pair),
        fetchStillmanPrice(pair),
        fetchOKXPrice(pair),
        fetchKucoinPrice(pair),
        fetchBybitPrice(pair),
        fetchBitstampPrice(pair),
    ]);

    // Combine all data
    const marketPrices = {
        Kraken: krakenData,
        Binance: binanceData,
        Stillman: stillmanData,
        OKX: okxData,
        KuCoin: kucoinData,
        Bybit: bybitData,
        Bitstamp: bitstampData,
    };

    tableBody.innerHTML = ''; // Clear the table

    let bestPrice = null;
    let bestExchange = null;

    exchanges.forEach(exchange => {
        const data = marketPrices[exchange];
        const price = type === 'buy' ? data.buy : data.sell;
    
        if (price !== 0 && (bestPrice === null || (type === 'buy' ? price < bestPrice : price > bestPrice))) {
            bestPrice = price;
            bestExchange = exchange;
        }
    });

    exchanges.forEach(exchange => {
        const data = marketPrices[exchange];
        const price = type === 'buy' ? data.buy : data.sell;
        const adjustedPrice = type === 'buy'
            ? data.buy * (1 + commission)
            : data.sell * (1 - commission);

        const row = `
            <tr class="${exchange === bestExchange ? 'best-price' : ''}">
                <td>${exchange}</td>
                <td>${price === 0 ? '❌' : price.toFixed(5)}</td>
                <td>${price === 0 ? '❌' : adjustedPrice.toFixed(5)}</td>
            </tr>
        `;

        tableBody.innerHTML += row;
    });

    resetCountdown();
}

function updateIntervalHandler() {
    const intervalInput = document.querySelector('#interval').value;
    const newInterval = Math.max(parseInt(intervalInput, 10) * 1000, 5000); // Minimum: 5 seconds

    clearInterval(intervalId); // Clear the previous interval
    clearInterval(countdownId); // Clear the countdown
    updateInterval = newInterval; // Update the interval value
    countdownValue = newInterval / 1000; // Update the countdown value
    if (!isPaused) {
        intervalId = setInterval(updatePrices, updateInterval); // Start the new interval
    }
    resetCountdown();
}

function resetCountdown() {
    clearInterval(countdownId); // Clear the previous countdown
    countdownValue = updateInterval / 1000; // Reset countdown value
    const countdownElement = document.querySelector('#countdown');
    countdownElement.textContent = countdownValue;

    countdownId = setInterval(() => {
        if (!isPaused) {
            countdownValue -= 1;
            countdownElement.textContent = countdownValue;
            if (countdownValue <= 0) {
                clearInterval(countdownId);
            }
        }
    }, 1000);
}

function toggleUpdates() {
    const button = document.querySelector('#toggleButton');
    if (isPaused) {
        // Resume updates
        isPaused = false;
        button.textContent = 'PAUSE';
        intervalId = setInterval(updatePrices, updateInterval);
        resetCountdown();
    } else {
        // Pause updates
        isPaused = true;
        button.textContent = 'PLAY';
        clearInterval(intervalId); // Stop the interval
        clearInterval(countdownId); // Stop the countdown
    }
}

// Attach event listeners
document.querySelector('#pair').addEventListener('change', updatePrices);
document.querySelector('#type').addEventListener('change', updatePrices);
document.querySelector('#commission').addEventListener('input', updatePrices);
// document.querySelector('#interval').addEventListener('input', updateIntervalHandler);
// document.querySelector('#toggleButton').addEventListener('click', toggleUpdates);
document.querySelector('#toggleButton').addEventListener('click', updatePrices);

// Initialize
updatePrices();
// intervalId = setInterval(updatePrices, updateInterval);
// resetCountdown();