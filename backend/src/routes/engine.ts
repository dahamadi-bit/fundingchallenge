import { Router } from "express";
import { DisciplineEngine } from "../engine/disciplineEngine";
import { StateManager } from "../engine/stateManager";
import { db } from "../db/database";
import {
  EngineResponse,
  TradeDeclaration,
  TradeClosedEvent,
  EquityUpdateEvent,
} from "../../shared/types";

const router = Router();
const engine = new DisciplineEngine();

// GET current state and decision
router.get("/state", (req, res) => {
  try {
    const state = db.getState();
    const decision = engine.evaluate(state);

    const response: EngineResponse = {
      state,
      decision,
    };

    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST declare trade
router.post("/trades/declare", (req, res) => {
  try {
    const declaration: TradeDeclaration = req.body;
    const state = db.getState();

    // Check if we're in a lock state that prevents trading
    const decision = engine.evaluate(state);

    if (!decision.allowed && decision.blockUI) {
      return res.status(403).json({
        error: "TRADING_BLOCKED",
        message: decision.message,
        decision,
      });
    }

    // Create trade ID
    const tradeId = `${declaration.pair}_${Date.now()}`;

    // Open trade
    const updatedState = StateManager.onTradeOpened(
      state,
      declaration.pair,
      declaration.entryLevel,
      declaration.entryLevel,
      1, // default volume
      declaration.confidence,
      declaration.slLevel,
      declaration.tp1Level,
      declaration.tp2Level
    );

    // Apply decision restrictions
    const newDecision = engine.evaluate(updatedState);
    const finalState = StateManager.applyDecision(updatedState, newDecision);

    db.saveState(finalState);

    // Log trade
    db.saveTrade({
      id: tradeId,
      pair: declaration.pair,
      entryLevel: declaration.entryLevel,
      slLevel: declaration.slLevel,
      tp1Level: declaration.tp1Level,
      tp2Level: declaration.tp2Level,
      confidence: declaration.confidence,
      openedAt: new Date(),
      phase: state.phase,
      reason: declaration.reason,
    });

    db.logEvent("trade.declared", {
      tradeId,
      ...declaration,
    });

    res.json({
      state: finalState,
      decision: newDecision,
      tradeId,
      message: "Trade declared",
      violationCount: state.tradeDeclareViolationsThisWeek,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST close trade
router.post("/trades/:id/close", (req, res) => {
  try {
    const { exitLevel, exitType, pnl, pnlPct } = req.body;
    const tradeId = req.params.id;

    const state = db.getState();
    const position = state.openPositions.find((p) => p.id === tradeId);

    if (!position) {
      return res.status(404).json({ error: "Position not found" });
    }

    // Update trade
    const trade = db.getTrade(tradeId);
    if (trade) {
      db.saveTrade({
        ...trade,
        closedAt: new Date(),
        exitLevel,
        exitType,
        pnl,
        pnlPct,
      });
    }

    // Update state
    const updatedState = StateManager.onTradeClosed(state, tradeId, exitLevel, pnl);

    // Apply cooldown if needed
    const result = pnl > 0 ? "win" : "loss";
    const stateWithCooldown = StateManager.updateCooldown(updatedState, result);

    // Re-evaluate
    const decision = engine.evaluate(stateWithCooldown);
    const finalState = StateManager.applyDecision(stateWithCooldown, decision);

    db.saveState(finalState);

    db.logEvent("trade.closed", {
      tradeId,
      exitLevel,
      exitType,
      pnl,
      pnlPct,
    });

    // Check if daily snapshot needed
    const today = new Date().toISOString().split("T")[0];
    const lastSnapshot = db.getDailySnapshots(1)[0];
    if (!lastSnapshot || lastSnapshot.date !== today) {
      db.saveDailySnapshot(
        new Date(),
        finalState.dailyPnL,
        finalState.dailyLossPct,
        finalState.tradesToday,
        finalState.consecutiveLosses,
        finalState.balance,
        finalState.equity,
        finalState.drawdownPct
      );
    }

    const response: EngineResponse = {
      state: finalState,
      decision,
    };

    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST equity update
router.post("/equity/update", (req, res) => {
  try {
    const { positionId, currentLevel } = req.body;
    const state = db.getState();

    // Update floating P&L
    const updatedState = StateManager.updateFloatingPnL(state, positionId, currentLevel);

    // Re-evaluate to check for floating limit warnings
    const decision = engine.evaluate(updatedState);

    db.saveState(updatedState);

    db.logEvent("equity.update", {
      positionId,
      currentLevel,
      totalFloatingPnL: updatedState.totalFloatingPnL,
    });

    res.json({
      state: updatedState,
      decision,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST report violation
router.post("/violations/report", (req, res) => {
  try {
    const state = db.getState();

    const updatedState = StateManager.recordViolation(state);
    const newDecision = engine.evaluate(updatedState);
    const finalState = StateManager.applyDecision(updatedState, newDecision);

    db.saveState(finalState);

    db.logEvent("violation.reported", {
      totalViolations: finalState.tradeDeclareViolationsThisWeek,
    });

    res.json({
      state: finalState,
      decision: newDecision,
      message: `⚠️ Trade not declared within 60 sec - Violation ${finalState.tradeDeclareViolationsThisWeek}/3`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST trigger new day
router.post("/newday", (req, res) => {
  try {
    const state = db.getState();

    // Skip if weekend
    const now = new Date();
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.json({
        state,
        message: "Weekend - no reset",
      });
    }

    const updatedState = StateManager.resetDailyMetrics(state);
    const resetViolations = StateManager.resetWeeklyViolations(updatedState);
    const newDecision = engine.evaluate(resetViolations);
    const finalState = StateManager.applyDecision(resetViolations, newDecision);

    db.saveState(finalState);

    db.logEvent("newday", {
      balance: finalState.balance,
      equity: finalState.equity,
      recoveryMode: finalState.lockState === "RECOVERY_MODE",
    });

    // Save snapshot of previous day
    db.saveDailySnapshot(
      new Date(Date.now() - 86400000), // yesterday
      state.dailyPnL,
      state.dailyLossPct,
      state.tradesToday,
      state.consecutiveLosses,
      state.balance,
      state.equity,
      state.drawdownPct
    );

    res.json({
      state: finalState,
      decision: newDecision,
      message: finalState.lockState === "RECOVERY_MODE" ? "Recovery Mode Activated" : "New day reset",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET time until midnight CET
router.get("/time-to-midnight", (req, res) => {
  try {
    const timeRemaining = engine.getTimeUntilMidnightCET();
    res.json({ timeRemaining });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
