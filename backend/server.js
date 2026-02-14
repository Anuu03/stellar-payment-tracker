import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import NodeCache from "node-cache";
import {
  rpc,
  Contract,
  Networks,
  TransactionBuilder,
  Account,
  BASE_FEE,
  Address,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configuration
const CONTRACT_ID = process.env.CONTRACT_ID || "CC5RS5GXAPO7NW27U65XXHKSEWO4ODYX5WLYDHCPBOX4XVXBP7LRFWQ2";
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

const sorobanServer = new rpc.Server(SOROBAN_RPC_URL);

// Cache for transaction status (TTL: 5 minutes)
const txCache = new NodeCache({ stdTTL: 300 });

// Error codes
const ErrorCodes = {
  SIMULATION_FAILED: "SIMULATION_FAILED",
  INSUFFICIENT_AUTH: "INSUFFICIENT_AUTH",
  INVALID_PARAMS: "INVALID_PARAMS",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  NETWORK_ERROR: "NETWORK_ERROR",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  TIMEOUT: "TIMEOUT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Poll transaction status until confirmed or timeout
 */
async function pollTransactionStatus(hash, maxAttempts = 30, interval = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await sorobanServer.getTransaction(hash);

      if (response.status === "SUCCESS") {
        return {
          status: "SUCCESS",
          result: response,
          ledger: response.ledger,
        };
      }

      if (response.status === "FAILED") {
        return {
          status: "FAILED",
          error: response.resultXdr,
          resultMetaXdr: response.resultMetaXdr,
        };
      }

      // Still pending, wait and try again
      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (error) {
      console.error(`Polling attempt ${i + 1} failed:`, error.message);
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  return { status: "TIMEOUT" };
}

/**
 * Fetch account from Horizon
 */
async function getAccount(publicKey) {
  try {
    const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
    if (!response.ok) {
      throw new Error(`Account not found: ${publicKey}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch account: ${error.message}`);
  }
}

/**
 * Build error response
 */
function errorResponse(code, message, details = null) {
  const response = { error: { code, message } };
  if (details) {
    response.error.details = details;
  }
  return response;
}

// ==================== API ENDPOINTS ====================

/**
 * POST /api/prepare-transaction
 * Prepares a Soroban contract transaction
 */
app.post("/api/prepare-transaction", async (req, res) => {
  try {
    const { from, to, amount } = req.body;

    // Validate inputs
    if (!from || !to || !amount) {
      return res.status(400).json(
        errorResponse(
          ErrorCodes.INVALID_PARAMS,
          "Missing required parameters: from, to, amount"
        )
      );
    }

    // Fetch account data
    const accountData = await getAccount(from);
    const sourceAccount = new Account(accountData.account_id, accountData.sequence);

    // Build contract call
    const contract = new Contract(CONTRACT_ID);

    let transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          "log_payment",
          Address.fromString(from).toScVal(),
          Address.fromString(to).toScVal(),
          nativeToScVal(BigInt(Math.floor(amount * 10000000)), { type: "i128" })
        )
      )
      .setTimeout(30)
      .build();

    // Simulate transaction
    const simulation = await sorobanServer.simulateTransaction(transaction);

    if (rpc.Api.isSimulationError(simulation)) {
      console.error("Simulation error:", simulation.error);
      return res.status(400).json(
        errorResponse(
          ErrorCodes.SIMULATION_FAILED,
          "Contract simulation failed",
          simulation.error
        )
      );
    }

    if (!simulation.result) {
      return res.status(400).json(
        errorResponse(
          ErrorCodes.SIMULATION_FAILED,
          "Simulation returned no result"
        )
      );
    }

    // Assemble transaction with simulation results
    const assembledTx = rpc.assembleTransaction(transaction, simulation);
    const preparedTx = assembledTx.build();


    res.json({
      xdr: preparedTx.toXDR(),
      hash: preparedTx.hash().toString("hex"),
      fee: preparedTx.fee,
      operations: preparedTx.operations.length,
    });
  } catch (error) {
    console.error("Prepare transaction error:", error);
    
    if (error.message.includes("Account not found")) {
      return res.status(404).json(
        errorResponse(ErrorCodes.ACCOUNT_NOT_FOUND, error.message)
      );
    }

    res.status(500).json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        "Failed to prepare transaction",
        error.message
      )
    );
  }
});

/**
 * POST /api/submit-transaction
 * Submits a signed transaction and initiates polling
 */
