import {
  TraderState,
  RuleResult,
  FinalDecision,
  LockState,
  TradeResult,
} from "../../shared/types";
import {
  addDays,
  addHours,
  addMinutes,
  isSameDay,
  isWeekend,
  getHours,
  getMinutes,
  differenceInMinutes,
} from "date-fns";

// ==================== RULE IMPLEMENTATIONS ====================

export class DisciplineEngine {
  // RULE 0: RECOVERY MODE
  private recoveryModeRule(state: TraderState): RuleResult {
    const now = new Date();
    const yesterday = addDays(now, -1);

    if (
      state.lastHardLockDate &&
      isSameDay(state.lastHardLockDate, yesterday)
    ) {
      return {
        type: "RECOVERY_MODE",
        reason: "HARD_LOCK_YESTERDAY",
        message: "🟠 Recovery Mode - Restrictive rules active today",
        restrictions: {
          positionSizeMultiplier: 0.5,
          minConfidence: 3,
          maxTrades: 2,
          minRiskReward: 1.5,
        },
      };
    }
    return { type: "ALLOW" };
  }

  // RULE 1: SESSION LIMIT
  private sessionLimitRule(state: TraderState): RuleResult {
    const now = new Date();
    const activeMinutes = differenceInMinutes(now, state.sessionStartTime);

    if (activeMinutes >= 240) {
      return {
        type: "SESSION_LIMIT",
        reason: "SESSION_DURATION_EXCEEDED",
        message: `🚫 Session limit: 4h active - Forced 1h break`,
        blockTradeEntry: true,
        sessionLimitUntil: addHours(now, 1),
      };
    }

    if (activeMinutes >= 210) {
      return {
        type: "WARNING",
        reason: "SESSION_WARNING",
        message: `⚠️ Session: ${Math.floor(activeMinutes)}/240 min - Take a break soon`,
      };
    }

    return { type: "ALLOW" };
  }

  // RULE 2: DAILY PROFIT LOCK
  private dailyProfitLockRule(state: TraderState): RuleResult {
    const DAILY_TARGET = 0.008 * state.dailyStartBalance;
    const MAX_TRADES = 4;

    if (state.dailyPnL >= DAILY_TARGET) {
      return {
        type: "HARD_LOCK",
        reason: "DAILY_TARGET_HIT",
        message: `✅ Daily target hit (+$${state.dailyPnL.toFixed(0)}) - LOCKED until 00:00 CET`,
        hardLockUntil: this.nextMidnightCET(),
      };
    }

    if (state.dailyPnL >= DAILY_TARGET * 0.85) {
      return {
        type: "SOFT_LOCK",
        reason: "DAILY_TARGET_WARNING",
        maxTradesLeft: 1,
        message: `⚠️ 85% of target (+$${(DAILY_TARGET * 0.85).toFixed(0)}) - Max 1 trade remaining`,
      };
    }

    if (state.tradesToday >= MAX_TRADES) {
      return {
        type: "WARNING",
        reason: "MAX_TRADES_DAILY",
        message: `🟡 ${MAX_TRADES} trades opened today - Be selective with next trade`,
      };
    }

    if (state.dailyPnL >= DAILY_TARGET * 0.5) {
      return {
        type: "WARNING",
        reason: "DAILY_TARGET_HALFWAY",
        message: `🟡 50% of daily target (+$${(DAILY_TARGET * 0.5).toFixed(0)}) - Be cautious`,
      };
    }

    return { type: "ALLOW" };
  }

  // RULE 3: NEWS FILTER
  private newsFilterRule(state: TraderState): RuleResult {
    const now = new Date();

    if (!state.newsBlackoutUntil) return { type: "ALLOW" };
    if (now >= state.newsBlackoutUntil) return { type: "ALLOW" };

    if (state.newsBlackoutLevel === "RED") {
      return {
        type: "HARD_LOCK",
        reason: "RED_NEWS_BLACKOUT",
        hardLockUntil: state.newsBlackoutUntil,
        message: `🚫 RED NEWS - Trading blocked until ${state.newsBlackoutUntil.toLocaleTimeString(
          "en-GB"
        )} CET`,
        audioAlert: true,
      };
    }

    if (state.newsBlackoutLevel === "ORANGE") {
      return {
        type: "RESTRICT",
        reason: "ORANGE_NEWS_ALERT",
        restrictions: {
          positionSizeMultiplier: 0.5,
          message: `⚠️ ORANGE NEWS - Position size halved until ${state.newsBlackoutUntil.toLocaleTimeString(
            "en-GB"
          )} CET`,
        },
      };
    }

    return { type: "ALLOW" };
  }

