import React from "react";
import { TraderState } from "../../../shared/types";

interface DashboardStatsProps {
  state: TraderState;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ state }) => {
  const formatCurrency = (value: number) => `$${value.toFixed(0)}`;
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  const getPnLColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getDrawdownColor = (value: number) => {
    if (value < 2) return "text-green-600";
    if (value < 4) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Balance */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-gray-500 text-sm mb-1">Balance</div>
        <div className="text-2xl font-bold">{formatCurrency(state.balance)}</div>
        <div className="text-xs text-gray-400 mt-2">Peak: {formatCurrency(state.peakEquity)}</div>
      </div>

      {/* Daily P&L */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-gray-500 text-sm mb-1">Daily P&L</div>
        <div className={`text-2xl font-bold ${getPnLColor(state.dailyPnL)}`}>
          {formatCurrency(state.dailyPnL)}
        </div>
        <div className={`text-xs mt-2 ${getPnLColor(state.dailyLossPct)}`}>
          {state.dailyLossPct > 0 ? "-" : ""}{formatPercent(state.dailyLossPct)}
        </div>
      </div>

      {/* Drawdown */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-gray-500 text-sm mb-1">Drawdown</div>
        <div className={`text-2xl font-bold ${getDrawdownColor(state.drawdownPct)}`}>
          {formatPercent(state.drawdownPct)}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full ${
              state.drawdownPct < 2
                ? "bg-green-600"
                : state.drawdownPct < 4
                ? "bg-yellow-600"
                : "bg-red-600"
            }`}
            style={{ width: `${Math.min(state.drawdownPct * 2, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Activity */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-gray-500 text-sm mb-1">Session Activity</div>
        <div className="text-2xl font-bold">{state.sessionMinutesActive}m</div>
        <div className="text-xs text-gray-400 mt-2">Trades: {state.tradesToday}</div>
      </div>
    </div>
  );
};
