const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 支付配置
const EVONET_CONFIG = {
  API_ENDPOINT: 'https://sandbox.evonetonline.com/interaction',
  PAYMENT_ENDPOINT: 'https://sandbox.evonetonline.com/payment',
  KEY_ID: 'kid_4e103f2ff33c45b39c8df9ee7c8d1336',
  SECRET_KEY: 'sk_sandbox_ef8e03d031e74642a36309f446074037'
};

// 存储订单信息（实际项目中应该使用数据库）
const orderStorage = {};

// 生成当前时间
function getCurrentDateTime() {
  const now = new Date();
  return now.toISOString().replace('Z', '+08:00');
}

// 创建支付请求
app.post('/api/create-payment', async (req, res) => {
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
      returnUrl: `http://localhost:3000/order-tracking?orderId=${orderId || `ORD-${Date.now()}`}`,
      webhook: 'http://localhost:3000/webhook'
    };
    
    // 存储订单信息
    const merchantOrderID = requestData.merchantOrderInfo.merchantOrderID;
    orderStorage[merchantOrderID] = {
      orderId: merchantOrderID,
      amount: requestData.transAmount.value,
      currency: requestData.transAmount.currency,
      status: 'Pending',
      createTime: dateTime,
      reference: reference || 'test_user'
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
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Payment API response:', result);
    
    if (!result.linkUrl && !result.paymentUrl && !result.redirectUrl && !result.url) {
      throw new Error('API response does not contain payment URL');
    }
    
    const paymentUrl = result.linkUrl || result.paymentUrl || result.redirectUrl || result.url;
    
    res.json({ success: true, paymentUrl, orderId: requestData.merchantOrderInfo.merchantOrderID });
  } catch (error) {
    console.error('Payment creation error:', error);
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

// 订单追踪页面
app.get('/order-tracking', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'order-tracking.html'));
});

// Webhook接收
app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body);
  
  // 处理支付结果通知
  const { merchantOrderInfo, transactionInfo, result } = req.body;
  
  if (merchantOrderInfo && merchantOrderInfo.merchantOrderID) {
    const orderId = merchantOrderInfo.merchantOrderID;
    
    // 更新订单状态
    if (orderStorage[orderId]) {
      orderStorage[orderId].status = merchantOrderInfo.status;
      orderStorage[orderId].transactionInfo = transactionInfo;
      orderStorage[orderId].result = result;
      
      console.log(`Order ${orderId} updated:`, orderStorage[orderId]);
    }
  }
  
  res.json({ received: true });
});

// 订单查询API
app.get('/api/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // 始终从Evonet API获取最新订单状态
    const dateTime = getCurrentDateTime();
    
    const response = await fetch(`${EVONET_CONFIG.API_ENDPOINT}/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': EVONET_CONFIG.SECRET_KEY,
        'DateTime': dateTime,
        'KeyID': EVONET_CONFIG.KEY_ID,
        'SignType': 'Key-based'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Order query result:', result);
    
    res.json({ success: true, order: result });
  } catch (error) {
    console.error('Order query error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 退款API
app.post('/api/refund', async (req, res) => {
  try {
    const { merchantTransID, amount, currency } = req.body;
    
    const dateTime = getCurrentDateTime();
    
    const refundData = {
      transAmount: amount ? {
        currency: currency,
        value: amount
      } : undefined,
      reason: 'Customer request refund'
    };
    
    const response = await fetch(`${EVONET_CONFIG.PAYMENT_ENDPOINT}/${merchantTransID}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': EVONET_CONFIG.SECRET_KEY,
        'DateTime': dateTime,
        'KeyID': EVONET_CONFIG.KEY_ID,
        'SignType': 'Key-based'
      },
      body: JSON.stringify(refundData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Refund result:', result);
    
    res.json({ success: true, refund: result });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`Evonet LinkPay demo server running at http://localhost:${port}`);
});