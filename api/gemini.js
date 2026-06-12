const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-gemini-key'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt } = req.body;
  
  // Server env key takes priority; client-sent key is fallback for local dev
  const apiKey = GEMINI_KEY || req.headers['x-gemini-key'];

  if (!apiKey) {
    return res.status(400).json({ error: "Gemini API Key missing. Configure it on the Vercel Environment Variables or client." });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini response failed: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    res.status(200).json({ text });
  } catch (err) {
    console.error("Gemini Proxy Error:", err);
    res.status(500).json({ error: "Failed to communicate with Gemini API." });
  }
};