  // RULE 4: DAILY LOSS LIMIT
  private dailyLossLimitRule(state: TraderState): RuleResult {
    if (state.dailyLossPct >= 3) {
      return {
        type: "HARD_LOCK",
        reason: "DAILY_LOSS_LIMIT",
        hardLockUntil: this.nextMidnightCET(),
        message: `❌ Daily loss 3% - LOCKED until 00:00 CET`,
      };
    }

    if (state.dailyLossPct >= 2.9) {
      return {
        type: "WARNING",
        reason: "DAILY_LOSS_CRITICAL",
        message: `🔴 Daily loss 2.9% - One more loss = LOCK`,
        audioAlert: true,
      };
    }

    if (state.dailyLossPct >= 2.5) {
      return {
        type: "WARNING",
        reason: "DAILY_LOSS_ALERT",
        message: `⚠️ Daily loss 2.5% - Reduce position size`,
      };
    }

    return { type: "ALLOW" };
  }

  // RULE 5: EQUITY LIMIT
  private equityLimitRule(state: TraderState): RuleResult {
    const projectedDailyLoss = state.dailyPnL + state.totalFloatingPnL;
    const projectedDailyLossPct =
      (projectedDailyLoss / state.dailyStartBalance) * 100;

    if (projectedDailyLossPct <= -2.9) {
      return {
        type: "WARNING",
        reason: "EQUITY_FLOATING_CRITICAL",
        message: `🔴 Floating loss pushing toward limit - Current daily: ${projectedDailyLossPct.toFixed(
          1
        )}%`,
        audioAlert: true,
      };
    }

    if (projectedDailyLossPct <= -2.5) {
      return {
        type: "WARNING",
        reason: "EQUITY_FLOATING_ALERT",
        message: `⚠️ Floating position approaching daily limit`,
      };
    }

    return { type: "ALLOW" };
  }

  // RULE 6: DRAWDOWN LIMIT
  private drawdownLimitRule(state: TraderState): RuleResult {
    if (state.drawdownPct >= 6) {
      return {
        type: "HARD_LOCK",
        reason: "MAX_DRAWDOWN_BREACH",
        message: `❌ Max drawdown 6% - Phase FAILED`,
        audioAlert: true,
        phaseFailed: true,
      };
    }

    if (state.drawdownPct >= 5.8) {
      return {
        type: "WARNING",
        reason: "DRAWDOWN_CRITICAL",
        message: `🔴 Drawdown 5.8% - One more loss = FAILURE`,
        audioAlert: true,
      };
    }

    if (state.drawdownPct >= 5) {
      return {
        type: "WARNING",
        reason: "DRAWDOWN_ALERT",
        message: `⚠️ Drawdown 5% - Be very selective`,
      };
    }

    return { type: "ALLOW" };
  }

  // RULE 7: COOLDOWN
  private cooldownRule(state: TraderState): RuleResult {
    const now = new Date();

    if (state.cooldownUntil && now < state.cooldownUntil) {
      const minutesRemaining = Math.ceil(
        differenceInMinutes(state.cooldownUntil, now)
      );
      return {
        type: "COOLDOWN",
        reason: "COOLDOWN_ACTIVE",
        message: `⏳ Cooldown active (${minutesRemaining}min remaining)`,
        blockTradeEntry: true,
      };
    }

    return { type: "ALLOW" };
  }

  // RULE 8: CONSECUTIVE LOSS MODE
  private consecutiveLossRule(state: TraderState): RuleResult {
    if (state.consecutiveLosses >= 2) {
      return {
        type: "DANGER_MODE",
        reason: "CONSECUTIVE_LOSSES",
        message: `⚠️ DANGER MODE - 2 losses in a row (45min cooldown after close)`,
        restrictions: {
          maxTradesRemaining: 1,
          positionSizeMultiplier: 0.5,
          minConfidence: 3,
        },
      };
    }

    if (state.consecutiveLosses === 1) {
      return {
        type: "RESTRICT",
        reason: "ONE_LOSS",
        message: `🟡 One loss - Next trade must be 3/3 confidence (20min cooldown after close)`,
        restrictions: {
          minConfidence: 3,
        },
      };
    }

    return { type: "ALLOW" };
  }

  // RULE 9: TRADE LIMIT
  private tradeLimitRule(state: TraderState): RuleResult {
    const MAX_TRADES = 4;

    if (state.tradesToday >= MAX_TRADES) {
      return {
        type: "HARD_LOCK",
        reason: "MAX_TRADES_REACHED",
        message: `❌ Max ${MAX_TRADES} trades/day reached - Done for today`,
      };
    }

    return { type: "ALLOW" };
  }

