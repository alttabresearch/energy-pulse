// Vercel Serverless Function for Stock Data
// This function runs on the server and bypasses CORS

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

  // Get API key from environment variable (set in Vercel dashboard)
  const API_KEY = process.env.FMP_API_KEY;

  if (!API_KEY) {
    return response.status(500).json({ error: 'API key not configured' });
  }

  const url = `https://financialmodelingprep.com/api/v3/quote/${tickers}?apikey=${API_KEY}`;

  try {
    const apiResponse = await fetch(url);

    if (!apiResponse.ok) {
      throw new Error(`FMP API returned ${apiResponse.status}`);
    }

    const data = await apiResponse.json();

    // Return the data to the browser
    response.setHeader('Content-Type', 'application/json');
    response.status(200).json(data);

  } catch (error) {
    console.error('Error fetching from FMP:', error);
    response.status(500).json({
      error: 'Failed to fetch stock data',
      message: error.message
    });
  }
}
