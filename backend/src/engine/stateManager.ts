import { TraderState, TradeResult, OpenPosition, Phase } from "../../shared/types";
import {
  addDays,
  addMinutes,
  isSameDay,
  isWeekend as dateIsWeekend,
  differenceInMinutes,
  getDay,
} from "date-fns";

export class StateManager {
  // Initialize fresh state
  public static createInitialState(
    balance: number = 50000,
    phase: Phase = 1
  ): TraderState {
    const now = new Date();
    return {
      // Account
      balance,
      equity: balance,
      peakEquity: balance,

      // Daily metrics
      dailyStartBalance: balance,
      dailyPnL: 0,
      dailyLossPct: 0,
      dailyStartTime: now,
      isWeekend: dateIsWeekend(now),

      // Session
      sessionStartTime: now,
      sessionMinutesActive: 0,

      // Phase
      phaseProfit: 0,
      drawdownPct: 0,

      // Activity
      tradesToday: 0,
      consecutiveLosses: 0,
      consecutiveWins: 0,
      lastTradeTime: null,
      lastTradeResult: null,

      // Violations
      tradeDeclareViolationsThisWeek: 0,

      // Lock state
      lockState: "NONE",
      lockReason: null,
      hardLockUntil: null,
      cooldownUntil: null,
      sessionLimitUntil: null,
      recoveryModeUntil: null,

      // Phase tracking
      phase,
      phaseTarget: 3000, // $3k for Two-Step Pro
      lastHardLockDate: undefined,

      // News
      newsBlackoutUntil: undefined,
      newsBlackoutLevel: null,

      // Floating P&L
      openPositions: [],
      totalFloatingPnL: 0,
    };
  }

  // Reset daily metrics (called at 00:00 CET)
  public static resetDailyMetrics(state: TraderState): TraderState {
    const now = new Date();
    const wasHardLockedYesterday =
      state.lastHardLockDate &&
      isSameDay(state.lastHardLockDate, addDays(now, -1));

    return {
      ...state,
      dailyStartBalance: state.equity,
      dailyPnL: 0,
      dailyLossPct: 0,
      dailyStartTime: now,
      isWeekend: dateIsWeekend(now),
      tradesToday: 0,
      consecutiveLosses: 0,
      consecutiveWins: 0,
      cooldownUntil: null,
      hardLockUntil: null,
      sessionStartTime: now,
      sessionMinutesActive: 0,
      lockState: wasHardLockedYesterday ? "RECOVERY_MODE" : "NONE",
      lockReason: wasHardLockedYesterday ? "HARD_LOCK_YESTERDAY" : null,
      lastHardLockDate: wasHardLockedYesterday ? addDays(now, -1) : undefined,
    };
  }

  // Update cooldown after trade closes
  public static updateCooldown(
    state: TraderState,
    result: TradeResult
  ): TraderState {
    const now = new Date();

    if (result === "loss") {
      if (state.consecutiveLosses === 1) {
        return {
          ...state,
          cooldownUntil: addMinutes(now, 20),
        };
      }
      if (state.consecutiveLosses === 2) {
        return {
          ...state,
          cooldownUntil: addMinutes(now, 45),
        };
      }
    }

    if (result === "win") {
      const DAILY_TARGET = 0.008 * state.dailyStartBalance;
      if (state.dailyPnL >= 0.005 * state.dailyStartBalance) {
        // 50% of target
        return {
          ...state,
          cooldownUntil: addMinutes(now, 15),
        };
      }
    }

    return state;
  }

  // Handle trade opened event
  public static onTradeOpened(
    state: TraderState,
    pair: string,
    entryLevel: number,
    currentLevel: number,
    volume: number,
    confidence?: number,
    sl?: number,
    tp1?: number,
    tp2?: number
  ): TraderState {
    const newPosition: OpenPosition = {
      id: `${pair}_${Date.now()}`,
      pair,
      entryLevel,
      currentLevel,
      volume,
      floatingPnL: 0,
      openedAt: new Date(),
      confidence,
      sl,
      tp1,
      tp2,
    };

    return {
      ...state,
      tradesToday: state.tradesToday + 1,
      lastTradeTime: new Date(),
      openPositions: [...state.openPositions, newPosition],
    };
  }

  // Update floating P&L in real-time
  public static updateFloatingPnL(
    state: TraderState,
    positionId: string,
    currentLevel: number
  ): TraderState {
    const updatedPositions = state.openPositions.map((pos) => {
      if (pos.id === positionId) {
        const floatingPnL = (currentLevel - pos.entryLevel) * pos.volume;
        return { ...pos, currentLevel, floatingPnL };
      }
      return pos;
    });

    const totalFloatingPnL = updatedPositions.reduce(
      (sum, pos) => sum + pos.floatingPnL,
      0
    );

    return {
      ...state,
      openPositions: updatedPositions,
      totalFloatingPnL,
    };
  }

