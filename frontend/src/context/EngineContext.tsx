import React, { createContext, useContext, useEffect, useState } from "react";
import { TraderState, FinalDecision, EngineResponse } from "../../../shared/types";

interface EngineContextType {
  state: TraderState | null;
  decision: FinalDecision | null;
  loading: boolean;
  error: string | null;
  refreshState: () => Promise<void>;
  declareTrade: (data: any) => Promise<void>;
  closeTrade: (tradeId: string, exitLevel: number, exitType: string, pnl: number, pnlPct: number) => Promise<void>;
  updateEquity: (positionId: string, currentLevel: number) => Promise<void>;
  reportViolation: () => Promise<void>;
  triggerNewDay: () => Promise<void>;
}

const EngineContext = createContext<EngineContextType | undefined>(undefined);

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const API_KEY = process.env.REACT_APP_API_KEY || "";

const getHeaders = () => ({
  "Content-Type": "application/json",
  ...(API_KEY ? { "x-api-key": API_KEY } : {}),
});

export const EngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<TraderState | null>(null);
  const [decision, setDecision] = useState<FinalDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshState = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/engine/state`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data: EngineResponse = await response.json();
      setState(data.state);
      setDecision(data.decision);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const declareTrade = async (data: any) => {
    try {
      const response = await fetch(`${API_BASE}/engine/trades/declare`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const result: EngineResponse = await response.json();
      setState(result.state);
      setDecision(result.decision);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const closeTrade = async (tradeId: string, exitLevel: number, exitType: string, pnl: number, pnlPct: number) => {
    try {
      const response = await fetch(`${API_BASE}/engine/trades/${tradeId}/close`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ exitLevel, exitType, pnl, pnlPct }),
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const result: EngineResponse = await response.json();
      setState(result.state);
      setDecision(result.decision);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateEquity = async (positionId: string, currentLevel: number) => {
    try {
      const response = await fetch(`${API_BASE}/engine/equity/update`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ positionId, currentLevel }),
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const result: EngineResponse = await response.json();
      setState(result.state);
      setDecision(result.decision);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const reportViolation = async () => {
    try {
      const response = await fetch(`${API_BASE}/engine/violations/report`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const result = await response.json();
      setState(result.state);
      setDecision(result.decision);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const triggerNewDay = async () => {
    try {
      const response = await fetch(`${API_BASE}/engine/newday`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const result = await response.json();
      setState(result.state);
      setDecision(result.decision);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Initial load
  useEffect(() => {
    refreshState();
  }, []);

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshState, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <EngineContext.Provider
      value={{
        state,
        decision,
        loading,
        error,
        refreshState,
        declareTrade,
        closeTrade,
        updateEquity,
        reportViolation,
        triggerNewDay,
      }}
    >
      {children}
    </EngineContext.Provider>
  );
};

export const useEngine = () => {
  const context = useContext(EngineContext);
  if (!context) {
    throw new Error("useEngine must be used within EngineProvider");
  }
  return context;
};
