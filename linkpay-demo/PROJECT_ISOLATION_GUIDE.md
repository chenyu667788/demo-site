# Evonet 项目隔离管理指南

## 项目概览

本项目包含三个独立的Evonet支付演示项目，每个项目使用不同的端口：

### 1. LinkPay Demo
- **路径**: `e:\payment-demo\evonet-linkpay-demo`
- **端口**: 3000
- **访问地址**: http://localhost:3000
- **启动脚本**: `start-independent.bat` 或 `start-independent.ps1`

### 2. Direct API Demo
- **路径**: `e:\evonet-direct-api-demo`
- **端口**: 3002
- **访问地址**: http://localhost:3002
- **启动脚本**: `start-independent.bat`

### 3. Drop-in Demo
- **路径**: `e:\evonet-dropin-demo`
- **端口**: 3001
- **访问地址**: http://localhost:3001
- **启动脚本**: `start-independent.bat`

## 项目隔离方案

### 问题原因
1. **端口冲突**: 多个项目使用相同端口
2. **进程残留**: 旧进程未完全终止
3. **路径混淆**: 项目路径相似，容易混淆

### 解决方案

#### 方案1: 使用独立启动脚本（推荐）
每个项目都提供了 `start-independent.bat` 启动脚本，它会：
1. 检查端口是否被占用
2. 自动清理占用端口的进程
3. 安装必要的依赖
4. 启动服务器

**使用方法**:
```bash
# 启动LinkPay Demo
cd e:\payment-demo\evonet-linkpay-demo
start-independent.bat

# 启动Direct API Demo
cd e:\evonet-direct-api-demo
start-independent.bat

# 启动Drop-in Demo
cd e:\evonet-dropin-demo
start-independent.bat
```

#### 方案2: 手动管理端口

**检查端口占用**:
```bash
netstat -ano | findstr "3000 3001 3002"
```

**终止占用进程**:
```bash
taskkill /F /PID <进程ID>
```

#### 方案3: 使用不同的终端窗口
为每个项目打开独立的终端窗口，避免进程混淆。

## 最佳实践

### 1. 项目启动顺序
建议按照以下顺序启动项目，避免冲突：
1. LinkPay Demo (端口 3000)
2. Drop-in Demo (端口 3001)
3. Direct API Demo (端口 3002)

### 2. 停止项目
使用 `Ctrl+C` 停止服务器，确保进程完全终止。

### 3. 清理残留进程
如果遇到端口占用，运行以下命令：
```bash
# 清理端口3000
netstat -ano | findstr ":3000"
taskkill /F /PID <进程ID>

# 清理端口3001
netstat -ano | findstr ":3001"
taskkill /F /PID <进程ID>

# 清理端口3002
netstat -ano | findstr ":3002"
taskkill /F /PID <进程ID>
```

### 4. 验证项目独立性
每个项目都有：
- 独立的 `package.json` 文件
- 独立的 `node_modules` 目录
- 独立的配置文件
- 独立的启动脚本

## 常见问题

### Q1: 为什么修改其他项目会影响LinkPay？
**A**: 可能是因为：
1. 端口冲突：其他项目尝试使用相同端口
2. 进程残留：旧进程未完全终止
3. 文件路径混淆：误操作了错误的目录

### Q2: 如何确保项目完全独立？
**A**: 
1. 使用独立启动脚本
2. 每个项目使用不同端口
3. 在不同终端窗口运行
4. 定期清理残留进程

### Q3: 如何验证服务器是否正常运行？
**A**: 
1. 检查终端输出是否有错误
2. 访问对应的URL地址
3. 使用 `netstat` 检查端口监听状态

## 项目文件结构

### LinkPay Demo
```
e:\payment-demo\evonet-linkpay-demo\
├── public/
│   ├── index.html          # 前端支付页面
│   ├── success.html        # 支付成功页面
│   └── error.html          # 支付失败页面
├── server.js               # 后端服务器
├── package.json            # 项目配置
├── README.md               # 项目说明
├── start-independent.bat   # Windows启动脚本
└── start-independent.ps1   # PowerShell启动脚本
```

### Direct API Demo
```
e:\evonet-direct-api-demo\
├── public/
│   ├── index.html          # 前端支付页面
│   ├── success.html        # 支付成功页面
│   └── error.html          # 支付失败页面
├── server.js               # 后端服务器
├── package.json            # 项目配置
└── start-independent.bat   # Windows启动脚本
```

### Drop-in Demo
```
e:\evonet-dropin-demo\
├── public/
│   ├── index.html          # 前端支付页面
│   ├── success.html        # 支付成功页面
│   └── error.html          # 支付失败页面
├── server.js               # 后端服务器
├── package.json            # 项目配置
└── start-independent.bat   # Windows启动脚本
```

## 联系支持
如果遇到其他问题，请检查：
1. Node.js版本是否正确
2. 依赖是否完整安装
3. 端口是否被其他应用占用
4. 防火墙是否阻止了访问
