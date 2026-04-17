import React from "react";
import { FinalDecision } from "../../../shared/types";

interface DecisionDisplayProps {
  decision: FinalDecision;
}

export const DecisionDisplay: React.FC<DecisionDisplayProps> = ({ decision }) => {
  const getStatusColor = (type: string) => {
    switch (type) {
      case "HARD_LOCK":
        return "bg-red-100 border-red-300 text-red-800";
      case "SOFT_LOCK":
        return "bg-orange-100 border-orange-300 text-orange-800";
      case "COOLDOWN":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "DANGER_MODE":
        return "bg-orange-100 border-orange-300 text-orange-800";
      case "RECOVERY_MODE":
        return "bg-blue-100 border-blue-300 text-blue-800";
      case "RESTRICT":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "WARNING":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "ALLOW":
        return "bg-green-100 border-green-300 text-green-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  const getIconEmoji = (type: string) => {
    switch (type) {
      case "HARD_LOCK":
        return "🚫";
      case "SOFT_LOCK":
        return "⚠️";
      case "COOLDOWN":
        return "⏳";
      case "DANGER_MODE":
        return "⚡";
      case "RECOVERY_MODE":
        return "🟠";
      case "RESTRICT":
        return "🟡";
      case "WARNING":
        return "⚠️";
      case "ALLOW":
        return "✅";
      default:
        return "❓";
    }
  };

  return (
    <div className={`border-l-4 p-4 rounded-lg mb-6 ${getStatusColor(decision.type)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getIconEmoji(decision.type)}</span>
          <div>
            <div className="font-bold text-lg">{decision.type}</div>
            <div className="text-sm opacity-75">{decision.message}</div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${decision.allowed ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {decision.allowed ? "ALLOWED" : "BLOCKED"}
        </div>
      </div>

      {decision.restrictions && (
        <div className="mt-4 bg-black bg-opacity-10 rounded p-3 text-sm">
          <div className="font-semibold mb-2">Restrictions:</div>
          {decision.restrictions.positionSizeMultiplier && (
            <div>📉 Position size: {(decision.restrictions.positionSizeMultiplier * 100).toFixed(0)}%</div>
          )}
          {decision.restrictions.minConfidence && (
            <div>🎯 Min confidence: {decision.restrictions.minConfidence}/3</div>
          )}
          {decision.restrictions.maxTrades && (
            <div>🔢 Max trades: {decision.restrictions.maxTrades}</div>
          )}
          {decision.restrictions.maxTradesRemaining && (
            <div>📊 Trades remaining: {decision.restrictions.maxTradesRemaining}</div>
          )}
          {decision.restrictions.minRiskReward && (
            <div>⚖️ Min R:R: {decision.restrictions.minRiskReward}</div>
          )}
        </div>
      )}
    </div>
  );
};
