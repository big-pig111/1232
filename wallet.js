/**
 * 钱包连接管理器
 * 支持 MetaMask, WalletConnect, Coinbase Wallet, Trust Wallet
 */

class WalletManager {
  constructor() {
    // Solana相关
    this.solanaConnection = null;
    this.solanaWallet = null;
    
    // 通用状态
    this.currentAccount = null;
    this.currentChain = 'solana'; // 只支持Solana
    this.isConnected = false;
    
    // 钱包名称映射
    this.walletNames = {
      // Solana钱包
      'phantom': 'Phantom',
      'okx': 'OKX Wallet',
      'solflare': 'Solflare',
      'slope': 'Slope'
    };
    
    // Solana RPC 端点
    this.solanaRpcUrl = 'https://api.mainnet-beta.solana.com';
  }

  // 初始化钱包管理器
  async init() {
    this.setupEventListeners();
    await this.checkConnection();
  }

  // 设置事件监听器
  setupEventListeners() {
    // 钱包按钮事件监听
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.openWalletModal());
    }
    
    // 关闭按钮事件监听
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeWalletModal());
    }
    
    // 钱包选项事件监听
    document.querySelectorAll('.wallet-option').forEach(option => {
      option.addEventListener('click', () => {
        const walletType = option.getAttribute('data-wallet');
        this.connectWallet(walletType);
      });
    });
    
    // 点击弹窗外部区域关闭弹窗
    const walletModal = document.getElementById('walletModal');
    if (walletModal) {
      walletModal.addEventListener('click', (e) => {
        if (e.target === walletModal) {
          this.closeWalletModal();
        }
      });
    }
    
    // ESC键关闭弹窗
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeWalletModal();
      }
    });
  }

  // 检查连接状态
  async checkConnection() {
    // 检查 Phantom 钱包连接状态
    if (typeof window.solana !== 'undefined' && window.solana.isPhantom) {
      try {
        if (window.solana.isConnected) {
          this.currentAccount = window.solana.publicKey.toString();
          this.currentChain = 'solana';
          this.solanaWallet = window.solana;
          this.isConnected = true;
          this.solanaConnection = new solanaWeb3.Connection(this.solanaRpcUrl, 'confirmed');
          this.updateConnectedStatus(this.currentAccount);
          return;
        }
      } catch (error) {
        console.log('检查Phantom连接状态时出错:', error);
      }
    }

    // 检查 OKX 钱包连接状态
    if (typeof window.okxwallet !== 'undefined' && window.okxwallet.solana) {
      try {
        if (window.okxwallet.solana.isConnected) {
          this.currentAccount = window.okxwallet.solana.publicKey.toString();
          this.currentChain = 'solana';
          this.solanaWallet = window.okxwallet.solana;
          this.isConnected = true;
          this.solanaConnection = new solanaWeb3.Connection(this.solanaRpcUrl, 'confirmed');
          this.updateConnectedStatus(this.currentAccount);
          return;
        }
      } catch (error) {
        console.log('检查OKX连接状态时出错:', error);
      }
    }
  }

  // 钱包弹窗功能
  openWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) {
      modal.classList.add('active');
    }
  }
  
  closeWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  // 连接钱包主函数
  async connectWallet(walletType) {
    try {
      this.closeWalletModal();
      this.showLoadingStatus('正在连接...');

      switch (walletType) {
        // Solana钱包
        case 'phantom':
          await this.connectPhantom();
          break;
        case 'okx':
          await this.connectOKX();
          break;
        case 'solflare':
          await this.connectSolflare();
          break;
        case 'slope':
          await this.connectSlope();
          break;
        default:
          throw new Error('不支持的钱包类型');
      }
    } catch (error) {
      console.error('连接钱包时出错:', error);
      this.showError(error.message);
      this.resetButtonStatus();
    }
  }

  // OKX 钱包连接
  async connectOKX() {
    if (typeof window.okxwallet === 'undefined' || !window.okxwallet.solana) {
      throw new Error('请先安装 OKX 钱包');
    }

    try {
      // 连接到OKX Solana钱包
      const response = await window.okxwallet.solana.connect();
      
      if (!response.publicKey) {
        throw new Error('连接失败，未获取到公钥');
      }

      this.currentAccount = response.publicKey.toString();
      this.currentChain = 'solana';
      this.solanaWallet = window.okxwallet.solana;
      this.isConnected = true;

      // 初始化Solana连接
      this.solanaConnection = new solanaWeb3.Connection(this.solanaRpcUrl, 'confirmed');

      // 监听断开连接
      window.okxwallet.solana.on('disconnect', () => {
        console.log('OKX 已断开连接');
        this.resetConnection();
      });

      // 监听账户变化
      window.okxwallet.solana.on('accountChanged', (publicKey) => {
        if (publicKey) {
          this.currentAccount = publicKey.toString();
          this.updateConnectedStatus(this.currentAccount);
        } else {
          this.resetConnection();
        }
      });

      this.updateConnectedStatus(this.currentAccount);
      
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('用户拒绝了连接请求');
      }
      throw error;
    }
  }



  // Phantom 钱包连接
  async connectPhantom() {
    if (typeof window.solana === 'undefined' || !window.solana.isPhantom) {
      throw new Error('请先安装 Phantom 钱包');
    }

    try {
      // 连接到Phantom
      const response = await window.solana.connect();
      
      if (!response.publicKey) {
        throw new Error('连接失败，未获取到公钥');
      }

      this.currentAccount = response.publicKey.toString();
      this.currentChain = 'solana';
      this.solanaWallet = window.solana;
      this.isConnected = true;

      // 初始化Solana连接
      this.solanaConnection = new solanaWeb3.Connection(this.solanaRpcUrl, 'confirmed');

      // 监听断开连接
      window.solana.on('disconnect', () => {
        console.log('Phantom 已断开连接');
        this.resetConnection();
      });

      // 监听账户变化
      window.solana.on('accountChanged', (publicKey) => {
        if (publicKey) {
          this.currentAccount = publicKey.toString();
          this.updateConnectedStatus(this.currentAccount);
        } else {
          this.resetConnection();
        }
      });

      this.updateConnectedStatus(this.currentAccount);
      
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('用户拒绝了连接请求');
      }
      throw error;
    }
  }

  // Solflare 钱包连接
  async connectSolflare() {
    if (typeof window.solflare === 'undefined') {
      throw new Error('请先安装 Solflare 钱包');
    }

    try {
      await window.solflare.connect();
      
      if (!window.solflare.publicKey) {
        throw new Error('连接失败，未获取到公钥');
      }

      this.currentAccount = window.solflare.publicKey.toString();
      this.currentChain = 'solana';
      this.solanaWallet = window.solflare;
      this.isConnected = true;

      // 初始化Solana连接
      this.solanaConnection = new solanaWeb3.Connection(this.solanaRpcUrl, 'confirmed');

      this.updateConnectedStatus(this.currentAccount);
      
    } catch (error) {
      throw new Error('Solflare 连接失败: ' + error.message);
    }
  }

  // Slope 钱包连接
  async connectSlope() {
    if (typeof window.Slope === 'undefined') {
      throw new Error('请先安装 Slope 钱包');
    }

    try {
      const response = await new window.Slope().connect();
      
      if (!response.data.publicKey) {
        throw new Error('连接失败，未获取到公钥');
      }

      this.currentAccount = response.data.publicKey;
      this.currentChain = 'solana';
      this.solanaWallet = window.Slope;
      this.isConnected = true;

      // 初始化Solana连接
      this.solanaConnection = new solanaWeb3.Connection(this.solanaRpcUrl, 'confirmed');

      this.updateConnectedStatus(this.currentAccount);
      
    } catch (error) {
      throw new Error('Slope 连接失败: ' + error.message);
    }
  }



  // 更新连接状态
  updateConnectedStatus(account) {
    const connectBtn = document.querySelector('.connect-wallet-btn');
    if (connectBtn) {
      const shortAddress = account.slice(0, 6) + '...' + account.slice(-4);
      connectBtn.textContent = shortAddress;
      connectBtn.style.background = 'rgba(34, 197, 94, 0.2)';
      connectBtn.style.borderColor = 'rgba(34, 197, 94, 0.4)';
      
      // 更改点击事件为断开连接
      connectBtn.onclick = () => this.disconnectWallet();
    }
  }

  // 显示加载状态
  showLoadingStatus(message) {
    const connectBtn = document.querySelector('.connect-wallet-btn');
    if (connectBtn) {
      connectBtn.textContent = message;
      connectBtn.style.background = 'rgba(59, 130, 246, 0.2)';
      connectBtn.style.borderColor = 'rgba(59, 130, 246, 0.4)';
    }
  }

  // 显示错误
  showError(message) {
    alert('连接失败: ' + message);
  }

  // 重置按钮状态
  resetButtonStatus() {
    const connectBtn = document.querySelector('.connect-wallet-btn');
    if (connectBtn) {
      connectBtn.textContent = '连接钱包';
      connectBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      connectBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      connectBtn.onclick = () => this.openWalletModal();
    }
  }

  // 重置连接
  resetConnection() {
    this.currentAccount = null;
    this.currentChain = 'solana';
    this.solanaConnection = null;
    this.solanaWallet = null;
    this.isConnected = false;
    this.resetButtonStatus();
  }

  // 断开钱包连接
  async disconnectWallet() {
    try {
      if (this.solanaWallet) {
        // 断开Solana钱包连接
        if (this.solanaWallet.disconnect) {
          await this.solanaWallet.disconnect();
        }
      }
      
      this.resetConnection();
      alert('钱包已断开连接');
    } catch (error) {
      console.error('断开连接时出错:', error);
    }
  }

  // 获取当前网络信息
  async getCurrentNetwork() {
    if (this.web3) {
      try {
        const chainId = await this.web3.eth.getChainId();
        return chainId;
      } catch (error) {
        console.error('获取网络信息失败:', error);
      }
    }
    return null;
  }

  // 获取账户余额
  async getAccountBalance() {
    if (this.solanaConnection && this.currentAccount) {
      try {
        const publicKey = new solanaWeb3.PublicKey(this.currentAccount);
        const balance = await this.solanaConnection.getBalance(publicKey);
        // 将lamports转换为SOL (1 SOL = 1,000,000,000 lamports)
        return (balance / solanaWeb3.LAMPORTS_PER_SOL).toFixed(6);
      } catch (error) {
        console.error('获取SOL余额失败:', error);
      }
    }
    return null;
  }

  // 获取钱包名称
  getWalletName(walletType) {
    return this.walletNames[walletType] || walletType;
  }

  // 发送交易
  async sendTransaction(to, value) {
    if (!this.isConnected || !this.currentAccount) {
      throw new Error('请先连接钱包');
    }

    if (!this.solanaConnection || !this.solanaWallet) {
      throw new Error('Solana钱包未连接');
    }

    try {
      const fromPubkey = new solanaWeb3.PublicKey(this.currentAccount);
      const toPubkey = new solanaWeb3.PublicKey(to);
      const lamports = value * solanaWeb3.LAMPORTS_PER_SOL;

      const transaction = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      const { blockhash } = await this.solanaConnection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // 使用钱包签名并发送交易
      const signedTransaction = await this.solanaWallet.signAndSendTransaction(transaction);
      return signedTransaction.signature;
    } catch (error) {
      console.error('发送SOL交易失败:', error);
      throw error;
    }
  }

  // 签名消息
  async signMessage(message) {
    if (!this.isConnected || !this.currentAccount) {
      throw new Error('请先连接钱包');
    }

    if (!this.solanaWallet) {
      throw new Error('Solana钱包未连接');
    }

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await this.solanaWallet.signMessage(encodedMessage);
      return signedMessage.signature;
    } catch (error) {
      console.error('SOL消息签名失败:', error);
      throw error;
    }
  }

  // 获取当前区块链类型
  getCurrentChain() {
    return this.currentChain;
  }

  // 获取Solana连接实例
  getSolanaConnection() {
    return this.solanaConnection;
  }

  // 获取当前钱包类型
  getCurrentWalletType() {
    if (this.solanaWallet) {
      if (this.solanaWallet.isPhantom) return 'phantom';
      if (this.solanaWallet.isSolflare) return 'solflare';
      if (this.solanaWallet.isOKXWallet) return 'okx';
      return 'solana';
    }
    return null;
  }
}

// 全局钱包管理器实例
let walletManager = null;

// 初始化函数
function initWallet() {
  walletManager = new WalletManager();
  return walletManager.init();
}

// 导出为全局变量（如果需要的话）
if (typeof window !== 'undefined') {
  window.WalletManager = WalletManager;
  window.walletManager = walletManager;
  window.initWallet = initWallet;
} 
