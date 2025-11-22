// Vercel Serverless Function for Stock Data
// Uses Yahoo Finance (free, no API key needed)

export default async function handler(request, response) {
  // Set CORS headers to allow browser access
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  // Get tickers from query parameter
  const { tickers } = request.query;

  if (!tickers) {
    return response.status(400).json({ error: 'Missing tickers parameter' });
  }

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers}`;

  try {
    // Add headers to make request look like it's from a browser
    const apiResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com'
      }
    });

    if (!apiResponse.ok) {
      throw new Error(`Yahoo Finance returned ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    const quotes = data.quoteResponse.result;

    // Convert Yahoo Finance format to FMP-like format for compatibility
    const converted = quotes.map(item => ({
      symbol: item.symbol,
      name: item.longName || item.shortName || item.symbol,
      price: item.regularMarketPrice || 0,
      change: item.regularMarketChange || 0,
      changesPercentage: item.regularMarketChangePercent || 0,
      marketCap: item.marketCap || 0,
      previousClose: item.regularMarketPreviousClose || 0
    }));

    // Return the data to the browser
    response.setHeader('Content-Type', 'application/json');
    response.status(200).json(converted);

  } catch (error) {
    console.error('Error fetching from Yahoo Finance:', error);
    response.status(500).json({
      error: 'Failed to fetch stock data',
      message: error.message
    });
  }
}
