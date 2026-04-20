import axios, { AxiosInstance } from 'axios';

export interface MatchTraderSession {
  token: string;
  tradingApiToken: string;
  email: string;
  tradingAccountId: string;
  balance: number;
  equity: number;
  lastRefresh: Date;
}

class MatchTraderService {
  private client: AxiosInstance;
  private session: MatchTraderSession | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    const baseURL = process.env.MATCHTRADER_BASE_URL || 'https://mtr-demo-prod.match-trader.com';
    this.client = axios.create({
      baseURL,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Login to MatchTrader and get session tokens
   */
  async login(): Promise<MatchTraderSession> {
    try {
      const response = await this.client.post('/manager/mtr-login', {
        email: process.env.FUNDINGPIPS_EMAIL,
        password: process.env.FUNDINGPIPS_PASSWORD,
        brokerId: process.env.FUNDINGPIPS_BROKER_ID,
      });

      const data = response.data;
      const selectedAccount = data.selectedTradingAccount;

      this.session = {
        token: data.token,
        tradingApiToken: selectedAccount.tradingApiToken,
        email: data.email,
        tradingAccountId: selectedAccount.uuid,
        balance: selectedAccount.offer.initialDeposit || 50000,
        equity: selectedAccount.offer.initialDeposit || 50000,
        lastRefresh: new Date(),
      };

      // Set up automatic token refresh (every 14 minutes)
      this.setupTokenRefresh();

      console.log('✅ MatchTrader login successful:', this.session.email);
      return this.session;
    } catch (error: any) {
      console.error('❌ MatchTrader login failed:', error.response?.data || error.message);
      throw new Error('Failed to login to MatchTrader');
    }
  }

  /**
   * Refresh authentication token before expiration
   */
  async refreshToken(): Promise<void> {
    if (!this.session) {
      throw new Error('No active session. Please login first.');
    }

    try {
      const response = await this.client.post(
        '/manager/refresh-token',
        {},
        {
          headers: {
            'Cookie': `token=${this.session.token}`,
          },
        }
      );

      if (response.data.token) {
        this.session.token = response.data.token;
        this.session.lastRefresh = new Date();
        console.log('✅ Token refreshed');
      }
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error.response?.data || error.message);
      // Try to re-login if token refresh fails
      await this.login();
    }
  }

  /**
   * Set up automatic token refresh every 14 minutes
   */
  private setupTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }

    this.tokenRefreshTimer = setInterval(() => {
      this.refreshToken().catch(console.error);
    }, 14 * 60 * 1000); // 14 minutes
  }

  /**
   * Get current session
   */
  getSession(): MatchTraderSession | null {
    return this.session;
  }

  /**
   * Get authenticated client for trading API calls
   */
  getAuthenticatedClient(): AxiosInstance {
    if (!this.session) {
      throw new Error('Not authenticated. Please login first.');
    }

    return axios.create({
      baseURL: process.env.MATCHTRADER_BASE_URL || 'https://mtr-demo-prod.match-trader.com',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Auth-trading-api': this.session.tradingApiToken,
        'Cookie': `token=${this.session.token}`,
      },
    });
  }

  /**
   * Get account balance and equity
   * Note: Endpoints may vary - adjust based on actual MatchTrader API
   */
  async getAccountInfo(): Promise<{
    balance: number;
    equity: number;
    floatingPnL: number;
    margin: number;
    freeMargin: number;
  }> {
    if (!this.session) {
      throw new Error('Not authenticated');
    }

    try {
      const client = this.getAuthenticatedClient();

      // Try standard endpoint - adjust if different
      const response = await client.get('/trading/account');

      return {
        balance: response.data.balance || this.session.balance,
        equity: response.data.equity || this.session.equity,
        floatingPnL: response.data.floatingPnL || 0,
        margin: response.data.margin || 0,
        freeMargin: response.data.freeMargin || response.data.equity || this.session.equity,
      };
    } catch (error: any) {
      console.warn('⚠️ Could not fetch account info:', error.message);
      // Return session values as fallback
      return {
        balance: this.session.balance,
        equity: this.session.equity,
        floatingPnL: 0,
        margin: 0,
        freeMargin: this.session.equity,
      };
    }
  }

  /**
   * Get open positions
   */
  async getPositions(): Promise<any[]> {
    if (!this.session) {
      throw new Error('Not authenticated');
    }

    try {
      const client = this.getAuthenticatedClient();
      const response = await client.get('/trading/positions');
      return response.data.positions || response.data || [];
    } catch (error: any) {
      console.warn('⚠️ Could not fetch positions:', error.message);
      return [];
    }
  }

  /**
   * Get position by ID
   */
  async getPosition(positionId: string): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated');
    }

    try {
      const client = this.getAuthenticatedClient();
      const response = await client.get(`/trading/positions/${positionId}`);
      return response.data;
    } catch (error: any) {
      console.warn('⚠️ Could not fetch position:', error.message);
      return null;
    }
  }

  /**
   * Close a position
   */
  async closePosition(positionId: string, volume?: number): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated');
    }

    try {
      const client = this.getAuthenticatedClient();
      const response = await client.post(`/trading/positions/${positionId}/close`, {
        volume: volume || undefined,
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Could not close position:', error.message);
      throw error;
    }
  }

  /**
   * Update position (modify SL/TP)
   */
  async updatePosition(positionId: string, updates: any): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated');
    }

    try {
      const client = this.getAuthenticatedClient();
      const response = await client.patch(`/trading/positions/${positionId}`, updates);
      return response.data;
    } catch (error: any) {
      console.error('❌ Could not update position:', error.message);
      throw error;
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }
  }
}

// Singleton instance
export const matchTraderService = new MatchTraderService();

export default matchTraderService;
