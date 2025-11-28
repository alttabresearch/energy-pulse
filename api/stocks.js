// Vercel Serverless Function for Stock Data
// Uses Twelve Data API (free tier, 800 calls/day)

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

  // Get API key from environment variable
  const API_KEY = process.env.TWELVE_DATA_API_KEY;

  if (!API_KEY) {
    return response.status(500).json({ error: 'API key not configured' });
  }

  try {
    const tickerArray = tickers.split(',');
    const results = [];

    // Twelve Data allows batch requests with comma-separated symbols
    const batchSize = 8; // Twelve Data free tier allows up to 8 symbols per request

    for (let i = 0; i < tickerArray.length; i += batchSize) {
      const batch = tickerArray.slice(i, i + batchSize);
      const symbolParam = batch.join(',');

      const url = `https://api.twelvedata.com/quote?symbol=${symbolParam}&apikey=${API_KEY}`;

      const apiResponse = await fetch(url);

      if (!apiResponse.ok) {
        throw new Error(`Twelve Data returned ${apiResponse.status}`);
      }

      const data = await apiResponse.json();

      // Handle both single and batch responses
      const quotes = Array.isArray(data) ? data : [data];

      for (const item of quotes) {
        // Skip if there's an error for this symbol
        if (item.status === 'error') {
          console.log(`Error for ${item.symbol}: ${item.message}`);
          continue;
        }

        const price = parseFloat(item.close) || 0;
        const previousClose = parseFloat(item.previous_close) || price;
        const change = price - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

        results.push({
          symbol: item.symbol,
          name: item.name || item.symbol,
          price: price,
          change: change,
          changesPercentage: changePercent,
          marketCap: parseFloat(item.market_cap) || 0,
          previousClose: previousClose
        });
      }

      // Small delay between batch requests to respect rate limits
      if (i + batchSize < tickerArray.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Return the data to the browser
    response.setHeader('Content-Type', 'application/json');
    response.status(200).json(results);

  } catch (error) {
    console.error('Error fetching from Twelve Data:', error);
    response.status(500).json({
      error: 'Failed to fetch stock data',
      message: error.message
    });
  }
}
