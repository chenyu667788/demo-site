const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 支付配置
const EVONET_CONFIG = {
  API_ENDPOINT: 'https://sandbox.evonetonline.com/interaction',
  DROPIN_API_ENDPOINT: 'https://sandbox.evonetonline.com/dropin',
  KEY_ID: 'kid_4e103f2ff33c45b39c8df9ee7c8d1336',
  SECRET_KEY: 'sk_sandbox_ef8e03d031e74642a36309f446074037'
};

// 生成当前时间
function getCurrentDateTime() {
  const now = new Date();
  return now.toISOString().replace('Z', '+08:00');
}

// 创建支付请求（LinkPay）
app.post('/api/create-payment', async (req, res) => {
  console.log('Received payment creation request:', req.body);
  try {
    const { orderId, amount, currency, reference } = req.body;
    
    const dateTime = getCurrentDateTime();
    
    const requestData = {
      merchantOrderInfo: {
        merchantOrderID: orderId || `ORD-${Date.now()}`,
        merchantOrderTime: dateTime
      },
      transAmount: {
        currency: currency || 'USD',
        value: amount || '100'
      },
      userInfo: {
        reference: reference || 'test_user'
      },
      validTime: 5,
      returnUrl: 'http://localhost:3002/success',
      webhook: 'http://localhost:3002/webhook'
    };
    
    console.log('Creating payment with data:', requestData);
    
    const response = await fetch(EVONET_CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': EVONET_CONFIG.SECRET_KEY,
        'DateTime': dateTime,
        'KeyID': EVONET_CONFIG.KEY_ID,
        'SignType': 'Key-based'
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Payment API response:', result);
    
    if (!result.paymentUrl && !result.redirectUrl && !result.url && !result.linkUrl) {
      throw new Error('API response does not contain payment URL');
    }
    
    const paymentUrl = result.paymentUrl || result.redirectUrl || result.url || result.linkUrl;
    console.log('Generated payment URL:', paymentUrl);
    
    res.json({ success: true, paymentUrl, orderId: requestData.merchantOrderInfo.merchantOrderID });
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建Drop-in会话
app.post('/api/create-dropin-session', async (req, res) => {
  console.log('Received dropin session creation request:', req.body);
  try {
    const { orderId, amount, currency, reference } = req.body;
    
    const dateTime = getCurrentDateTime();
    
    const requestData = {
      merchantOrderInfo: {
        merchantOrderID: orderId || `ORD-${Date.now()}`,
        merchantOrderTime: dateTime
      },
      transAmount: {
        currency: currency || 'USD',
        value: amount || '100'
      },
      userInfo: {
        reference: reference || 'test_user'
      },
      validTime: 5,
      returnUrl: 'http://localhost:3002/success',
      webhook: 'http://localhost:3002/webhook'
    };
    
    console.log('Creating dropin session with data:', requestData);
    
    // 使用原来的API端点
    const response = await fetch(EVONET_CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': EVONET_CONFIG.SECRET_KEY,
        'DateTime': dateTime,
        'KeyID': EVONET_CONFIG.KEY_ID,
        'SignType': 'Key-based'
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Dropin session API response:', JSON.stringify(result, null, 2));
    
    if (!result.sessionID) {
      throw new Error('API response does not contain session ID');
    }
    
    console.log('Generated session ID:', result.sessionID);
    
    // 检查API响应中是否有dropin SDK的URL或其他集成信息
    if (result.dropinUrl || result.sdkUrl) {
      console.log('Drop-in SDK URL:', result.dropinUrl || result.sdkUrl);
    }
    
    // 同时返回linkUrl，以便在Drop-in SDK不可用时使用
    res.json({ 
      success: true, 
      sessionId: result.sessionID, 
      orderId: requestData.merchantOrderInfo.merchantOrderID,
      linkUrl: result.linkUrl
    });
  } catch (error) {
    console.error('Dropin session creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 支付成功页面
app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// 支付失败页面
app.get('/error', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'error.html'));
});



// Webhook接收
app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body);
  // 这里可以处理支付结果通知
  res.send('SUCCESS');
});

// 启动服务器
app.listen(port, () => {
  console.log(`Evonet Drop-in demo server running at http://localhost:${port}`);
});