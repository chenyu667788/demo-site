# Evonet LinkPay 支付演示

## 项目概述

这是一个基于 Evonet LinkPay API 的支付演示项目，完全独立于之前的 linkpay 任务。项目实现了完整的支付流程，包括：

- 订单信息输入
- 调用 Evonet API 创建支付
- 生成支付链接并跳转
- 支付成功/失败页面
- Webhook 接收

## 技术栈

- **前端**：HTML5, Tailwind CSS, JavaScript
- **后端**：Node.js, Express
- **依赖**：node-fetch, cors

## 项目结构

```
evonet-linkpay-demo/
├── package.json          # 项目配置和依赖
├── server.js             # 后端服务
├── public/               # 前端静态文件
│   ├── index.html        # 主页面，包含支付表单
│   ├── success.html      # 支付成功页面
│   └── error.html        # 支付失败页面
└── README.md             # 项目说明
```

## 配置信息

- **Sandbox API Endpoint**: https://sandbox.evonetonline.com
- **KeyID**: kid_4e103f2ff33c45b39c8df9ee7c8d1336
- **Secret Key**: sk_sandbox_ef8e03d031e74642a36309f446074037

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
npm start
```

### 3. 访问演示页面

打开浏览器，访问：http://localhost:3000

## 功能说明

1. **主页面**：
   - 输入订单编号、交易金额、货币类型和用户参考
   - 点击"发起支付"按钮创建支付请求
   - 显示支付链接并提供复制功能
   - 点击"跳转到支付页面"按钮进入 Evonet 支付页面

2. **支付成功页面**：
   - 显示支付成功信息
   - 显示支付时间
   - 提供返回首页链接

3. **支付失败页面**：
   - 显示支付失败信息
   - 显示处理时间
   - 提供返回首页链接

4. **Webhook 接收**：
   - 接收 Evonet 支付结果通知
   - 打印通知内容到控制台

## API 调用流程

1. 前端提交订单信息到后端 `/api/create-payment` 接口
2. 后端生成当前时间戳，构建支付请求数据
3. 调用 Evonet `/interaction` API 创建支付
4. 解析 API 响应，提取支付链接
5. 将支付链接返回给前端
6. 前端显示支付链接并跳转至 Evonet 支付页面
7. 用户完成支付后，Evonet 回调 `returnUrl`（成功或失败页面）
8. 同时，Evonet 发送支付结果通知到 `webhook` 地址

## 注意事项

- 本项目使用 Evonet 沙箱环境，仅用于测试
- 实际生产环境中，应使用正式环境的 API 地址和密钥
- 应确保 `returnUrl` 和 `webhook` 地址可被 Evonet 服务器访问
- 应实现更完善的错误处理和日志记录

## 相关文档

- [Evonet LinkPay 集成步骤](https://developer.evonetonline.com/docs/linkpay-integration-step)
- [Evonet Interaction API 参考](https://developer.evonetonline.com/reference/post_interaction)