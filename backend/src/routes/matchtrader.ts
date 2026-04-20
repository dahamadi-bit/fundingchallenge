import express, { Router, Request, Response } from 'express';
import matchTraderService from '../services/matchtraderService';

const router: Router = express.Router();

/**
 * Initialize MatchTrader session
 */
router.post('/init', async (req: Request, res: Response) => {
  try {
    const session = await matchTraderService.login();
    res.json({
      success: true,
      session,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get current session status
 */
router.get('/session', async (req: Request, res: Response) => {
  try {
    const session = matchTraderService.getSession();
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'No active session',
      });
    }
    res.json({
      success: true,
      session,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get account info (balance, equity, etc)
 */
router.get('/account', async (req: Request, res: Response) => {
  try {
    const session = matchTraderService.getSession();
    if (!session) {
      // Auto-login if needed
      await matchTraderService.login();
    }

    const accountInfo = await matchTraderService.getAccountInfo();
    res.json({
      success: true,
      accountInfo,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get all open positions
 */
router.get('/positions', async (req: Request, res: Response) => {
  try {
    const session = matchTraderService.getSession();
    if (!session) {
      await matchTraderService.login();
    }

    const positions = await matchTraderService.getPositions();
    res.json({
      success: true,
      positions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get specific position
 */
router.get('/positions/:id', async (req: Request, res: Response) => {
  try {
    const session = matchTraderService.getSession();
    if (!session) {
      await matchTraderService.login();
    }

    const position = await matchTraderService.getPosition(req.params.id);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found',
      });
    }

    res.json({
      success: true,
      position,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Close a position
 */
router.post('/positions/:id/close', async (req: Request, res: Response) => {
  try {
    const session = matchTraderService.getSession();
    if (!session) {
      await matchTraderService.login();
    }

    const { volume } = req.body;
    const result = await matchTraderService.closePosition(req.params.id, volume);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Update position (SL, TP, etc)
 */
router.patch('/positions/:id', async (req: Request, res: Response) => {
  try {
    const session = matchTraderService.getSession();
    if (!session) {
      await matchTraderService.login();
    }

    const result = await matchTraderService.updatePosition(req.params.id, req.body);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
