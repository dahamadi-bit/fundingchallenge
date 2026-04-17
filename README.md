# 🎯 TradingCockpit v3.1 - Discipline Engine + Signal Detection

**The app decides if you trade. Not your emotions. Not your 'just one more trade'.**

## Overview

TradingCockpit is a full-stack trading discipline application for the FundingPips Two-Step Pro challenge. It implements a **10-rule Discipline Engine** that enforces strict trading rules and prevents emotional decision-making.

### Core Philosophy

When you want to trade, the Discipline Engine answers: **"Can you trade RIGHT NOW?"**

Possible answers:
- ✅ **ALLOWED** - Full trading allowed
- 🟡 **WARNING** - Alert but allowed
- 🟠 **RESTRICT** - Filtered setups only
- ⚡ **DANGER_MODE** - Reduced size, high confidence only
- 🟠 **RECOVERY_MODE** - Day after hard lock, ultra-restrictive
- ⏳ **COOLDOWN** - Mandatory break after loss/win
- ⚠️ **SOFT_LOCK** - Max 1 trade, then cooldown
- 🚫 **HARD_LOCK** - Zero trading. Period.

## 🏗️ Architecture

### Backend (Node.js + Express + SQLite)
- **Discipline Engine** - 10 rules evaluation
- **State Manager** - TraderState lifecycle
- **Database** - SQLite persistence
- **REST API** - Full event handling

### Frontend (React + TypeScript + Tailwind)
- **Dashboard** - Real-time metrics
- **Decision Display** - Rule status with restrictions
- **Trade Declaration** - 60-second form entry
- **Position Monitor** - Floating P&L tracking
- **Phase Progress** - Visual milestone tracking

## 📊 The 10 Rules

### RULE 0: RECOVERY MODE
After a hard lock day, the next day is recovery mode:
- 50% position size
- 3/3 confidence minimum
- Max 2 trades
- 1.5 min risk:reward

### RULE 1: SESSION LIMIT
- 4 hours active = 1 hour forced break
- Warning at 3.5 hours

### RULE 2: DAILY PROFIT LOCK
- Daily target: 0.8% of balance ($400 on $50k)
- Hit target = HARD LOCK until 00:00 CET
- 85% of target = SOFT LOCK (1 trade max)
- Max 4 trades/day

### RULE 3: NEWS FILTER
- **RED news** = HARD LOCK (blocks all trading)
- **ORANGE news** = RESTRICT (50% position size)
- ForexFactory integration

### RULE 4: DAILY LOSS LIMIT
- 3% daily loss = HARD LOCK
- 2.9% = Critical warning
- 2.5% = Reduce size

### RULE 5: EQUITY LIMIT
- Real-time floating P&L checks
- Warning when approaching 3% daily loss

### RULE 6: DRAWDOWN LIMIT
- 6% drawdown = Phase FAILED
- 5.8% = Critical (one more loss = fail)
- 5% = Be very selective

### RULE 7: COOLDOWN (Revised)
- 1st consecutive loss: 20 min cooldown
- 2nd consecutive loss: 45 min cooldown (blocks entry)
- Big win (50% of target): 15 min cooldown

### RULE 8: CONSECUTIVE LOSS MODE
- 1 loss: 3/3 confidence minimum
- 2 losses: DANGER_MODE (50% size, 1 trade max)

### RULE 9: TRADE LIMIT
- Max 4 trades per day

### RULE 10: VIOLATION PENALTY
- Trade not declared in 60 sec = violation
- 3+ violations/week = SOFT LOCK

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
cd tradingcockpit

# Install dependencies
npm install

# Install backend deps
cd backend && npm install && cd ..

# Install frontend deps
cd frontend && npm install && cd ..
```

### Development Mode

```bash
# Run both backend and frontend
npm run dev

