import { Pool, QueryResult } from "pg";
import { TraderState, Trade, Phase } from "../../shared/types";

let pool: Pool;

export class DatabaseManager {
  static async initialize() {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    });

    // Test connection
    try {
      const result = await pool.query("SELECT NOW()");
      console.log("✅ Database connected:", result.rows[0]);
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      throw error;
    }

    await this.initializeTables();
  }

  private static async initializeTables() {
    const queries = [
      `
        CREATE TABLE IF NOT EXISTS trader_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          state JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS trades (
          id VARCHAR(255) PRIMARY KEY,
          pair VARCHAR(10) NOT NULL,
          entry_level NUMERIC NOT NULL,
          sl_level NUMERIC NOT NULL,
          tp1_level NUMERIC NOT NULL,
          tp2_level NUMERIC NOT NULL,
          confidence INTEGER,
          opened_at TIMESTAMP NOT NULL,
          closed_at TIMESTAMP,
          exit_level NUMERIC,
          exit_type VARCHAR(50),
          pnl NUMERIC,
          pnl_pct NUMERIC,
          phase INTEGER,
          reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          type VARCHAR(100) NOT NULL,
          data JSONB NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS daily_snapshots (
          id SERIAL PRIMARY KEY,
          date DATE NOT NULL UNIQUE,
          daily_pnl NUMERIC,
          daily_loss_pct NUMERIC,
          trades_today INTEGER,
          consecutive_losses INTEGER,
          balance NUMERIC,
          equity NUMERIC,
          drawdown_pct NUMERIC,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS violations (
          id SERIAL PRIMARY KEY,
          week_start DATE NOT NULL,
          count INTEGER DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    ];

    for (const query of queries) {
      try {
        await pool.query(query);
      } catch (error: any) {
        if (!error.message.includes("already exists")) {
          console.error("Error creating table:", error);
        }
      }
    }

    // Initialize trader state if not exists
    const result = await pool.query("SELECT COUNT(*) as count FROM trader_state");
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      const initialState = {
        balance: 50000,
        equity: 50000,
        peakEquity: 50000,
        dailyStartBalance: 50000,
        dailyPnL: 0,
        dailyLossPct: 0,
        dailyStartTime: new Date(),
        isWeekend: false,
        sessionStartTime: new Date(),
        sessionMinutesActive: 0,
        phaseProfit: 0,
        drawdownPct: 0,
        tradesToday: 0,
        consecutiveLosses: 0,
        consecutiveWins: 0,
        lastTradeTime: null,
        lastTradeResult: null,
        tradeDeclareViolationsThisWeek: 0,
        lockState: "NONE",
        lockReason: null,
        hardLockUntil: null,
        cooldownUntil: null,
        sessionLimitUntil: null,
        recoveryModeUntil: null,
        phase: 1 as Phase,
        phaseTarget: 3000,
        openPositions: [],
        totalFloatingPnL: 0,
      };

      await pool.query("INSERT INTO trader_state (id, state) VALUES (1, $1)", [
        JSON.stringify(initialState),
      ]);
    }
  }

  public static async getState(): Promise<TraderState> {
    const result = await pool.query("SELECT state FROM trader_state WHERE id = 1");

    if (!result.rows[0]) {
      throw new Error("Trader state not found");
    }

    return result.rows[0].state;
  }

  public static async saveState(state: TraderState): Promise<void> {
    await pool.query("UPDATE trader_state SET state = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [
      JSON.stringify(state),
    ]);
  }

  public static async saveTrade(trade: Trade): Promise<void> {
    await pool.query(
      `
        INSERT INTO trades (
          id, pair, entry_level, sl_level, tp1_level, tp2_level,
          confidence, opened_at, closed_at, exit_level, exit_type,
          pnl, pnl_pct, phase, reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          closed_at = $9,
          exit_level = $10,
          exit_type = $11,
          pnl = $12,
          pnl_pct = $13
      `,
      [
        trade.id,
        trade.pair,
        trade.entryLevel,
        trade.slLevel,
        trade.tp1Level,
        trade.tp2Level,
        trade.confidence || null,
        trade.openedAt,
        trade.closedAt || null,
        trade.exitLevel || null,
        trade.exitType || null,
        trade.pnl || null,
        trade.pnlPct || null,
        trade.phase,
        trade.reason || null,
      ]
    );
  }

  public static async getTrade(id: string): Promise<Trade | null> {
    const result = await pool.query("SELECT * FROM trades WHERE id = $1", [id]);

    return result.rows[0]
      ? {
          ...result.rows[0],
          openedAt: new Date(result.rows[0].opened_at),
          closedAt: result.rows[0].closed_at ? new Date(result.rows[0].closed_at) : undefined,
        }
      : null;
  }

  public static async getAllTrades(phase?: Phase): Promise<Trade[]> {
    let query = "SELECT * FROM trades";
    const params: any[] = [];

    if (phase) {
      query += " WHERE phase = $1";
      params.push(phase);
    }

    query += " ORDER BY opened_at DESC";

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      ...row,
      openedAt: new Date(row.opened_at),
      closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
    }));
  }

  public static async logEvent(type: string, data: any): Promise<void> {
    await pool.query("INSERT INTO events (type, data) VALUES ($1, $2)", [
      type,
      JSON.stringify(data),
    ]);
  }

  public static async getEvents(limit: number = 100): Promise<any[]> {
    const result = await pool.query(
      "SELECT * FROM events ORDER BY timestamp DESC LIMIT $1",
      [limit]
    );

    return result.rows.map((row) => ({
      ...row,
      data: row.data,
      timestamp: new Date(row.timestamp),
    }));
  }

  public static async saveDailySnapshot(
    date: Date,
    dailyPnL: number,
    dailyLossPct: number,
    tradesToday: number,
    consecutiveLosses: number,
    balance: number,
    equity: number,
    drawdownPct: number
  ): Promise<void> {
    const dateStr = date.toISOString().split("T")[0];

    await pool.query(
      `
        INSERT INTO daily_snapshots (
          date, daily_pnl, daily_loss_pct, trades_today,
          consecutive_losses, balance, equity, drawdown_pct
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (date) DO UPDATE SET
          daily_pnl = $2,
          daily_loss_pct = $3,
          trades_today = $4,
          consecutive_losses = $5,
          balance = $6,
          equity = $7,
          drawdown_pct = $8
      `,
      [dateStr, dailyPnL, dailyLossPct, tradesToday, consecutiveLosses, balance, equity, drawdownPct]
    );
  }

  public static async getDailySnapshots(days: number = 30): Promise<any[]> {
    const result = await pool.query(
      `
        SELECT * FROM daily_snapshots
        WHERE date >= CURRENT_DATE - INTERVAL '1 day' * $1
        ORDER BY date DESC
      `,
      [days]
    );

    return result.rows;
  }

  public static async close(): Promise<void> {
    await pool.end();
  }
}

// Export pool for direct use if needed
export { pool };
