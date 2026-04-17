import React from "react";
import { OpenPosition } from "../../../shared/types";

interface TradeHistoryProps {
  openPositions: OpenPosition[];
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({ openPositions }) => {
  if (openPositions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">📊 Open Positions</h3>
        <div className="text-center text-gray-500 py-8">
          No open positions
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">📊 Open Positions ({openPositions.length})</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Pair</th>
              <th className="text-right py-2">Entry</th>
              <th className="text-right py-2">Current</th>
              <th className="text-right py-2">Floating P&L</th>
              <th className="text-right py-2">SL</th>
              <th className="text-right py-2">TP1 / TP2</th>
              <th className="text-right py-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {openPositions.map((pos) => {
              const pnlColor =
                pos.floatingPnL > 0
                  ? "text-green-600"
                  : pos.floatingPnL < 0
                  ? "text-red-600"
                  : "text-gray-600";

              return (
                <tr key={pos.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 font-bold">{pos.pair}</td>
                  <td className="text-right">{pos.entryLevel.toFixed(5)}</td>
                  <td className="text-right">{pos.currentLevel.toFixed(5)}</td>
                  <td className={`text-right font-semibold ${pnlColor}`}>
                    ${pos.floatingPnL.toFixed(0)}
                  </td>
                  <td className="text-right text-red-600">
                    {pos.sl ? pos.sl.toFixed(5) : "-"}
                  </td>
                  <td className="text-right text-green-600">
                    {pos.tp1 ? `${pos.tp1.toFixed(5)} / ${pos.tp2?.toFixed(5) || "-"}` : "-"}
                  </td>
                  <td className="text-right">
                    {pos.confidence ? `${pos.confidence}/3` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>Total Floating P&L:</strong>{" "}
        <span className={openPositions.reduce((sum, p) => sum + p.floatingPnL, 0) > 0 ? "text-green-600" : "text-red-600"}>
          ${openPositions.reduce((sum, p) => sum + p.floatingPnL, 0).toFixed(0)}
        </span>
      </div>
    </div>
  );
};