# Or run separately:
# Terminal 1 - Backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 - Frontend (http://localhost:3000)
cd frontend && npm start
```

### Build for Production

```bash
npm run build
```

## 📥 Trade Declaration Flow

### 60-Second Countdown

1. **User opens position in MatchTrader**
2. **App sends setup alert** (optional webhook)
3. **User has 60 seconds** to declare in app:
   - Pair
   - Entry level
   - SL level
   - TP1 / TP2 levels
   - Confidence re-confirmation
4. **If NOT declared within 60 sec:**
   - ⚠️ VIOLATION alert
   - Track violations (3 this week = soft lock)

### Trade Lifecycle

1. Trade declared → onTradeOpened() → discipline re-evaluated
2. Every 30-60 sec → onEquityUpdate() → floating P&L updated
3. Position closed → onTradeClosed() → cooldown applied, state updated
4. At 00:00 CET → onNewDay() → daily reset (skip weekends)

## ⏰ Timezone Handling

**Critical for accuracy:**
- FundingPips Server: **CET** (UTC+1 winter, UTC+2 summer)
- User Location: **Mayotte** (UTC+3 fixed)
- Daily Reset: **00:00 CET** = **02:00 Mayotte** (winter) or **01:00 Mayotte** (summer)

All countdowns display both:
```
"2h 47m until 00:00 CET (02:47 Mayotte)"
```

## 🗄️ Database Schema

### `trader_state`
- Snapshot of current TraderState (JSON)
- Updated on every decision

### `trades`
- All trades: opened, closed, violations
- Phase tracking
- Historical data

### `events`
- All discipline events
- Timestamps
- Audit trail

### `daily_snapshots`
- Daily performance metrics
- P&L, drawdown, trades/day
- Historical trending

### `violations`
- Weekly violation count
- Reset Monday at 00:00 CET

## 📡 API Endpoints

### State Management
```
GET  /api/engine/state              → Current state + decision
POST /api/engine/trades/declare     → Declare new trade
POST /api/engine/trades/:id/close   → Close position
POST /api/engine/equity/update      → Real-time floating updates
POST /api/engine/violations/report  → Record 60-sec violation
POST /api/engine/newday             → Daily reset (called auto)
GET  /api/engine/time-to-midnight   → Minutes until 00:00 CET
```

## 🧪 Testing Checklist

### Phase 1: Core Logic
- [ ] Discipline Engine evaluation (all 10 rules)
- [ ] State persistence (SQLite)
- [ ] Trade declaration/closure flow
- [ ] Daily reset at 00:00 CET
- [ ] Weekend reset skip
- [ ] Cooldown logic (20/45 min)
- [ ] Consecutive loss tracking
- [ ] Violation penalty system

### Phase 2: Rules Validation
- [ ] FundingPips Two-Step Pro rules match spec
- [ ] Drawdown reset Phase 1 → 2 confirmed
- [ ] MatchTrader equity access method verified
- [ ] Timezone offsets correct (CET vs Mayotte)
- [ ] News data source (ForexFactory)

### Phase 3: Real-World Use
- [ ] Floating P&L real-time accuracy
- [ ] Recovery mode restrictions work
- [ ] Hard lock UI blocks all entry
- [ ] Audio alerts (when implemented)
- [ ] Session limit timer
- [ ] News blackout integration

## ⚠️ CRITICAL VALIDATION (Before Phase Test)

- [ ] FundingPips Two-Step Pro rules verified
  - Drawdown reset Phase 1→2? **PENDING**
  - If unknown, link to official doc
- [ ] MatchTrader equity access
  - API available? **PENDING**
  - Scraping possible? **PENDING**
  - If neither: 60-sec declaration mandatory ✅
- [ ] Timezone offsets confirmed
  - CET (winter/summer) ✅
  - Mayotte UTC+3 ✅
  - Display format ✅
- [ ] News data source
  - ForexFactory API free? **PENDING**
  - RED vs ORANGE distinction? **PENDING**

## 📝 Notes

### Known Items for Phase Test
1. **News Integration** - ForexFactory API needs verification
2. **MatchTrader API** - Confirm equity access method
3. **FundingPips Rules** - Verify drawdown reset on phase completion
4. **Audio Alerts** - Implement browser audio notifications
5. **Mobile Responsive** - Full mobile UI optimization

### Future Enhancements
- TradingView webhook integration (signal detection)
- Automated MatchTrader position tracking
- Journal export (CSV/PDF)
- Performance analytics dashboard
- Mobile app version
- WhatsApp notifications

## 🔒 Core Truth

This app removes your decision-making at critical moments.

- When you're euphoric after +$300, it says "stop, 1 trade max"
- When you've lost 2 in a row, it says "cooldown 45 min, walk away"
- When it's 4+ hours active, it says "session limit, 1 hour break mandatory"

**You don't have agency in the lock states. That's the point.**

The discipline engine is your guardrail. It prevents self-sabotage. No padding trades. No "just one more". No revenge trading.

**The app decides. You follow. That's how you survive the challenge.**

---

**Version:** 3.1.0 | **Status:** MVP Complete, Ready for Phase Test | **Author:** Diego Ahamadi
