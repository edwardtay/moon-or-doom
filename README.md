# Starter EVM

Fullstack EVM starter with a Next.js frontend, Foundry contracts, and an AI agent scaffold. Clone and start building.

## Structure

```
frontend/     Next.js 16 · React 19 · Tailwind v4 · wagmi · RainbowKit · shadcn/ui
contracts/    Foundry · Solidity 0.8.26 · Counter example
agent/        Anthropic SDK · Tool-use loop
```

## Quick Start

### Frontend

```bash
cd frontend
cp .env.example .env.local        # add your WalletConnect project ID
pnpm install
pnpm dev
```

### Contracts

Requires [Foundry](https://book.getfoundry.sh/getting-started/installation).

```bash
cd contracts
forge build
forge test
```

### Agent

```bash
cd agent
cp .env.example .env              # add your Anthropic API key
pnpm install
pnpm dev
```

## Rebranding

Edit `frontend/src/config/site.ts` — project name and description flow to the layout, navbar, and landing page from there.

## Chains

Configured for Ethereum mainnet, Base, and Sepolia. Edit `frontend/src/config/wagmi.ts` to change.

## Deploy

Frontend deploys to Vercel out of the box (`vercel.json` points to `frontend/`).
