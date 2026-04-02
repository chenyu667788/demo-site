const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const port = 3005;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function getCurrentDateTime() {
    const now = new Date();
    return now.toISOString().replace('Z', '+08:00');
}

const EVONET_CONFIG = {
    INTERACTION_API: 'https://sandbox.evonetonline.com/interaction',
    PAYMENT_API: 'https://sandbox.evonetonline.com/payment',
    KEY_ID: 'kid_4e103f2ff33c45b39c8df9ee7c8d1336',
    SECRET_KEY: 'sk_sandbox_ef8e03d031e74642a36309f446074037',
    THREE_DS_REDIRECT_URL: `http://localhost:${port}/api/3ds/callback`,
    THREE_DS_CHALLENGE_URL: `http://localhost:${port}/api/3ds/challenge`
};

const subscriptionPlans = [
    {
        id: 'basic',
        name: '基础版',
        nameEn: 'Basic',
        description: '适合个人用户，包含基础功能',
        price: 9.99,
        currency: 'USD',
        billingCycle: 'monthly',
        features: [
            '5GB 存储空间',
            '基础客服支持',
            '单设备登录',
            '标准画质'
        ]
    },
    {
        id: 'pro',
        name: '专业版',
        nameEn: 'Professional',
        description: '适合专业人士，功能全面升级',
        price: 29.99,
        currency: 'USD',
        billingCycle: 'monthly',
        features: [
            '50GB 存储空间',
            '优先客服支持',
            '5台设备同时登录',
            '高清画质',
            '高级数据分析'
        ],
        popular: true
    },
    {
        id: 'enterprise',
        name: '企业版',
        nameEn: 'Enterprise',
        description: '适合企业团队，无限可能',
        price: 99.99,
        currency: 'USD',
        billingCycle: 'monthly',
        features: [
            '无限存储空间',
            '专属客服经理',
            '无限设备登录',
            '4K超高清画质',
            '高级数据分析',
            'API接口访问',
            '定制化服务'
        ]
    }
];

const subscriptions = new Map();
const customers = new Map();
const customerTokens = new Map();

app.get('/api/plans', (req, res) => {
    res.json({ success: true, plans: subscriptionPlans });
});

app.get('/api/plans/:planId', (req, res) => {
    const plan = subscriptionPlans.find(p => p.id === req.params.planId);
    if (plan) {
        res.json({ success: true, plan });
    } else {
        res.status(404).json({ success: false, error: 'Plan not found' });
    }
});

