# Stellar Payment Tracker

A decentralized payment tracking application built on the Stellar blockchain with Soroban smart contracts.

## Features

- 🔐 Multi-wallet support (Freighter, xBull, Albedo)
- 📊 Real-time payment tracking
- 💫 Modern, glassmorphic UI design
- ⚡ Fast transactions on Stellar testnet
- 🔍 Transaction verification on Stellar Explorer

## Wallet Options

The application supports three major Stellar wallets:

**Available Wallets:**
- 🦅 **Freighter** - Browser extension wallet
- 🐂 **xBull** - Browser extension wallet  
- ✨ **Albedo** - Web-based wallet

*To add a screenshot: Open the app, click "Connect Wallet", take a screenshot of the modal, and save it as `wallet-selector.png` in the project root.*

## Deployment Details

### Contract Address
```
CC5RS5GXAPO7NW27U65XXHKSEWO4ODYX5WLYDHCPBOX4XVXBP7LRFWQ2
```

### Network
Stellar Testnet

### Example Transaction
```
Transaction Hash:41672e07b4d6ba3fd6f4a2755eb6be7db5fb4ac9b6eeb977c5f7f23ea939d67e
```

Verify on [Stellar Expert](https://stellar.expert/explorer/testnet/tx/YOUR_TX_HASH)

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
node server.js
```

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Blockchain**: Stellar Soroban Smart Contracts
- **Wallets**: Freighter, xBull, Albedo integration

## Configuration

Update contract details in `frontend/src/config.js`:
- Contract ID
- Network (Testnet/Mainnet)
- RPC endpoints

---

Built with ❤️ on Stellar