  // RULE 10: VIOLATION PENALTY
  private violationPenaltyRule(state: TraderState): RuleResult {
    if (state.tradeDeclareViolationsThisWeek >= 3) {
      return {
        type: "SOFT_LOCK",
        reason: "VIOLATION_THRESHOLD",
        maxTradesLeft: 1,
        message: `⚠️ 3+ violations this week - Soft lock activated (1 trade max, then cooldown)`,
        audioAlert: true,
      };
    }

    if (state.tradeDeclareViolationsThisWeek === 2) {
      return {
        type: "WARNING",
        reason: "VIOLATION_WARNING",
        message: `🟡 2 violations this week - One more = soft lock`,
      };
    }

    return { type: "ALLOW" };
  }

  // ==================== AGGREGATION ====================
  private aggregateRules(rules: RuleResult[]): FinalDecision {
    // Priority order: RECOVERY_MODE > SESSION_LIMIT > HARD_LOCK > COOLDOWN > SOFT_LOCK > DANGER_MODE > RESTRICT > WARNING > ALLOW

    if (rules.some((r) => r.type === "RECOVERY_MODE")) {
      const recovery = rules.find((r) => r.type === "RECOVERY_MODE")!;
      return {
        allowed: true,
        type: "RECOVERY_MODE",
        restrictions: recovery.restrictions,
        message: recovery.message,
      };
    }

    if (rules.some((r) => r.type === "SESSION_LIMIT")) {
      const sessionLimit = rules.find((r) => r.type === "SESSION_LIMIT")!;
      return {
        allowed: false,
        type: "SESSION_LIMIT",
        message: sessionLimit.message,
        blockUI: true,
        audioAlert: true,
      };
    }

    if (rules.some((r) => r.type === "HARD_LOCK")) {
      const hardLock = rules.find((r) => r.type === "HARD_LOCK")!;
      return {
        allowed: false,
        type: "HARD_LOCK",
        reason: hardLock.reason,
        message: hardLock.message,
        blockUI: true,
        audioAlert: true,
        disableAllButtons: true,
      };
    }

    if (rules.some((r) => r.type === "COOLDOWN")) {
      const cooldown = rules.find((r) => r.type === "COOLDOWN")!;
      return {
        allowed: false,
        type: "COOLDOWN",
        message: cooldown.message,
        blockTradeEntry: true,
      };
    }

    if (rules.some((r) => r.type === "SOFT_LOCK")) {
      const softLock = rules.find((r) => r.type === "SOFT_LOCK")!;
      return {
        allowed: true,
        type: "SOFT_LOCK",
        restrictions: {
          maxTradesRemaining: softLock.maxTradesLeft,
        },
        message: softLock.message,
        audioAlert: true,
      };
    }

    if (rules.some((r) => r.type === "DANGER_MODE")) {
      const danger = rules.find((r) => r.type === "DANGER_MODE")!;
      return {
        allowed: true,
        type: "DANGER_MODE",
        restrictions: danger.restrictions,
        message: danger.message,
      };
    }

    if (rules.some((r) => r.type === "RESTRICT")) {
      const restrict = rules.find((r) => r.type === "RESTRICT")!;
      return {
        allowed: true,
        type: "RESTRICT",
        restrictions: restrict.restrictions,
        message: restrict.message,
      };
    }

    if (rules.some((r) => r.type === "WARNING")) {
      const warning = rules.find((r) => r.type === "WARNING")!;
      return {
        allowed: true,
        type: "WARNING",
        message: warning.message,
        audioAlert: warning.audioAlert || false,
      };
    }

    return { allowed: true, type: "ALLOW" };
  }

  // ==================== PUBLIC API ====================
  public evaluate(state: TraderState): FinalDecision {
    const rules = [
      this.recoveryModeRule(state),
      this.sessionLimitRule(state),
      this.dailyProfitLockRule(state),
      this.newsFilterRule(state),
      this.dailyLossLimitRule(state),
      this.equityLimitRule(state),
      this.drawdownLimitRule(state),
      this.cooldownRule(state),
      this.consecutiveLossRule(state),
      this.tradeLimitRule(state),
      this.violationPenaltyRule(state),
    ];

    return this.aggregateRules(rules);
  }

  // ==================== HELPERS ====================
  private nextMidnightCET(): Date {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setUTCHours(23, 0, 0, 0); // 00:00 CET = 23:00 UTC (winter)
    if (nextMidnight <= now) {
      nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
    }
    return nextMidnight;
  }

  public getTimeUntilMidnightCET(): string {
    const now = new Date();
    const midnight = this.nextMidnightCET();
    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  public formatTimeWithTimezone(date: Date, userTz: string = "UTC+3"): string {
    const cetTime = date.toLocaleTimeString("en-GB", {
      timeZone: "Europe/Paris",
    });
    const localTime = date.toLocaleTimeString("en-GB");
    return `${cetTime} CET (${localTime} ${userTz})`;
  }
}
