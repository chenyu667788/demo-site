const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3002;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 支付配置
const EVONET_CONFIG = {
  DIRECT_API_ENDPOINT: 'https://sandbox.evonetonline.com/payment',
  KEY_ID: 'kid_4e103f2ff33c45b39c8df9ee7c8d1336',
  SECRET_KEY: 'sk_sandbox_ef8e03d031e74642a36309f446074037'
};

// 生成当前时间
function getCurrentDateTime() {
  const now = new Date();
  return now.toISOString().replace('Z', '+08:00');
}

// Direct API支付处理
app.post('/api/direct-payment', async (req, res) => {
  console.log('Received direct payment request:', req.body);
  try {
    const { merchantTransID, amount, currency, paymentMethod, returnURL, webhook } = req.body;
    
    const dateTime = getCurrentDateTime();
    const idempotencyKey = merchantTransID || `order_${Date.now()}`;
    
    const requestData = {
      merchantTransInfo: {
        merchantTransID: merchantTransID || `pay_${Date.now()}`,
        merchantTransTime: dateTime
      },
      transAmount: {
        currency: currency || 'HKD',
        value: amount || '100'
      },
      paymentMethod: paymentMethod,
      captureAfterHours: "0",
      allowAuthentication: true,
      returnURL: returnURL || 'http://localhost:3002/success',
      webhook: webhook || 'http://localhost:3002/webhook'
    };
    
    console.log('Creating direct payment with data:', requestData);
    
    const response = await fetch(EVONET_CONFIG.DIRECT_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': EVONET_CONFIG.SECRET_KEY,
        'DateTime': dateTime,
        'KeyID': EVONET_CONFIG.KEY_ID,
        'SignType': 'Key-based',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('Direct API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Direct API error response:', errorText);
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Direct payment API response:', JSON.stringify(result, null, 2));
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Direct payment creation error:', error);
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

// 查询订单状态
app.get('/api/payment/:merchantTransID', async (req, res) => {
  console.log('Query payment status:', req.params.merchantTransID);
  try {
    const { merchantTransID } = req.params;
    const dateTime = getCurrentDateTime();
    
    // 设置响应头，禁止缓存
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    
    const response = await fetch(`${EVONET_CONFIG.DIRECT_API_ENDPOINT}/${merchantTransID}`, {
      method: 'GET',
      headers: {
        'Authorization': EVONET_CONFIG.SECRET_KEY,
        'DateTime': dateTime,
        'KeyID': EVONET_CONFIG.KEY_ID,
        'SignType': 'Key-based'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Query payment error:', errorText);
      return res.status(404).json({ success: false, error: '订单未找到' });
    }
    
    const result = await response.json();
    console.log('Query payment response:', result);
    
    // 格式化返回数据
    const orderData = {
      merchantTransID: result.payment?.merchantTransInfo?.merchantTransID || merchantTransID,
      evoTransID: result.payment?.evoTransInfo?.evoTransID || '-',
      amount: result.payment?.transAmount?.value || '0.00',
      currency: result.payment?.transAmount?.currency || 'HKD',
      status: result.payment?.status || 'unknown',
      paymentMethod: result.paymentMethod?.card?.paymentBrand || '信用卡',
      createdAt: result.payment?.merchantTransInfo?.merchantTransTime || '-',
      paidAt: result.payment?.evoTransInfo?.evoTransTime || '-'
    };
    
    res.json({ success: true, data: orderData });
  } catch (error) {
    console.error('Query payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 确认收货
app.post('/api/payment/:merchantTransID/confirm', async (req, res) => {
  console.log('Confirm receipt:', req.params.merchantTransID);
  try {
    // 这里可以添加确认收货的业务逻辑
    // 例如更新数据库中的订单状态
    res.json({ success: true, message: '确认收货成功' });
  } catch (error) {
    console.error('Confirm receipt error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook接收
app.post('/webhook', (req, res) => {
  console.log('Webhook received:', JSON.stringify(req.body, null, 2));
  
  try {
    const webhookData = req.body;
    
    // 处理不同类型的webhook事件
    if (webhookData.eventCode) {
      switch (webhookData.eventCode) {
        case 'Payment':
          console.log('Payment webhook:', webhookData.payment?.status);
          // 处理支付状态更新
          break;
        case 'Refund':
          console.log('Refund webhook:', webhookData.refund?.status);
          // 处理退款状态更新
          break;
        case 'Capture':
          console.log('Capture webhook:', webhookData.capture?.status);
          // 处理捕获状态更新
          break;
        default:
          console.log('Unknown webhook event:', webhookData.eventCode);
      }
    }
    
    res.send('SUCCESS');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('ERROR');
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`Evonet Direct API demo server running at http://localhost:${port}`);
});