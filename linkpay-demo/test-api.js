const http = require('http');

const postData = JSON.stringify({
  merchantTranInfo: {
    merchantTranID: 'TEST-123',
    merchantTranTime: new Date().toISOString().replace('Z', '+08:00')
  },
  transAmount: {
    currency: 'USD',
    value: '100'
  },
  userInfo: {
    reference: 'test'
  }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/create-payment',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('响应体:', data);
    const responseData = JSON.parse(data);
    console.log('支付链接:', responseData.linkUrl || responseData.paymentUrl);
  });
});

req.on('error', (e) => {
  console.error(`请求遇到问题: ${e.message}`);
});

// 写入数据到请求体
req.write(postData);
req.end();