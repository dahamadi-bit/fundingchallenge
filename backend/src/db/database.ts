import Database from 'better-sqlite3';
import path from 'path';

export class DatabaseManager {
  private static db: Database.Database | null = null;

  static async initialize(): Promise<void> {
    const dbPath = process.env.DATABASE_URL || './tradingcockpit.db';

    try {
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      console.log(`✅ Database connected: ${dbPath}`);
      this.createTables();
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  private static createTables(): void {
    if (!this.db) return;

    const tables = [
      `CREATE TABLE IF NOT EXISTS trader_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trade_id TEXT UNIQUE NOT NULL,
        pair TEXT NOT NULL,
        type TEXT NOT NULL,
        entry_price REAL NOT NULL,
        sl_price REAL,
        tp1_price REAL,
        tp2_price REAL,
        volume REAL,
        status TEXT DEFAULT 'open',
        open_time DATETIME,
        close_time DATETIME,
        pnl REAL,
        phase INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS daily_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE UNIQUE,
        balance REAL,
        daily_pnl REAL,
        drawdown REAL,
        trades_count INTEGER,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS violations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start DATE,
        count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    tables.forEach((sql) => {
      try {
        this.db!.exec(sql);
      } catch (error) {
        // Table already exists
      }
    });

    console.log('✅ Database tables ready');
  }

  static run(sql: string, params: any[] = []): any {
    if (!this.db) throw new Error('Database not initialized');
    try {
      const stmt = this.db.prepare(sql);
      return stmt.run(...params);
    } catch (error) {
      console.error('❌ Database error:', error);
      throw error;
    }
  }

  static get(sql: string, params: any[] = []): any {
    if (!this.db) throw new Error('Database not initialized');
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(...params);
    } catch (error) {
      console.error('❌ Database error:', error);
      return null;
    }
  }

  static all(sql: string, params: any[] = []): any[] {
    if (!this.db) throw new Error('Database not initialized');
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params);
    } catch (error) {
      console.error('❌ Database error:', error);
      return [];
    }
  }

  static saveState(state: any): void {
    const json = JSON.stringify(state);
    this.run(
      'INSERT OR REPLACE INTO trader_state (id, data, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)',
      [json]
    );
  }

  static getState(): any | null {
    const row = this.get('SELECT data FROM trader_state WHERE id = 1');
    return row ? JSON.parse(row.data) : null;
  }

  static addTrade(trade: any): void {
    this.run(
      `INSERT INTO trades (trade_id, pair, type, entry_price, sl_price, tp1_price, tp2_price, volume, status, open_time, phase)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', CURRENT_TIMESTAMP, ?)`,
      [trade.id, trade.pair, trade.type, trade.entryPrice, trade.slPrice, trade.tp1Price, trade.tp2Price, trade.volume, trade.phase || 1]
    );
  }

  static closeTrade(tradeId: string, pnl: number): void {
    this.run(
      'UPDATE trades SET status = ?, close_time = CURRENT_TIMESTAMP, pnl = ? WHERE trade_id = ?',
      ['closed', pnl, tradeId]
    );
  }

  static getTrades(status?: string): any[] {
    if (status) {
      return this.all('SELECT * FROM trades WHERE status = ? ORDER BY open_time DESC', [status]);
    }
    return this.all('SELECT * FROM trades ORDER BY open_time DESC');
  }

  static logEvent(type: string, data?: any): void {
    this.run(
      'INSERT INTO events (type, data) VALUES (?, ?)',
      [type, data ? JSON.stringify(data) : null]
    );
  }

  static saveDailySnapshot(date: string, snapshot: any): void {
    this.run(
      `INSERT OR REPLACE INTO daily_snapshots (date, balance, daily_pnl, drawdown, trades_count, data)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [date, snapshot.balance, snapshot.dailyPnL, snapshot.drawdown, snapshot.tradesCount, JSON.stringify(snapshot)]
    );
  }

  static async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      console.log('✅ Database closed');
    }
  }
}