  // Handle trade closed event
  public static onTradeClosed(
    state: TraderState,
    tradeId: string,
    exitLevel: number,
    pnl: number
  ): TraderState {
    const closedPosition = state.openPositions.find((p) => p.id === tradeId);
    if (!closedPosition) return state;

    const newDailyPnL = state.dailyPnL + pnl;
    const newBalance = state.balance + pnl;
    const newEquity = newBalance + state.totalFloatingPnL - closedPosition.floatingPnL;
    const newPeakEquity = Math.max(state.peakEquity, newEquity);
    const newDrawdownPct =
      newPeakEquity > 0 ? ((newPeakEquity - newEquity) / newPeakEquity) * 100 : 0;

    const dailyLossPct = newDailyPnL < 0 ? (newDailyPnL / state.dailyStartBalance) * 100 : 0;

    const result: TradeResult = pnl > 0 ? "win" : pnl < 0 ? "loss" : null;

    const updatedPositions = state.openPositions.filter((p) => p.id !== tradeId);
    const newTotalFloatingPnL = updatedPositions.reduce(
      (sum, pos) => sum + pos.floatingPnL,
      0
    );

    return {
      ...state,
      balance: newBalance,
      equity: newEquity,
      peakEquity: newPeakEquity,
      drawdownPct: newDrawdownPct,
      dailyPnL: newDailyPnL,
      dailyLossPct: Math.abs(dailyLossPct),
      lastTradeResult: result,
      lastTradeTime: new Date(),
      consecutiveWins:
        result === "win" ? state.consecutiveWins + 1 : 0,
      consecutiveLosses:
        result === "loss" ? state.consecutiveLosses + 1 : 0,
      openPositions: updatedPositions,
      totalFloatingPnL: newTotalFloatingPnL,
      openPositions: updatedPositions,
    };
  }

  // Record trade declaration violation
  public static recordViolation(state: TraderState): TraderState {
    return {
      ...state,
      tradeDeclareViolationsThisWeek: state.tradeDeclareViolationsThisWeek + 1,
    };
  }

  // Reset violations weekly (Monday)
  public static resetWeeklyViolations(state: TraderState): TraderState {
    const today = new Date();
    const dayOfWeek = getDay(today); // 0 = Sunday, 1 = Monday

    if (dayOfWeek === 1) {
      return {
        ...state,
        tradeDeclareViolationsThisWeek: 0,
      };
    }

    return state;
  }

  // Set news blackout
  public static setNewsBlackout(
    state: TraderState,
    level: "RED" | "ORANGE",
    durationMinutes: number,
    pairs?: string[]
  ): TraderState {
    const now = new Date();
    return {
      ...state,
      newsBlackoutLevel: level,
      newsBlackoutUntil: addMinutes(now, durationMinutes),
    };
  }

  // Track session activity
  public static incrementSessionMinutes(state: TraderState): TraderState {
    return {
      ...state,
      sessionMinutesActive: state.sessionMinutesActive + 1,
    };
  }

  // Handle phase completion
  public static completePhase(state: TraderState, newPhase: Phase): TraderState {
    const now = new Date();

    // Note: drawdown reset logic would go here based on FundingPips rules
    // For now, we keep drawdown tracking but reset phase-specific metrics

    return {
      ...state,
      phase: newPhase,
      balance: 50000, // Reset to starting balance
      equity: 50000,
      phaseProfit: 0,
      dailyPnL: 0,
      dailyLossPct: 0,
      tradesToday: 0,
      consecutiveLosses: 0,
      consecutiveWins: 0,
      dailyStartBalance: 50000,
      dailyStartTime: now,
      sessionStartTime: now,
      sessionMinutesActive: 0,
      cooldownUntil: null,
      hardLockUntil: null,
      tradeDeclareViolationsThisWeek: 0,
      // peakEquity: keep global peak or reset based on rules
    };
  }

  // Update lock state based on decision
  public static applyDecision(
    state: TraderState,
    decision: any
  ): TraderState {
    return {
      ...state,
      lockState: decision.type as any,
      lockReason: decision.reason || null,
      hardLockUntil: decision.hardLockUntil || null,
      cooldownUntil: decision.cooldownUntil || null,
      sessionLimitUntil: decision.sessionLimitUntil || null,
    };
  }
}
