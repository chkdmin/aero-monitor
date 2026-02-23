# Aero Monitor

Aerodrome Finance Slipstream (CL) LP position range monitor on Base chain. Detects when positions approach or exit their tick range and sends alerts via n8n webhook to Telegram.

## Features

- Monitors both **unstaked** and **staked** CL positions
- Dynamic gauge discovery via the Voter contract (no manual pool configuration)
- Three-state detection: `in_range`, `near_boundary`, `out_of_range`
- Configurable boundary threshold percentage
- Alerts only on state changes (no spam)
- n8n webhook integration for Telegram notifications

## How It Works

1. **Position Discovery** - Enumerates all CL gauges via the Voter contract, then checks `stakedValues()` for staked positions and `balanceOf()` for unstaked positions
2. **Range Monitoring** - Reads `slot0.tick` from each pool and compares against position tick range
3. **Alert on Change** - When a position's range status changes, sends a webhook alert

## Setup

```bash
pnpm install
cp .env.example .env
# Edit .env with your values
```

### Environment Variables

| Variable | Description |
|---|---|
| `WALLET_ADDRESS` | Wallet address to monitor |
| `RPC_URL` | Base chain RPC URL (Alchemy recommended) |
| `WEBHOOK_URL` | n8n webhook endpoint |
| `N8N_API_KEY` | API key for n8n webhook authentication |
| `POLL_INTERVAL_MS` | Polling interval in ms (default: 60000) |
| `THRESHOLD_PERCENT` | Boundary proximity threshold % (default: 5) |

## Usage

```bash
# Development
pnpm dev

# Production
pnpm build && pnpm start
```

## Docker

```bash
docker build -t aero-monitor .
docker run --env-file .env aero-monitor
```

## Deploy to Railway

1. Push to GitHub
2. Create new Railway project from the repo
3. Add environment variables in Railway dashboard
4. Railway auto-detects the Dockerfile and deploys

## Tech Stack

- **Runtime**: Node.js 22
- **Language**: TypeScript
- **Chain Client**: [viem](https://viem.sh)
- **Chain**: Base (Aerodrome Finance)
