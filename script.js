const exchanges = ['Kraken', 'Binance', 'Stillman', 'OKX'];
const tableBody = document.querySelector('#priceTable tbody');
let updateInterval = 30000; // Default: 30 seconds
let intervalId;
let countdownId;
let countdownValue = 30;
let isPaused = false;

async function fetchBinancePrice(pair) {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${pair}`);
        if (!response.ok) throw new Error('Failed to fetch data from Binance');
        const data = await response.json();
        return {
            buy: parseFloat(data.askPrice),
            sell: parseFloat(data.bidPrice),
        };
    } catch (error) {
        console.error('Error fetching Binance data:', error);
        return { buy: 0, sell: 0 }; // Fallback in case of error
    }
}

async function fetchKrakenPrice(pair) {
    try {
        // Convertir "EURUSDT" al formato invertido "USDTEUR"
        const krakenPair = `${pair.slice(3)}${pair.slice(0, 3)}`;
        
        const response = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${krakenPair}`);
        if (!response.ok) throw new Error('Failed to fetch data from Kraken');
        const data = await response.json();
        
        // Obtener los datos del par correspondiente
        const ticker = Object.values(data.result)[0];

        // Invertir precios: buy = 1 / ask, sell = 1 / bid
        return {
            buy: 1 / parseFloat(ticker.a[0]), // Precio de compra invertido
            sell: 1 / parseFloat(ticker.b[0]), // Precio de venta invertido
        };
    } catch (error) {
        console.error('Error fetching Kraken data:', error);
        return { buy: 0, sell: 0 }; // Fallback en caso de error
    }
}

async function fetchOKXPrice(pair) {
try {
    const okxPair = `${pair.slice(3)}-${pair.slice(0, 3)}`; // Formato: USDT-EUR
    const response = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${okxPair}`);
    if (!response.ok) throw new Error('Failed to fetch data from OKX');
    const data = await response.json();
    const ticker = data.data[0];
    
    // Invertir los precios
    return {
        buy: 1 / parseFloat(ticker.askPx), // Invertir precio de compra (ask)
        sell: 1 / parseFloat(ticker.bidPx), // Invertir precio de venta (bid)
    };
} catch (error) {
    console.error('Error fetching OKX data:', error);
    return { buy: 0, sell: 0 }; // Fallback en caso de error
}
}

async function updatePrices() {
    if (isPaused) return; // Skip updates if paused

    const pair = document.querySelector('#pair').value;
    const type = document.querySelector('#type').value;
    const commission = parseFloat(document.querySelector('#commission').value) / 100;

    // Fetch data for each exchange
    const [binanceData, krakenData, okxData] = await Promise.all([
        fetchBinancePrice(pair),
        fetchKrakenPrice(pair),
        fetchOKXPrice(pair),
    ]);

    // Simulated data for other exchanges
    const mockData = {
        Stillman: { buy: 0.96333, sell: 0.96333 },
    };

    // Combine all data
    const marketPrices = {
        Kraken: krakenData,
        Binance: binanceData,
        Stillman: mockData.Stillman,
        OKX: okxData,
    };

    tableBody.innerHTML = ''; // Clear the table

    exchanges.forEach(exchange => {
        const data = marketPrices[exchange];
        const adjustedPrice = type === 'buy'
            ? data.buy * (1 + commission)
            : data.sell * (1 - commission);

        const row = `
            <tr>
                <td>${exchange}</td>
                <td>${(type === 'buy' ? data.buy : data.sell).toFixed(5)}</td>
                <td class="your-price">${adjustedPrice.toFixed(5)}</td>
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
        button.textContent = 'Pause Updates';
        intervalId = setInterval(updatePrices, updateInterval);
        resetCountdown();
    } else {
        // Pause updates
        isPaused = true;
        button.textContent = 'Resume Updates';
        clearInterval(intervalId); // Stop the interval
        clearInterval(countdownId); // Stop the countdown
    }
}

// Attach event listeners
document.querySelector('#pair').addEventListener('change', updatePrices);
document.querySelector('#type').addEventListener('change', updatePrices);
document.querySelector('#commission').addEventListener('input', updatePrices);
document.querySelector('#interval').addEventListener('input', updateIntervalHandler);
document.querySelector('#toggleButton').addEventListener('click', toggleUpdates);

// Initialize
updatePrices();
intervalId = setInterval(updatePrices, updateInterval);
resetCountdown();