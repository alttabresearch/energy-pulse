// Vercel Serverless Function for Commodity/Energy Price Data
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

  // Get symbols from query parameter
  const { symbols } = request.query;

  if (!symbols) {
    return response.status(400).json({ error: 'Missing symbols parameter' });
  }

  // Get API key from environment variable
  const API_KEY = process.env.TWELVE_DATA_API_KEY;

  if (!API_KEY) {
    return response.status(500).json({ error: 'API key not configured' });
  }

  try {
    const symbolArray = symbols.split(',');
    const results = [];

    // Twelve Data uses different symbols for commodities
    // Map Yahoo-style symbols to Twelve Data format
    const symbolMap = {
      'CL=F': 'CL',   // WTI Crude Oil
      'NG=F': 'NG',   // Natural Gas
      'RB=F': 'RB'    // RBOB Gasoline
    };

    for (const symbol of symbolArray) {
      const mappedSymbol = symbolMap[symbol] || symbol;

      const url = `https://api.twelvedata.com/quote?symbol=${mappedSymbol}&apikey=${API_KEY}`;

      const apiResponse = await fetch(url);

      if (!apiResponse.ok) {
        throw new Error(`Twelve Data returned ${apiResponse.status}`);
      }

      const data = await apiResponse.json();

      // Skip if there's an error
      if (data.status === 'error') {
        console.log(`Error for ${symbol}: ${data.message}`);
        continue;
      }

      const price = parseFloat(data.close) || 0;
      const previousClose = parseFloat(data.previous_close) || price;
      const change = price - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      results.push({
        symbol: symbol, // Return original symbol format
        name: data.name || symbol,
        price: price,
        change: change,
        changesPercentage: changePercent,
        marketCap: 0,
        previousClose: previousClose
      });

      // Small delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Return the data to the browser
    response.setHeader('Content-Type', 'application/json');
    response.status(200).json(results);

  } catch (error) {
    console.error('Error fetching from Twelve Data:', error);
    response.status(500).json({
      error: 'Failed to fetch commodity data',
      message: error.message
    });
  }
}