app.post('/api/subscription/create', async (req, res) => {
    try {
        const { planId, customerInfo, agreeTerms } = req.body;
        
        if (!agreeTerms) {
            return res.status(400).json({ success: false, error: '请同意隐私政策和服务条款' });
        }
        
        const plan = subscriptionPlans.find(p => p.id === planId);
        if (!plan) {
            return res.status(404).json({ success: false, error: '订阅方案不存在' });
        }
        
        const customerId = customerInfo.email ? 
            `CUS-${Buffer.from(customerInfo.email).toString('base64').substring(0, 12)}` : 
            `CUS-${Date.now()}`;
        
        const subscriptionId = `SUB-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        const now = new Date();
        const nextBillingDate = new Date(now);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        
        const subscription = {
            id: subscriptionId,
            customerId,
            customerInfo: {
                email: customerInfo.email || '',
                name: customerInfo.name || '',
                phone: customerInfo.phone || ''
            },
            plan,
            status: 'pending',
            createdAt: now.toISOString(),
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: nextBillingDate.toISOString(),
            nextBillingDate: nextBillingDate.toISOString(),
            billingCycle: plan.billingCycle,
            orderId,
            isFirstSubscription: true
        };
        
        subscriptions.set(subscriptionId, subscription);
        
        if (!customers.has(customerId)) {
            customers.set(customerId, {
                id: customerId,
                email: customerInfo.email || '',
                name: customerInfo.name || '',
                subscriptions: [],
                createdAt: now.toISOString()
            });
        }
        customers.get(customerId).subscriptions.push(subscriptionId);
        
        const dateTime = getCurrentDateTime();
        const apiRequestData = {
            merchantOrderInfo: {
                merchantOrderID: orderId,
                merchantOrderTime: dateTime
            },
            transAmount: {
                currency: plan.currency,
                value: plan.price.toString()
            },
            userInfo: {
                reference: customerId
            },
            paymentMethod: {
                recurringProcessingModel: 'Subscription'
            },
            validTime: 5,
            returnUrl: `http://localhost:${port}/subscription-payment.html?subscriptionId=${subscriptionId}`,
            webhook: `http://localhost:${port}/webhook/subscription`
        };
        
        const headers = {
            'Authorization': EVONET_CONFIG.SECRET_KEY,
            'DateTime': dateTime,
            'KeyID': EVONET_CONFIG.KEY_ID,
            'SignType': 'Key-based',
            'Content-Type': 'application/json'
        };
        
        let paymentUrl;
        let apiResponse = null;
        try {
            const response = await fetch(EVONET_CONFIG.INTERACTION_API, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(apiRequestData)
            });
            
            apiResponse = await response.json();
            console.log('Interaction API response:', JSON.stringify(apiResponse, null, 2));
            
            if (apiResponse && apiResponse.linkUrl) {
                paymentUrl = apiResponse.linkUrl;
            } else if (apiResponse && apiResponse.paymentUrl) {
                paymentUrl = apiResponse.paymentUrl;
            } else {
                const fallbackUrl = `https://sandbox.evonetonline.com/payment/pay?orderId=${orderId}&amount=${plan.price}&currency=${plan.currency}`;
                paymentUrl = fallbackUrl;
            }
        } catch (error) {
            console.error('API call error:', error);
            const fallbackUrl = `https://sandbox.evonetonline.com/payment/pay?orderId=${orderId}&amount=${plan.price}&currency=${plan.currency}`;
            paymentUrl = fallbackUrl;
        }
        
        subscription.paymentUrl = paymentUrl;
        
        res.json({ 
            success: true, 
            subscription,
            paymentUrl,
            orderId,
            message: '请在支付页面勾选"Save card details for next time"以保存卡片信息用于后续自动扣费'
        });
    } catch (error) {
        console.error('Subscription creation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/subscription/:subscriptionId', (req, res) => {
    const subscription = subscriptions.get(req.params.subscriptionId);
    if (subscription) {
        res.json({ success: true, subscription });
    } else {
        res.status(404).json({ success: false, error: 'Subscription not found' });
    }
});

app.post('/api/subscription/:subscriptionId/activate', (req, res) => {
    const subscription = subscriptions.get(req.params.subscriptionId);
    if (!subscription) {
        return res.status(404).json({ success: false, error: 'Subscription not found' });
    }
    
    subscription.status = 'active';
    subscription.activatedAt = new Date().toISOString();
    
    res.json({ success: true, subscription });
});

app.post('/api/subscription/:subscriptionId/cancel', (req, res) => {
    const subscription = subscriptions.get(req.params.subscriptionId);
    if (!subscription) {
        return res.status(404).json({ success: false, error: 'Subscription not found' });
    }
    
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date().toISOString();
    
    res.json({ success: true, subscription, message: '订阅已取消，将在当前计费周期结束后生效' });
});

app.post('/api/subscription/:subscriptionId/upgrade', async (req, res) => {
    const { newPlanId } = req.body;
    const subscription = subscriptions.get(req.params.subscriptionId);
    
    if (!subscription) {
        return res.status(404).json({ success: false, error: 'Subscription not found' });
    }
    
    const newPlan = subscriptionPlans.find(p => p.id === newPlanId);
    if (!newPlan) {
        return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    
    if (newPlan.price <= subscription.plan.price) {
        return res.status(400).json({ success: false, error: '升级需要选择更高级的方案' });
    }
    
    const customerToken = customerTokens.get(subscription.customerId);
    
    if (customerToken && !subscription.isFirstSubscription) {
        return await processRecurringPayment(subscription, newPlan, 'upgrade', res);
    }
    
    const oldPlan = subscription.plan;
    subscription.plan = newPlan;
    subscription.status = 'upgraded';
    subscription.upgradedAt = new Date().toISOString();
    subscription.previousPlan = oldPlan;
    
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    subscription.orderId = orderId;
    
    const dateTime = getCurrentDateTime();
    const apiRequestData = {
        merchantOrderInfo: {
            merchantOrderID: orderId,
            merchantOrderTime: dateTime
        },
        transAmount: {
            currency: newPlan.currency,
            value: newPlan.price.toString()
        },
        userInfo: {
            reference: subscription.customerId
        },
        paymentMethod: {
            recurringProcessingModel: 'Subscription'
        },
        validTime: 5,
        returnUrl: `http://localhost:${port}/subscription-payment.html?subscriptionId=${subscription.id}`,
        webhook: `http://localhost:${port}/webhook/subscription`
    };
    
    const headers = {
        'Authorization': EVONET_CONFIG.SECRET_KEY,
        'DateTime': dateTime,
        'KeyID': EVONET_CONFIG.KEY_ID,
        'SignType': 'Key-based',
        'Content-Type': 'application/json'
    };
    
    let paymentUrl;
    try {
        const response = await fetch(EVONET_CONFIG.INTERACTION_API, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(apiRequestData)
        });
        
        const apiResponse = await response.json();
        paymentUrl = apiResponse.linkUrl || apiResponse.paymentUrl;
    } catch (error) {
        paymentUrl = `https://sandbox.evonetonline.com/payment/pay?orderId=${orderId}&amount=${newPlan.price}&currency=${newPlan.currency}`;
    }
    
    subscription.paymentUrl = paymentUrl;
    
    res.json({ 
        success: true, 
        subscription, 
        paymentUrl,
        message: '升级成功，请完成支付'
    });
});

app.post('/api/subscription/:subscriptionId/downgrade', (req, res) => {
    const { newPlanId } = req.body;
    const subscription = subscriptions.get(req.params.subscriptionId);
    
    if (!subscription) {
        return res.status(404).json({ success: false, error: 'Subscription not found' });
    }
    
    const newPlan = subscriptionPlans.find(p => p.id === newPlanId);
    if (!newPlan) {
        return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    
    if (newPlan.price >= subscription.plan.price) {
        return res.status(400).json({ success: false, error: '降级需要选择更低级的方案' });
    }
    
    const oldPlan = subscription.plan;
    subscription.plan = newPlan;
    subscription.status = 'downgraded';
    subscription.downgradedAt = new Date().toISOString();
    subscription.previousPlan = oldPlan;
    
    res.json({ 
        success: true, 
        subscription, 
        message: '降级将在当前计费周期结束后生效'
    });
});

async function processRecurringPayment(subscription, plan, action, res) {
    const customerToken = customerTokens.get(subscription.customerId);
    
    if (!customerToken) {
        return res.status(400).json({ 
            success: false, 
            error: '未找到支付token，请重新绑定卡片' 
        });
    }
    
    const merchantTransID = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const dateTime = getCurrentDateTime();
    
    const paymentRequestData = {
        merchantTranInfo: {
            merchantTranID: merchantTransID,
            merchantTranTime: dateTime
        },
        transAmount: {
            currency: plan.currency,
            value: plan.price.toString()
        },
        paymentMethod: {
            token: {
                value: customerToken.tokenValue
            },
            recurringProcessingModel: 'Subscription'
        },
        captureAfterHours: '0',
        webhook: `http://localhost:${port}/webhook/subscription`
    };
    
    const headers = {
        'Authorization': EVONET_CONFIG.SECRET_KEY,
        'DateTime': dateTime,
        'KeyID': EVONET_CONFIG.KEY_ID,
        'SignType': 'Key-based',
        'Content-Type': 'application/json'
    };
    
    try {
        console.log('Payment API request:', JSON.stringify(paymentRequestData, null, 2));
        
        const response = await fetch(EVONET_CONFIG.PAYMENT_API, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(paymentRequestData)
        });
        
        const apiResponse = await response.json();
        console.log('Payment API response:', JSON.stringify(apiResponse, null, 2));
        
        if (apiResponse.result && apiResponse.result.code === 'S0000') {
            subscription.plan = plan;
            subscription.status = action === 'upgrade' ? 'upgraded' : 'active';
            subscription.lastPaymentId = merchantTransID;
            subscription.lastPaymentAt = new Date().toISOString();
            
            const nextBillingDate = new Date();
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            subscription.nextBillingDate = nextBillingDate.toISOString();
            
            return res.json({ 
                success: true, 
                subscription,
                paymentId: merchantTransID,
                message: action === 'upgrade' ? '升级成功，已自动扣费' : '续费成功'
            });
        } else {
            throw new Error(apiResponse.result?.message || 'Payment failed');
        }
    } catch (error) {
        console.error('Recurring payment error:', error);
        return res.status(500).json({ 
            success: false, 
            error: `自动扣费失败: ${error.message}` 
        });
    }
}

app.post('/api/subscription/:subscriptionId/renew', async (req, res) => {
    const subscription = subscriptions.get(req.params.subscriptionId);
    
    if (!subscription) {
        return res.status(404).json({ success: false, error: 'Subscription not found' });
    }
    
    const customerToken = customerTokens.get(subscription.customerId);
    
    if (!customerToken) {
        return res.status(400).json({ 
            success: false, 
            error: '未找到支付token，请重新绑定卡片' 
        });
    }
    
    await processRecurringPayment(subscription, subscription.plan, 'renew', res);
});

app.post('/api/subscription/:subscriptionId/bind-card', async (req, res) => {
    const subscription = subscriptions.get(req.params.subscriptionId);
    
    if (!subscription) {
        return res.status(404).json({ success: false, error: 'Subscription not found' });
    }
    
    const orderId = `BIND-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const dateTime = getCurrentDateTime();
    
    const apiRequestData = {
        merchantOrderInfo: {
            merchantOrderID: orderId,
            merchantOrderTime: dateTime
        },
        transAmount: {
            currency: subscription.plan.currency,
            value: '0.01'
        },
        userInfo: {
            reference: subscription.customerId
        },
        paymentMethod: {
            recurringProcessingModel: 'Subscription'
        },
        validTime: 5,
        returnUrl: `http://localhost:${port}/subscription-payment.html?subscriptionId=${subscription.id}`,
        webhook: `http://localhost:${port}/webhook/subscription`
    };
    
    const headers = {
        'Authorization': EVONET_CONFIG.SECRET_KEY,
        'DateTime': dateTime,
        'KeyID': EVONET_CONFIG.KEY_ID,
        'SignType': 'Key-based',
        'Content-Type': 'application/json'
    };
    
    try {
        const response = await fetch(EVONET_CONFIG.INTERACTION_API, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(apiRequestData)
        });
        
        const apiResponse = await response.json();
        const paymentUrl = apiResponse.linkUrl || apiResponse.paymentUrl;
        
        res.json({ 
            success: true, 
            paymentUrl,
            message: '请在支付页面勾选"Save card details for next time"以绑定卡片'
        });
    } catch (error) {
        console.error('Bind card error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/customer/:customerId/subscriptions', (req, res) => {
    const customer = customers.get(req.params.customerId);
    if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    
    const customerSubscriptions = customer.subscriptions
        .map(subId => subscriptions.get(subId))
        .filter(sub => sub !== undefined);
    
    const tokenInfo = customerTokens.get(req.params.customerId);
    
    res.json({ 
        success: true, 
        subscriptions: customerSubscriptions,
        hasToken: !!tokenInfo,
        tokenInfo: tokenInfo ? { 
            createdAt: tokenInfo.createdAt,
            cardLast4: tokenInfo.cardLast4 
        } : null
    });
});

app.post('/webhook/subscription', (req, res) => {
    console.log('=== Subscription webhook received ===');
    console.log('Webhook body:', JSON.stringify(req.body, null, 2));
    
    const webhookData = req.body;
    
    if (webhookData.result && webhookData.result.code === 'S0000') {
        const merchantOrderID = webhookData.merchantOrderInfo?.merchantOrderID;
        const userInfo = webhookData.userInfo;
        const customerId = userInfo?.reference;
        
        if (webhookData.token && webhookData.token.value) {
            console.log('Token received:', webhookData.token.value);
            
            const tokenInfo = {
                tokenValue: webhookData.token.value,
                customerId: customerId,
                createdAt: new Date().toISOString(),
                cardLast4: webhookData.paymentMethod?.card?.last4 || '****',
                cardBrand: webhookData.paymentMethod?.card?.brand || 'Unknown'
            };
            
            customerTokens.set(customerId, tokenInfo);
            console.log('Token saved for customer:', customerId);
        }
        
        for (const [subId, subscription] of subscriptions) {
            if (subscription.orderId === merchantOrderID && subscription.status === 'pending') {
                subscription.status = 'active';
                subscription.activatedAt = new Date().toISOString();
                subscription.isFirstSubscription = false;
                
                if (webhookData.transactionInfo?.merchantTransInfo?.merchantTransID) {
                    subscription.merchantTransID = webhookData.transactionInfo.merchantTransInfo.merchantTransID;
                }
                
                console.log('Subscription activated:', subId);
                break;
            }
        }
    }
    
    res.json({ success: true, message: 'Webhook received' });
});

app.get('/api/payment/:merchantTransID', async (req, res) => {
    const merchantTransID = req.params.merchantTransID;
    const dateTime = getCurrentDateTime();
    
    const headers = {
        'Authorization': EVONET_CONFIG.SECRET_KEY,
        'DateTime': dateTime,
        'KeyID': EVONET_CONFIG.KEY_ID,
        'SignType': 'Key-based',
        'Content-Type': 'application/json'
    };
    
    try {
        const response = await fetch(`${EVONET_CONFIG.PAYMENT_API}/${merchantTransID}`, {
            method: 'GET',
            headers: headers
        });
        
        const apiResponse = await response.json();
        console.log('Payment query response:', JSON.stringify(apiResponse, null, 2));
        
        res.json({ success: true, payment: apiResponse });
    } catch (error) {
        console.error('Payment query error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.get('/error', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'error.html'));
});

app.post('/api/3ds/callback', (req, res) => {
    console.log('=== 3DS Callback received ===');
    console.log('3DS Callback body:', JSON.stringify(req.body, null, 2));
    
    const { threeDSSessionID, merchantOrderID, result } = req.body;
    
    if (result && result.code === 'S0000') {
        for (const [subId, subscription] of subscriptions) {
            if (subscription.orderId === merchantOrderID && subscription.status === 'pending') {
                subscription.status = 'active';
                subscription.activatedAt = new Date().toISOString();
                subscription.isFirstSubscription = false;
                subscription.threeDSAuthenticated = true;
                console.log('Subscription activated after 3DS:', subId);
                break;
            }
        }
        
        res.redirect(`/success.html?subscriptionId=${merchantOrderID}`);
    } else {
        res.redirect(`/error.html?subscriptionId=${merchantOrderID}`);
    }
});

app.post('/api/3ds/challenge', (req, res) => {
    console.log('=== 3DS Challenge received ===');
    console.log('3DS Challenge body:', JSON.stringify(req.body, null, 2));
    
    const { threeDSSessionID, challengeUrl, acsUrl, creq } = req.body;
    
    res.json({
        success: true,
        challengeUrl,
        acsUrl,
        creq,
        message: '3DS Challenge required'
    });
});

app.post('/api/payment/3ds', async (req, res) => {
    const { subscriptionId, cardInfo } = req.body;
    
    const subscription = subscriptions.get(subscriptionId);
    if (!subscription) {
        return res.status(404).json({ success: false, error: 'Subscription not found' });
    }
    
    const merchantTransID = `PAY-3DS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const dateTime = getCurrentDateTime();
    
    const paymentRequestData = {
        merchantTranInfo: {
            merchantTranID: merchantTransID,
            merchantTranTime: dateTime
        },
        transAmount: {
            currency: subscription.plan.currency,
            value: subscription.plan.price.toString()
        },
        paymentMethod: {
            type: 'card',
            card: cardInfo,
            recurringProcessingModel: 'Subscription'
        },
        authentication: {
            type: 'threeDSIntegrator',
            threeDSIntegrator: {
                redirectUrl: EVONET_CONFIG.THREE_DS_REDIRECT_URL,
                challengeUrl: EVONET_CONFIG.THREE_DS_CHALLENGE_URL
            }
        },
        captureAfterHours: '0',
        webhook: `http://localhost:${port}/webhook/subscription`
    };
    
    const headers = {
        'Authorization': EVONET_CONFIG.SECRET_KEY,
        'DateTime': dateTime,
        'KeyID': EVONET_CONFIG.KEY_ID,
        'SignType': 'Key-based',
        'Content-Type': 'application/json'
    };
    
    try {
        console.log('3DS Payment API request:', JSON.stringify(paymentRequestData, null, 2));
        
        const response = await fetch(EVONET_CONFIG.PAYMENT_API, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(paymentRequestData)
        });
        
        const apiResponse = await response.json();
        console.log('3DS Payment API response:', JSON.stringify(apiResponse, null, 2));
        
        if (apiResponse.result && apiResponse.result.code === 'S0000') {
            subscription.status = 'active';
            subscription.activatedAt = new Date().toISOString();
            subscription.lastPaymentId = merchantTransID;
            subscription.lastPaymentAt = new Date().toISOString();
            subscription.threeDSAuthenticated = true;
            
            if (apiResponse.token && apiResponse.token.value) {
                const tokenInfo = {
                    tokenValue: apiResponse.token.value,
                    customerId: subscription.customerId,
                    createdAt: new Date().toISOString(),
                    cardLast4: cardInfo?.last4 || '****',
                    cardBrand: cardInfo?.brand || 'Unknown'
                };
                customerTokens.set(subscription.customerId, tokenInfo);
            }
            
            res.json({
                success: true,
                subscription,
                paymentId: merchantTransID,
                message: '支付成功'
            });
        } else if (apiResponse.authentication && apiResponse.authentication.redirectUrl) {
            res.json({
                success: true,
                requires3DS: true,
                redirectUrl: apiResponse.authentication.redirectUrl,
                threeDSSessionID: apiResponse.authentication.threeDSSessionID,
                message: '需要进行3DS认证'
            });
        } else {
            throw new Error(apiResponse.result?.message || 'Payment failed');
        }
    } catch (error) {
        console.error('3DS Payment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`LinkPay Subscription Demo server running at http://localhost:${port}`);
    console.log(`Subscription plans page: http://localhost:${port}/index.html`);
    console.log(`\n订阅支付流程说明:`);
    console.log(`1. 首次订阅: 用户在LinkPay页面勾选"Save card details for next time"`);
    console.log(`2. Token保存: Webhook会自动保存token用于后续扣费`);
    console.log(`3. 后续订阅: 使用Payment API + token自动扣费`);
});