app.post("/api/submit-transaction", async (req, res) => {
  try {
    const { signedXdr } = req.body;

    if (!signedXdr) {
      return res.status(400).json(
        errorResponse(ErrorCodes.INVALID_PARAMS, "Missing signedXdr parameter")
      );
    }

    // Parse transaction
    const transaction = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);

    // Submit to Soroban
    const sendResponse = await sorobanServer.sendTransaction(transaction);

    if (sendResponse.status === "ERROR") {
      return res.status(400).json(
        errorResponse(
          ErrorCodes.TRANSACTION_FAILED,
          "Transaction submission failed",
          sendResponse
        )
      );
    }

    const hash = sendResponse.hash;

    // Cache initial status
    txCache.set(hash, { status: "PENDING", submittedAt: Date.now() });

    // Start polling in background (don't await)
    pollTransactionStatus(hash).then((result) => {
      txCache.set(hash, { ...result, completedAt: Date.now() });
    });

    res.json({
      hash,
      status: "PENDING",
      message: "Transaction submitted successfully",
    });
  } catch (error) {
    console.error("Submit transaction error:", error);
    res.status(500).json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        "Failed to submit transaction",
        error.message
      )
    );
  }
});

/**
 * GET /api/transaction-status/:hash
 * Get transaction status (from cache or RPC)
 */
app.get("/api/transaction-status/:hash", async (req, res) => {
  try {
    const { hash } = req.params;

    // Check cache first
    const cached = txCache.get(hash);
    if (cached && cached.status !== "PENDING") {
      return res.json(cached);
    }

    // Poll RPC directly
    const response = await sorobanServer.getTransaction(hash);

    const result = {
      status: response.status,
      ledger: response.ledger,
    };

    if (response.status === "SUCCESS") {
      result.result = response.resultXdr;
      result.resultMeta = response.resultMetaXdr;
    } else if (response.status === "FAILED") {
      result.error = response.resultXdr;
    }

    // Update cache
    txCache.set(hash, result);

    res.json(result);
  } catch (error) {
    console.error("Transaction status error:", error);
    res.status(500).json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        "Failed to fetch transaction status",
        error.message
      )
    );
  }
});

/**
 * GET /api/payments
 * Fetch payment history from contract
 */
app.get("/api/payments", async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    // For now, return empty array - will be populated by frontend querying contract directly
    // In production, you might want to index events and serve from a database
    res.json({
      payments: [],
      offset,
      limit,
      message: "Query payments directly from contract using get_payments_range or get_recent_payments",
    });
  } catch (error) {
    console.error("Fetch payments error:", error);
    res.status(500).json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, "Failed to fetch payments")
    );
  }
});

/**
 * GET /api/events/stream
 * Server-Sent Events endpoint for real-time contract events
 */
app.get("/api/events/stream", async (req, res) => {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const contractId = req.query.contract || CONTRACT_ID;
  const startLedger = req.query.since || undefined;

  console.log(`SSE client connected for contract: ${contractId}`);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "connected", contractId })}\n\n`);

  // Poll for events every 5 seconds
  const pollInterval = setInterval(async () => {
    try {
      // Get latest ledger
      const latestLedger = await sorobanServer.getLatestLedger();

      // Get events from contract
      const events = await sorobanServer.getEvents({
        startLedger: startLedger || latestLedger.sequence - 100,
        filters: [
          {
            type: "contract",
            contractIds: [contractId],
          },
        ],
      });

      if (events.events && events.events.length > 0) {
        for (const event of events.events) {
          res.write(`data: ${JSON.stringify({
            type: "event",
            ledger: event.ledger,
            id: event.id,
            contractId: event.contractId,
            topic: event.topic,
            value: event.value,
            inSuccessfulContractCall: event.inSuccessfulContractCall,
          })}\n\n`);
        }
      }
    } catch (error) {
      console.error("Event fetch error:", error);
    }
  }, 5000);

  // Clean up on client disconnect
  req.on("close", () => {
    clearInterval(pollInterval);
    console.log("SSE client disconnected");
  });
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    contract: CONTRACT_ID,
    network: "TESTNET",
    sorobanRpc: SOROBAN_RPC_URL,
    horizonUrl: HORIZON_URL,
  });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Stellar Payment Tracker Backend running on http://localhost:${PORT}`);
  console.log(`📝 Contract ID: ${CONTRACT_ID}`);
  console.log(`🌐 Network: TESTNET`);
  console.log(`\n✅ Endpoints:`);
  console.log(`   POST /api/prepare-transaction`);
  console.log(`   POST /api/submit-transaction`);
  console.log(`   GET  /api/transaction-status/:hash`);
  console.log(`   GET  /api/payments`);
  console.log(`   GET  /api/events/stream`);
  console.log(`   GET  /api/health`);
});
