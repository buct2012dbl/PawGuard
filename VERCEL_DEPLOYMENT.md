# Vercel 生产环境部署指南

## 前提条件

在部署到Vercel之前，你需要准备：

### 1. Hedera 账户和凭证
- 访问 [Hedera Portal](https://portal.hedera.com/)
- 创建testnet账户
- 获取你的 Operator ID (格式: 0.0.xxxxx)
- 获取你的 Private Key

### 2. IPFS 服务
选择一个IPFS服务提供商：
- [Infura IPFS](https://infura.io/product/ipfs)
- [Pinata](https://www.pinata.cloud/)
- [Web3.Storage](https://web3.storage/)

### 3. 以太坊RPC节点
选择一个以太坊节点服务：
- [Alchemy](https://www.alchemy.com/) (推荐)
- [Infura](https://infura.io/)
- [QuickNode](https://www.quicknode.com/)

### 4. 部署智能合约到测试网
```bash
# 1. 配置Hardhat连接到Sepolia
# 编辑 hardhat.config.cjs 添加 sepolia 网络

# 2. 部署合约
npx hardhat run scripts/deploy-simple.js --network sepolia

# 3. 记录下所有合约地址
```

## 步骤 1: 准备前端项目

### 1.1 创建生产环境配置

在 `frontend/` 目录下创建 `.env.production`:

```bash
cd frontend
cp .env.example .env.production
```

编辑 `.env.production`:

```env
# 应用模式
NEXT_PUBLIC_APP_MODE=production

# Hedera 配置
NEXT_PUBLIC_HEDERA_NETWORK=testnet

# IPFS 配置
NEXT_PUBLIC_IPFS_API_URL=https://ipfs.infura.io:5001
NEXT_PUBLIC_IPFS_GATEWAY_URL=https://ipfs.io

# 区块链配置
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_NETWORK_NAME=Sepolia Testnet
```

### 1.2 更新合约地址

编辑 `frontend/src/artifacts/contracts/contract-addresses.json`，使用Sepolia测试网上部署的合约地址：

```json
{
  "PetNFT": "0x你的Sepolia合约地址",
  "PawGuardToken": "0x你的Sepolia合约地址",
  "GuardStableCoin": "0x你的Sepolia合约地址",
  "PawPool": "0x你的Sepolia合约地址",
  "VeterinarianCredential": "0x你的Sepolia合约地址",
  "PetIdentity": "0x你的Sepolia合约地址",
  "JuryIdentity": "0x你的Sepolia合约地址"
}
```

## 步骤 2: 配置 Vercel

### 2.1 创建 Vercel 配置文件

创建 `vercel.json` 在项目根目录：

```json
{
  "version": 2,
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/.next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "github": {
    "silent": true
  }
}
```

### 2.2 配置根目录重定向

由于你的Next.js应用在 `frontend/` 子目录中，创建 `vercel.json` 在根目录：

```json
{
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "frontend/$1"
    }
  ]
}
```

## 步骤 3: 部署到 Vercel

### 方法 1: 通过 Vercel CLI (推荐)

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署项目
vercel

# 4. 按照提示操作:
# - Set up and deploy? Yes
# - Which scope? 选择你的账户
# - Link to existing project? No
# - What's your project's name? pawguard
# - In which directory is your code located? ./frontend
# - Override settings? Yes
# - Build Command: npm run build
# - Output Directory: .next
# - Development Command: npm run dev

# 5. 配置环境变量
vercel env add NEXT_PUBLIC_APP_MODE
# 输入: production

vercel env add NEXT_PUBLIC_HEDERA_NETWORK
# 输入: testnet

vercel env add HEDERA_OPERATOR_ID
# 输入: 你的 Hedera Operator ID

vercel env add HEDERA_OPERATOR_KEY
# 输入: 你的 Hedera Private Key

vercel env add NEXT_PUBLIC_IPFS_API_URL
# 输入: https://ipfs.infura.io:5001

vercel env add NEXT_PUBLIC_IPFS_GATEWAY_URL
# 输入: https://ipfs.io

vercel env add NEXT_PUBLIC_CHAIN_ID
# 输入: 11155111

vercel env add NEXT_PUBLIC_RPC_URL
# 输入: 你的 Alchemy Sepolia RPC URL

vercel env add NEXT_PUBLIC_NETWORK_NAME
# 输入: Sepolia Testnet

# 6. 重新部署以应用环境变量
vercel --prod
```

### 方法 2: 通过 Vercel Dashboard (Web界面)

1. **访问 [Vercel Dashboard](https://vercel.com/dashboard)**

2. **导入项目**
   - 点击 "Add New..." → "Project"
   - 连接你的 GitHub 仓库
   - 选择 PawGuard 仓库

3. **配置构建设置**
   - Framework Preset: `Next.js`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **配置环境变量**

   在 "Environment Variables" 部分添加：

   **Public 变量 (所有环境):**
   ```
   NEXT_PUBLIC_APP_MODE = production
   NEXT_PUBLIC_HEDERA_NETWORK = testnet
   NEXT_PUBLIC_IPFS_API_URL = https://ipfs.infura.io:5001
   NEXT_PUBLIC_IPFS_GATEWAY_URL = https://ipfs.io
   NEXT_PUBLIC_CHAIN_ID = 11155111
   NEXT_PUBLIC_RPC_URL = https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   NEXT_PUBLIC_NETWORK_NAME = Sepolia Testnet
   ```

   **Private 变量 (仅服务器端):**
   ```
   HEDERA_OPERATOR_ID = 0.0.xxxxx
   HEDERA_OPERATOR_KEY = 你的私钥
   ```

   ⚠️ **安全提示**:
   - `HEDERA_OPERATOR_KEY` 不要添加 `NEXT_PUBLIC_` 前缀
   - 这些私钥只在服务器端API路由中可用，不会暴露给浏览器

5. **部署**
   - 点击 "Deploy"
   - 等待构建完成（约2-3分钟）

## 步骤 4: 验证部署

### 4.1 检查构建日志

在 Vercel Dashboard 查看构建日志，确保：
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

### 4.2 测试应用

访问你的 Vercel URL (例如: `https://pawguard.vercel.app`)

检查：
1. **控制台输出**: 应该显示 `🚀 PawGuard running in PRODUCTION mode`
2. **连接钱包**: MetaMask 应该提示切换到 Sepolia 网络
3. **注册宠物**:
   - 填写宠物信息
   - 上传到 IPFS 应该使用 Infura
   - 创建 Hedera DID 应该调用真实的 Hedera API
4. **查看宠物**: 应该能从 IPFS 加载真实数据

### 4.3 检查浏览器控制台

应该看到：
```
🚀 PawGuard running in PRODUCTION mode
🌐 Connected to IPFS at https://ipfs.infura.io:5001
```

而不是：
```
🚀 PawGuard running in DEVELOPMENT mode
📝 Using mock Hedera DID and local IPFS
```

## 步骤 5: 设置自定义域名（可选）

1. 在 Vercel Dashboard 的项目设置中
2. 点击 "Domains"
3. 添加你的域名 (例如: `pawguard.com`)
4. 按照说明配置 DNS 记录

## 故障排除

### 问题 1: 构建失败 "Module not found"

**解决方案**: 确保所有依赖都在 `frontend/package.json` 中

```bash
cd frontend
npm install
npm run build  # 本地测试构建
```

### 问题 2: "Hedera credentials not configured"

**解决方案**:
1. 检查环境变量是否正确设置
2. 注意 `HEDERA_OPERATOR_KEY` 不要有 `NEXT_PUBLIC_` 前缀
3. 在 Vercel Dashboard 重新检查环境变量

### 问题 3: IPFS 上传失败

**解决方案**:
1. 确认 Infura IPFS API key 有效
2. 检查 `NEXT_PUBLIC_IPFS_API_URL` 设置正确
3. 考虑使用 Pinata 作为替代:
   ```
   NEXT_PUBLIC_IPFS_API_URL=https://api.pinata.cloud
   PINATA_API_KEY=你的key
   PINATA_SECRET_KEY=你的secret
   ```

### 问题 4: MetaMask 无法连接

**解决方案**:
1. 确保 `NEXT_PUBLIC_CHAIN_ID` 正确 (Sepolia = 11155111)
2. 确保 `NEXT_PUBLIC_RPC_URL` 可访问
3. 在 MetaMask 中手动添加 Sepolia 网络

### 问题 5: 合约调用失败

**解决方案**:
1. 确认合约已部署到 Sepolia
2. 验证 `contract-addresses.json` 中的地址正确
3. 确保钱包有 Sepolia ETH（从水龙头获取）

## 持续部署

### 自动部署

Vercel 会自动部署：
- **Production**: 推送到 `main` 分支
- **Preview**: 推送到其他分支或 Pull Request

### 手动重新部署

```bash
# 通过 CLI
vercel --prod

# 或在 Vercel Dashboard
# Deployments → 点击 "..." → "Redeploy"
```

## 监控和日志

### 查看实时日志

```bash
vercel logs pawguard --follow
```

### Vercel Dashboard

访问 https://vercel.com/dashboard
- Deployments: 查看所有部署历史
- Analytics: 查看访问统计
- Logs: 查看运行时日志

## 成本估算

### Vercel 免费计划包括:
- ✅ 每月 100 GB 带宽
- ✅ 无限部署
- ✅ 自动 HTTPS
- ✅ 边缘网络 CDN

### 额外成本:
- **Hedera**: 每次创建 DID 约 $0.0001 (testnet 免费)
- **IPFS**: Infura 免费层 5GB 存储
- **Alchemy**: 免费层每月 300M 请求

## 安全检查清单

- [ ] `HEDERA_OPERATOR_KEY` 没有 `NEXT_PUBLIC_` 前缀
- [ ] `.env.local` 在 `.gitignore` 中
- [ ] 生产环境使用独立的 Hedera 账户
- [ ] RPC URL 包含 API key（不要暴露在前端）
- [ ] 合约已在 Etherscan 上验证
- [ ] 设置了速率限制和防滥用措施

## 下一步

部署成功后，你可以：

1. **配置域名**: 添加自定义域名
2. **设置分析**: 集成 Vercel Analytics
3. **添加监控**: 设置 Sentry 错误追踪
4. **性能优化**: 启用 Edge Functions
5. **主网部署**: 切换到以太坊主网和 Hedera 主网

---

**需要帮助？**
- Vercel 文档: https://vercel.com/docs
- Hedera 文档: https://docs.hedera.com
- PawGuard 配置指南: `frontend/CONFIG.md`
