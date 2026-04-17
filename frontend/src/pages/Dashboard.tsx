import React, { useEffect } from "react";
import { useEngine } from "../context/EngineContext";
import { DashboardStats } from "../components/DashboardStats";
import { DecisionDisplay } from "../components/DecisionDisplay";
import { TradeDeclarationForm } from "../components/TradeDeclarationForm";
import { TradeHistory } from "../components/TradeHistory";

export const Dashboard: React.FC = () => {
  const { state, decision, loading, error, refreshState } = useEngine();

  useEffect(() => {
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(refreshState, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl font-semibold">Loading TradingCockpit...</div>
        </div>
      </div>
    );
  }

  if (error || !state || !decision) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center text-red-600">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-xl font-semibold">Error loading dashboard</div>
          <div className="text-sm mt-2">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🎯 TradingCockpit v3.1</h1>
          <p className="text-gray-600">Discipline Engine • FundingPips Two-Step Pro</p>
          <div className="text-xs text-gray-400 mt-2">
            Phase {state.phase} • Balance: ${state.balance.toFixed(0)} • Peak: ${state.peakEquity.toFixed(0)}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column (Main Content) */}
          <div className="lg:col-span-2">
            {/* Stats */}
            <DashboardStats state={state} />

            {/* Decision Display */}
            <DecisionDisplay decision={decision} />

            {/* Trade Declaration Form */}
            <TradeDeclarationForm decision={decision} />

            {/* Open Positions */}
            {state.openPositions.length > 0 && (
              <TradeHistory openPositions={state.openPositions} />
            )}
          </div>

          {/* Right Column (Sidebar) */}
          <div className="space-y-6">
            {/* Trading Limits */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-lg mb-3">📋 Trading Limits</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Trades Today:</span>
                  <span className="font-semibold">{state.tradesToday}/4</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 bg-blue-600 rounded-full"
                    style={{ width: `${(state.tradesToday / 4) * 100}%` }}
                  ></div>
                </div>

                <div className="flex justify-between">
                  <span>Session Time:</span>
                  <span className="font-semibold">{state.sessionMinutesActive}m / 240m</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 bg-purple-600 rounded-full"
                    style={{ width: `${(state.sessionMinutesActive / 240) * 100}%` }}
                  ></div>
                </div>

                <div className="flex justify-between">
                  <span>Daily P&L Target:</span>
                  <span className="font-semibold">
                    ${state.dailyPnL.toFixed(0)} / $
                    {(0.008 * state.dailyStartBalance).toFixed(0)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 bg-green-600 rounded-full"
                    style={{
                      width: `${Math.min(
                        (state.dailyPnL / (0.008 * state.dailyStartBalance)) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-lg mb-3">📊 Status</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Lock State:</span>
                  <div className="font-semibold text-base mt-1">{state.lockState}</div>
                </div>

                {state.consecutiveLosses > 0 && (
                  <div className="mt-3 p-2 bg-red-50 rounded">
                    <span className="text-red-700">
                      ⚠️ {state.consecutiveLosses} consecutive loss
                      {state.consecutiveLosses > 1 ? "es" : ""}
                    </span>
                  </div>
                )}

                {state.consecutiveWins > 0 && (
                  <div className="mt-3 p-2 bg-green-50 rounded">
                    <span className="text-green-700">
                      ✅ {state.consecutiveWins} consecutive win
                      {state.consecutiveWins > 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                {state.tradeDeclareViolationsThisWeek > 0 && (
                  <div className="mt-3 p-2 bg-orange-50 rounded">
                    <span className="text-orange-700">
                      🚨 {state.tradeDeclareViolationsThisWeek}/3 Violations
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Phase Info */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold text-lg mb-3">📈 Phase Progress</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Current Phase:</span>
                  <div className="font-semibold text-xl mt-1">{state.phase}</div>
                </div>
                <div className="mt-3">
                  <span className="text-gray-600">Target:</span>
                  <div className="font-semibold">${state.phaseTarget.toFixed(0)}</div>
                </div>
                <div className="mt-3">
                  <span className="text-gray-600">Phase Profit:</span>
                  <div
                    className={`font-semibold text-lg ${
                      state.phaseProfit > 0 ? "text-green-600" : "text-gray-600"
                    }`}
                  >
                    ${state.phaseProfit.toFixed(0)}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="h-2 bg-blue-600 rounded-full"
                    style={{
                      width: `${Math.min(
                        (Math.max(0, state.balance - 50000) / state.phaseTarget) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
