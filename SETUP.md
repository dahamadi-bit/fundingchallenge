# 📋 Setup Guide - TradingCockpit v3.1

## Installation Steps

### 1. Prerequisites Check

Make sure you have:
- **Node.js 16+** → Check: `node --version`
- **npm 7+** → Check: `npm --version`

### 2. Install Dependencies

#### Option A: Automated (Linux/Mac)
```bash
bash START.sh
```

#### Option B: Manual

**Root level:**
```bash
npm install
```

**Backend:**
```bash
cd backend
npm install
cd ..
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 3. Start Development

#### Option A: Both Services Together
```bash
npm run dev
```

#### Option B: Separate Terminals

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### 4. Access the App

- **Frontend**: http://localhost:3000
- **API Health**: http://localhost:5000/health
- **Current State**: http://localhost:5000/api/engine/state

## Database

SQLite database is auto-created on first run:
- Location: `backend/tradingcockpit.db`
- Tables auto-initialized on startup
- Initial state created automatically

## Troubleshooting

### "Port 5000 already in use"
```bash
# Kill existing process
lsof -ti:5000 | xargs kill -9

# Or use different port
PORT=5001 npm run backend:dev
```

### "Port 3000 already in use"
```bash
cd frontend
PORT=3001 npm start
```

### "Module not found" errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Do the same for backend and frontend
cd backend && rm -rf node_modules package-lock.json && npm install && cd ..
cd frontend && rm -rf node_modules package-lock.json && npm install && cd ..
```

### "SQLite compilation failed"
On Windows, you might need Visual C++ build tools:
```bash
npm install --build-from-source
```

Or use pre-built binaries:
```bash
npm install --save-optional
```

## Project Structure

```
tradingcockpit/
├── backend/
│   ├── src/
│   │   ├── engine/          # Discipline Engine logic
│   │   ├── routes/          # Express routes/API
│   │   ├── db/              # Database manager
│   │   └── index.ts         # Server entry point
│   ├── tsconfig.json
│   ├── package.json
│   └── dist/                # Compiled output
│
├── frontend/
│   ├── src/
│   │   ├── context/         # React context
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── public/
│   │   └── index.html
│   ├── tsconfig.json
│   ├── package.json
│   └── tailwind.config.js
│
├── shared/
│   └── types.ts             # Shared TypeScript types
│
├── README.md
├── SETUP.md
├── package.json
└── START.sh
```

## Environment Variables

Create `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
NODE_ENV=development
REACT_APP_API_URL=http://localhost:5000/api
USER_TIMEZONE=UTC+3
```

## Testing the Connection

### Test Backend
```bash
curl http://localhost:5000/health
# Response: {"status":"ok","timestamp":"2024-04-17T..."}
```

### Test Engine State
```bash
curl http://localhost:5000/api/engine/state
# Response: {state: {...}, decision: {...}}
```

## Build for Production

```bash
npm run build

# Output:
# - backend/dist/    (compiled JavaScript)
# - frontend/build/  (optimized React bundle)
```

Then deploy:
- Backend: `node backend/dist/index.js`
- Frontend: Serve `frontend/build/` with any static server

## Next Steps

1. **Open Dashboard**: http://localhost:3000
2. **Try declaring a trade**: Fill form and submit
3. **Monitor state changes**: Watch real-time updates
4. **Test rules**: Verify all 10 rules are working
5. **Check database**: `sqlite3 backend/tradingcockpit.db`

## Support

If you encounter issues:

1. Check Node.js version: `node --version` (need 16+)
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check port conflicts: `lsof -i :5000` and `lsof -i :3000`
4. Review console logs for errors
5. Check database: `ls -la backend/tradingcockpit.db`

---

**Ready to trade with discipline!** 🎯
