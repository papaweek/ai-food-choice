//  เพิ่มบรรทัดนี้เพื่อให้ Node.js สามารถใช้คำสั่ง fetch ได้ครับ
const fetch = require('node-fetch'); 

const N8N_WEBHOOK = 'https://n8n-external.exservice.io/webhook/papawee-restaurant-scrape';

exports.handler = async (event) => {
  // รองรับ CORS preflight (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ''
    };
  }

  // รับแค่ POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('[scrape] Calling n8n webhook...');

    const n8nResponse = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Netlify-Function/food-decision'
      },
      body: event.body || JSON.stringify({
        trigger: 'dashboard',
        timestamp: new Date().toISOString(),
        source: 'netlify-function'
      })
    });

    const rawText = await n8nResponse.text();
    console.log('[scrape] n8n status:', n8nResponse.status);
    console.log('[scrape] n8n response (first 300 chars):', rawText.slice(0, 300));

    // ถ้า n8n ตอบ error
    if (!n8nResponse.ok) {
      return {
        statusCode: 502,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: `n8n returned ${n8nResponse.status}`,
          detail: rawText
        })
      };
    }

    // พยายาม parse เป็น JSON
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // n8n ส่งกลับมาเป็น text ธรรมดา (เช่น "Workflow executed")
      parsed = { message: rawText };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(parsed)
    };

  } catch (err) {
    console.error('[scrape] Error:', err.message);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message })
    };
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}