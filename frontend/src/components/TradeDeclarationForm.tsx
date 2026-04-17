import React, { useState } from "react";
import { useEngine } from "../context/EngineContext";
import { FinalDecision } from "../../../shared/types";

interface TradeDeclarationFormProps {
  decision: FinalDecision;
}

export const TradeDeclarationForm: React.FC<TradeDeclarationFormProps> = ({
  decision,
}) => {
  const { declareTrade, state } = useEngine();
  const [formData, setFormData] = useState({
    pair: "EURUSD",
    entryLevel: "",
    slLevel: "",
    tp1Level: "",
    tp2Level: "",
    confidence: 2,
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isDisabled =
    !decision.allowed ||
    decision.blockUI ||
    decision.blockTradeEntry ||
    loading;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "confidence" ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await declareTrade({
        pair: formData.pair,
        entryLevel: parseFloat(formData.entryLevel),
        slLevel: parseFloat(formData.slLevel),
        tp1Level: parseFloat(formData.tp1Level),
        tp2Level: parseFloat(formData.tp2Level),
        confidence: formData.confidence,
        reason: formData.reason,
      });

      setMessage("✅ Trade declared successfully!");
      setFormData({
        pair: "EURUSD",
        entryLevel: "",
        slLevel: "",
        tp1Level: "",
        tp2Level: "",
        confidence: 2,
        reason: "",
      });

      setTimeout(() => setMessage(""), 3000);
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">🎯 Declare Trade</h2>

      {isDisabled && (
        <div className="bg-red-100 border border-red-300 rounded p-3 mb-4 text-red-800">
          {decision.blockUI
            ? "Trading is BLOCKED - Cannot declare trades"
            : decision.blockTradeEntry
            ? "Trade entry is blocked"
            : "You cannot trade right now"}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Pair */}
          <div>
            <label className="block text-sm font-medium mb-1">Pair</label>
            <select
              name="pair"
              value={formData.pair}
              onChange={handleChange}
              disabled={isDisabled}
              className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
            >
              <option>EURUSD</option>
              <option>GBPUSD</option>
              <option>USDJPY</option>
              <option>AUDUSD</option>
              <option>NZDUSD</option>
              <option>USDCAD</option>
            </select>
          </div>

          {/* Confidence */}
          <div>
            <label className="block text-sm font-medium mb-1">Confidence</label>
            <select
              name="confidence"
              value={formData.confidence}
              onChange={handleChange}
              disabled={isDisabled}
              className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
            >
              <option value={1}>1/3 (Low)</option>
              <option value={2}>2/3 (Medium)</option>
              <option value={3}>3/3 (High)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Entry */}
          <div>
            <label className="block text-sm font-medium mb-1">Entry Level</label>
            <input
              type="number"
              name="entryLevel"
              value={formData.entryLevel}
              onChange={handleChange}
              disabled={isDisabled}
              step="0.00001"
              placeholder="1.0850"
              className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
              required
            />
          </div>

          {/* SL */}
          <div>
            <label className="block text-sm font-medium mb-1">Stop Loss</label>
            <input
              type="number"
              name="slLevel"
              value={formData.slLevel}
              onChange={handleChange}
              disabled={isDisabled}
              step="0.00001"
              placeholder="1.0800"
              className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* TP1 */}
          <div>
            <label className="block text-sm font-medium mb-1">Target 1 (TP1)</label>
            <input
              type="number"
              name="tp1Level"
              value={formData.tp1Level}
              onChange={handleChange}
              disabled={isDisabled}
              step="0.00001"
              placeholder="1.0900"
              className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
              required
            />
          </div>

          {/* TP2 */}
          <div>
            <label className="block text-sm font-medium mb-1">Target 2 (TP2)</label>
            <input
              type="number"
              name="tp2Level"
              value={formData.tp2Level}
              onChange={handleChange}
              disabled={isDisabled}
              step="0.00001"
              placeholder="1.0950"
              className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
              required
            />
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium mb-1">Trading Reason</label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            disabled={isDisabled}
            placeholder="Why are you taking this trade?"
            className="w-full border rounded px-3 py-2 disabled:bg-gray-100 h-20"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isDisabled}
          className={`w-full py-3 rounded font-bold text-white transition ${
            isDisabled
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? "Declaring..." : "Declare Trade (60 sec countdown)"}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-3 rounded ${message.includes("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message}
        </div>
      )}

      {state && (
        <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
          <div className="font-semibold mb-2">📊 Status:</div>
          <div>Trades today: {state.tradesToday}/4</div>
          <div>Consecutive losses: {state.consecutiveLosses}</div>
          {decision.restrictions?.maxTradesRemaining && (
            <div className="text-orange-600 font-semibold">
              ⚠️ Max {decision.restrictions.maxTradesRemaining} trade(s) remaining
            </div>
          )}
        </div>
      )}
    </div>
  );
};
