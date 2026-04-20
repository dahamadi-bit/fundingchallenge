import express, { Express } from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { DatabaseManager } from "./db/database";
import engineRoutes from "./routes/engine";
import matchTraderRoutes from "./routes/matchtrader";
import matchTraderService from "./services/matchtraderService";

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// API Key Middleware (sauf health check)
app.use((req, res, next) => {
  if (req.path === "/health") {
    return next();
  }

  const apiKey = req.headers["x-api-key"];
  if (API_KEY && apiKey !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized - Invalid API key" });
  }

  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/engine", engineRoutes);
app.use("/api/matchtrader", matchTraderRoutes);

// Error handling
app.use((err: any, req: Express.Request, res: Express.Response) => {
  console.error("Error:", err);
  res.status(500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message
  });
});

// Start server
async function start() {
  try {
    // Initialize database
    console.log("🔄 Initializing database...");
    await DatabaseManager.initialize();
    console.log("✅ Database initialized");

    // Initialize MatchTrader
    console.log("🔄 Connecting to MatchTrader...");
    try {
      await matchTraderService.login();
      console.log("✅ MatchTrader connected");
    } catch (error) {
      console.warn("⚠️ MatchTrader connection failed (will retry on next request)");
    }

    app.listen(PORT, () => {
      console.log(`🚀 TradingCockpit backend running on http://localhost:${PORT}`);
      console.log(`📊 API: http://localhost:${PORT}/api/engine/state`);
      console.log(`💹 MatchTrader: http://localhost:${PORT}/api/matchtrader/account`);
      console.log(`🔐 API Key required for all endpoints except /health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await DatabaseManager.close();
  process.exit(0);
});
