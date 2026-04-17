// ==================== CORE STATE ====================
export type Phase = 1 | 2 | "FUNDED";
export type LockState = "NONE" | "SOFT_LOCK" | "HARD_LOCK" | "COOLDOWN" | "DANGER_MODE" | "BLOCK" | "SESSION_LIMIT" | "RECOVERY_MODE";
export type RuleType = "RECOVERY_MODE" | "SESSION_LIMIT" | "HARD_LOCK" | "SOFT_LOCK" | "COOLDOWN" | "DANGER_MODE" | "RESTRICT" | "WARNING" | "ALLOW" | "BLOCK";
export type NewsLevel = "RED" | "ORANGE" | null;
export type TradeResult = "win" | "loss" | null;
export type ExitType = "TP" | "SL" | "MANUAL" | "FORCED";

export interface OpenPosition {
  id: string;
  pair: string;
  entryLevel: number;
  currentLevel: number;
  volume: number;
  floatingPnL: number;
  openedAt: Date;
  confidence?: number;
  sl?: number;
  tp1?: number;
  tp2?: number;
}

export interface TraderState {
  // ACCOUNT
  balance: number;
  equity: number;
  peakEquity: number;

  // DAILY METRICS
  dailyStartBalance: number;
  dailyPnL: number;
  dailyLossPct: number;
  dailyStartTime: Date;
  isWeekend: boolean;

  // SESSION TRACKING
  sessionStartTime: Date;
  sessionMinutesActive: number;

  // PHASE METRICS
  phaseProfit: number;
  drawdownPct: number;

  // ACTIVITY
  tradesToday: number;
  consecutiveLosses: number;
  consecutiveWins: number;
  lastTradeTime: Date | null;
  lastTradeResult: TradeResult;

  // VIOLATIONS
  tradeDeclareViolationsThisWeek: number;

  // LOCK STATE
  lockState: LockState;
  lockReason: string | null;
  hardLockUntil: Date | null;
  cooldownUntil: Date | null;
  sessionLimitUntil: Date | null;
  recoveryModeUntil: Date | null;

  // PHASE TRACKING
  phase: Phase;
  phaseTarget: number;
  lastHardLockDate?: Date;

  // NEWS
  newsBlackoutUntil?: Date;
  newsBlackoutLevel?: NewsLevel;

  // FLOATING P&L
  openPositions: OpenPosition[];
  totalFloatingPnL: number;
}

// ==================== RULES ====================
export interface RuleResult {
  type: RuleType;
  reason?: string;
  message?: string;
  blockTradeEntry?: boolean;
  blockUI?: boolean;
  disableAllButtons?: boolean;
  hardLockUntil?: Date;
  cooldownUntil?: Date;
  sessionLimitUntil?: Date;
  maxTradesLeft?: number;
  restrictions?: {
    positionSizeMultiplier?: number;
    minConfidence?: number;
    maxTrades?: number;
    maxTradesRemaining?: number;
    minRiskReward?: number;
    message?: string;
  };
  audioAlert?: boolean;
  phaseFailed?: boolean;
}

export interface FinalDecision {
  allowed: boolean;
  type: RuleType;
  message?: string;
  reason?: string;
  restrictions?: RuleResult["restrictions"];
  blockTradeEntry?: boolean;
  blockUI?: boolean;
  disableAllButtons?: boolean;
  audioAlert?: boolean;
}

// ==================== EVENTS ====================
export type EventType =
  | "trade.opened"
  | "trade.closed"
  | "newday"
  | "phase.complete"
  | "equity.update"
  | "violation.reported"
  | "news.update";

export interface Event {
  type: EventType;
  data: any;
  timestamp: Date;
}

export interface TradeOpenedEvent {
  pair: string;
  entryLevel: number;
  slLevel: number;
  tp1Level: number;
  tp2Level: number;
  confidence: number;
  reason?: string;
  volume?: number;
}

export interface TradeClosedEvent {
  tradeId: string;
  exitLevel: number;
  exitType: ExitType;
  pnl: number;
  pnlPct: number;
}

export interface EquityUpdateEvent {
  equity: number;
  openPositions: OpenPosition[];
  totalFloatingPnL: number;
}

// ==================== API RESPONSES ====================
export interface EngineResponse {
  state: TraderState;
  decision: FinalDecision;
  phaseMilestone?: {
    phase: Phase;
    balance: number;
    peakEquity: number;
  };
}

export interface TradeDeclaration {
  pair: string;
  entryLevel: number;
  slLevel: number;
  tp1Level: number;
  tp2Level: number;
  confidence: number;
  reason?: string;
}

export interface Trade extends TradeDeclaration {
  id: string;
  openedAt: Date;
  closedAt?: Date;
  exitLevel?: number;
  exitType?: ExitType;
  pnl?: number;
  pnlPct?: number;
  phase: Phase;
}

// ==================== HELPERS ====================
export interface NewsBlackout {
  isBlackout: boolean;
  level?: NewsLevel;
  until?: Date;
  affectedPairs?: string[];
  reason?: string;
}
