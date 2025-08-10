const express = require("express");
const cors = require("cors");
const path = require("path");
const { Client, Wallet, xrpToDrops } = require("xrpl");
const { RestClientV2 } = require("bitget-api");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "src/static")));

// Bitget API Service using bitget-api library
class BitgetService {
    constructor() {
        this.api_key = process.env.BITGET_API_KEY || "YOUR_BITGET_API_KEY";
        this.secret_key = process.env.BITGET_SECRET_KEY || "YOUR_BITGET_SECRET_KEY";
        this.passphrase = process.env.BITGET_PASSPHRASE || "YOUR_BITGET_PASSPHRASE";
        this.base_url = process.env.BITGET_BASE_URL || "https://api.bitget.com";

        this.client = new RestClientV2({
            apiKey: this.api_key,
            apiSecret: this.secret_key,
            apiPass: this.passphrase,
        });
    }

    async getDepositRecords(coin, startTime, endTime, limit = 100) {
        try {
            console.log(`📋 Getting deposit records for ${coin} using bitget-api library...`);

            if (this.api_key === "YOUR_BITGET_API_KEY") {
                console.log("⚠️  Using placeholder API credentials. Replace with real Bitget API credentials in .env file.");
                return {
                    code: "00000",
                    data: []
                };
            }

            const response = await this.client.getSpotDepositHistory({
                startTime: startTime,
                endTime: endTime,
                limit: limit.toString()
            });
            console.log(`✅ Deposit records retrieved: ${response.data.length} records`);
            return response;

        } catch (error) {
            console.error("❌ Error getting deposit records:", error.message);
            console.error("❌ Full error object:", error); // Added for debugging
            throw new Error(`Failed to get deposit records: ${error.message}`);
        }
    }

    async waitForDepositConfirmation(coin, expectedAmount, txHash, maxWaitTime = 900000) { // 15 minutes max
        const startTime = Date.now();
        const endTime = startTime + maxWaitTime;
        const pollInterval = 30000; // Check every 30 seconds

        console.log(`⏳ Waiting for ${coin} deposit confirmation...`);
        console.log(`💰 Expected amount: ${expectedAmount}`);
        console.log(`🔍 Transaction hash: ${txHash}`);
        console.log(`⏰ Max wait time: ${maxWaitTime / 60000} minutes`);

        while (Date.now() < endTime) {
            try {
                const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
                console.log(`🔍 Checking deposits... (${elapsedTime}s elapsed)`);

                // Get recent deposit records
                const lookbackTime = Date.now() - (30 * 60 * 1000); // Look back 30 minutes
                const currentTime = Date.now();

                console.log(`📋 Querying deposits from ${new Date(lookbackTime).toISOString()} to ${new Date(currentTime).toISOString()}`);

                const depositRecords = await this.getDepositRecords(coin, lookbackTime, currentTime);
                console.log(`📋 Deposit API response:`, JSON.stringify(depositRecords, null, 2));

                if (depositRecords.code === "00000" && depositRecords.data) {
                    console.log(`📋 Found ${depositRecords.data.length} deposit records for ${coin}`);

                    // Look for matching deposit
                    const matchingDeposit = depositRecords.data.find(deposit => {
                        const amountMatch = Math.abs(parseFloat(deposit.size) - parseFloat(expectedAmount)) < 0.001;
                        const statusConfirmed = deposit.status === "success" || deposit.status === "SUCCESS";
                        const txIdMatch = deposit.tradeId === txHash; // Match by transaction hash

                        console.log(`🔍 Checking deposit:`, {
                            amount: deposit.size,
                            expectedAmount,
                            amountMatch,
                            status: deposit.status,
                            statusConfirmed,
                            bitgetTradeId: deposit.tradeId, // Log Bitget's tradeId
                            expectedTxHash: txHash, // Log XRPL transaction hash
                            txIdMatch,
                            createdTime: deposit.createdTime
                        });

                        return amountMatch && statusConfirmed && txIdMatch;
                    });

                    if (matchingDeposit) {
                        console.log(`✅ Deposit confirmed! Amount: ${matchingDeposit.size} ${coin}`);
                        console.log(`✅ Transaction ID: ${matchingDeposit.tradeId}`);
                        console.log(`✅ Status: ${matchingDeposit.status}`);
                        console.log(`✅ Created: ${new Date(Number(matchingDeposit.cTime)).toISOString()}`);
                        return { success: true, deposit: matchingDeposit };
                    } else {
                        console.log(`⏳ No matching confirmed deposit found yet.`);
                    }
                } else {
                    console.log(`⚠️  Failed to get deposit records:`, depositRecords);
                }

                console.log(`⏳ Waiting ${pollInterval / 1000} seconds before next check...`);
                await new Promise(resolve => setTimeout(resolve, pollInterval));

            } catch (error) {
                console.error("❌ Error checking deposit status:", error.message);
                console.error("❌ Full error object:", error); // Added for debugging
                // Continue polling despite errors
                console.log(`⏳ Retrying in ${pollInterval / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
        }

        console.log(`⏰ Timeout waiting for deposit confirmation after ${maxWaitTime / 60000} minutes`);
        return { success: false, error: "Deposit confirmation timeout" };
    }

    async getDepositAddress(coin, chain) {
        try {
            console.log(`🏦 Getting deposit address for ${coin} on ${chain} using bitget-api library...`);

            // Hardcoded Bitget deposit address and tag for RLUSD
            if (coin === "RLUSD" && chain === "XRPL") {
                console.log("✅ Using hardcoded Bitget deposit address for RLUSD.");
                return {
                    code: "00000",
                    data: {
                        address: "rGDreBvnHrX1get7na3J4oowN19ny4GzFn",
                        tag: "102717160"
                    }
                };
            }

            const response = await this.client.getSpotDepositAddress({
                coin: coin,
                chain: chain
            });
            console.log(`✅ Deposit address retrieved: ${response.data.address}`);
            return response;

        } catch (error) {
            console.error("❌ Error getting deposit address:", error.message);
            console.error("❌ Full error object:", error); // Added for debugging
            throw new Error(`Failed to get deposit address: ${error.message}`);
        }
    }

    async getQuotedPrice(fromCoin, toCoin, fromCoinSize) {
        try {
            console.log(`📋 Getting quoted price for ${fromCoinSize} ${fromCoin} to ${toCoin} using bitget-api library...`);
            console.log(`Parameters for getConvertQuotedPrice: fromCoin=${fromCoin}, toCoin=${toCoin}, fromCoinSize=${fromCoinSize}`); // Log parameters

            if (this.api_key === "YOUR_BITGET_API_KEY") {
                console.log("⚠️  Using placeholder API credentials. Replace with real Bitget API credentials in .env file.");
                const simulatedCnvtPrice = (parseFloat(fromCoinSize) * 0.99).toFixed(8); // Simulate a price
                console.log(`🎭 Simulated quoted price: ${simulatedCnvtPrice}`);
                return {
                    code: "00000",
                    data: {
                        cnvtPrice: simulatedCnvtPrice,
                        toCoinSize: (parseFloat(fromCoinSize) * 0.99).toFixed(8),
                        traceId: `simulated_trace_${Date.now()}` // Add simulated traceId
                    }
                };
            }

            // Validate fromCoinSize
            const amount = parseFloat(fromCoinSize);
            if (isNaN(amount) || amount <= 0) {
                return { success: false, message: "Invalid fromCoinSize: Must be a positive number for Bitget API." };
            }

            const response = await this.client.getConvertQuotedPrice({
                fromCoin: fromCoin,
                toCoin: toCoin,
                fromCoinSize: amount.toString()
            });
            console.log(`✅ Quoted price API response:`, JSON.stringify(response, null, 2));
            return response;

        } catch (error) {
            console.error("❌ Error getting quoted price:", error.message);
            console.error("❌ Full error object:", error);
            // Check if error has a response data for more specific Bitget error messages
            if (error.response && error.response.data) {
                console.error("❌ Bitget API Error Response:", JSON.stringify(error.response.data, null, 2));
                return { success: false, message: `Failed to get quoted price from Bitget: ${error.response.data.msg || error.message}` };
            }
            return { success: false, message: `Failed to get quoted price: ${error.message}` };
        }
    }

    async convertCurrency(fromCoin, toCoin, amount) {
        try {
            // Step 1: Get quoted price
            console.log(`💱 Getting quoted price for ${amount} ${fromCoin} to ${toCoin}...`);
            const quotedPriceResponse = await this.getQuotedPrice(fromCoin, toCoin, amount);

            // Check if getQuotedPrice returned an error
            if (quotedPriceResponse.success === false) {
                throw new Error(quotedPriceResponse.message);
            }

            if (quotedPriceResponse.code !== "00000" || !quotedPriceResponse.data) {
                throw new Error(`Failed to get quoted price: ${quotedPriceResponse.msg || "Unknown error"}`);
            }

            const cnvtPrice = quotedPriceResponse.data.cnvtPrice;
            const toCoinSize = quotedPriceResponse.data.toCoinSize;
            const traceId = quotedPriceResponse.data.traceId;
            console.log(`✅ Quoted price obtained: cnvtPrice=${cnvtPrice}, toCoinSize=${toCoinSize}, traceId=${traceId}`);

            console.log(`💱 Converting ${amount} ${fromCoin} to ${toCoin} using bitget-api library...`);

            if (this.api_key === "YOUR_BITGET_API_KEY") {
                console.log("⚠️  Using placeholder API credentials. Replace with real Bitget API credentials in .env file.");
                const convertedAmount = parseFloat(amount) * 0.998; // Simulate 0.2% conversion fee
                console.log(`🎭 Simulated conversion result: ${convertedAmount.toFixed(2)} ${toCoin}`);
                return {
                    code: "00000",
                    data: {
                        orderId: `convert_${Date.now()}`,
                        convertedAmount: convertedAmount.toFixed(2)
                    }
                };
            }

            const response = await this.client.convert({
                fromCoin: fromCoin,
                toCoin: toCoin,
                fromCoinSize: amount.toString(),
                cnvtPrice: cnvtPrice,
                toCoinSize: toCoinSize,
                traceId: traceId
            });
            console.log(`✅ Conversion API response:`, JSON.stringify(response, null, 2));
            console.log(`✅ Conversion successful. Order ID: ${response.data.orderId}`);
            return response;

        } catch (error) {
            console.error("❌ Error converting currency:", error.message);
            console.error("❌ Full error object:", error); // Added for debugging
            console.error("❌ Error details:", {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            throw new Error(`Failed to convert currency: ${error.message}`);
        }
    }

    async withdraw(coin, address, chain, amount) {
        try {
            console.log(`💸 Withdrawing ${amount} ${coin} to ${address} on ${chain} using bitget-api library...`);

            if (this.api_key === "YOUR_BITGET_API_KEY") {
                console.log("⚠️  Using placeholder API credentials. Replace with real Bitget API credentials in .env file.");
                console.log(`🎭 Simulated withdrawal to ${address} on ${chain}`);
                return {
                    code: "00000",
                    data: {
                        orderId: `withdraw_${Date.now()}`,
                        txId: `simulated_tx_${Date.now()}`
                    }
                };
            }

            const response = await this.client.submitWithdrawal({
                coin: coin,
                transferType: "on_chain", // Assuming on_chain for now
                address: address,
                chain: chain,
                size: amount.toString()
            });
            console.log(`✅ Withdrawal API response:`, JSON.stringify(response, null, 2));
            console.log(`✅ Withdrawal successful. Order ID: ${response.data.orderId}`);
            return response;

        } catch (error) {
            console.error("❌ Error withdrawing:", error.message);
            console.error("❌ Full error object:", error); // Added for debugging
            console.error("❌ Error details:", {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            throw new Error(`Failed to withdraw: ${error.message}`);
        }
    }
}

class XRPLService {
    constructor() {
        this.network = process.env.XRPL_NETWORK || "mainnet";
        this.websocketUrl = process.env.XRPL_WEBSOCKET_URL || "wss://xrplcluster.com/";
        this.rlusdIssuer = process.env.RLUSD_ISSUER || "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
        this.client = null;
    }

    async connect() {
        if (!this.client) {
            this.client = new Client(this.websocketUrl);
        }

        if (!this.client.isConnected()) {
            console.log(`🔗 Connecting to XRPL ${this.network}...`);
            await this.client.connect();
            console.log(`✅ Connected to XRPL ${this.network}`);
        }
    }

    async disconnect() {
        if (this.client && this.client.isConnected()) {
            console.log(`🔌 Disconnecting from XRPL`);
            await this.client.disconnect();
        }
    }

    async getAccountInfo(address) {
        await this.connect();
        try {
            console.log(`🔍 Getting account info for: ${address}`);
            const response = await this.client.request({
                command: "account_info",
                account: address,
                ledger_index: "validated"
            });
            return response.result.account_data;
        } catch (error) {
            console.error(`❌ Error getting account info for ${address}:`, error.message);
            console.error("❌ Full error object:", error); // Added for debugging
            throw error;
        } finally {
            await this.disconnect();
        }
    }

    async getTrustLines(address) {
        await this.connect();
        try {
            console.log(`🔍 Getting trust lines for: ${address}`);
            const response = await this.client.request({
                command: "account_lines",
                account: address,
                ledger_index: "validated"
            });
            console.log(`🔍 Found ${response.result.lines.length} trust lines`);
            response.result.lines.forEach((line, index) => {
                console.log(`📋 Trust line ${index + 1}:`, {
                    currency: line.currency,
                    account: line.account,
                    balance: line.balance,
                    limit: line.limit
                });
            });
            return response.result.lines;
        } catch (error) {
            console.error(`❌ Error getting trust lines for ${address}:`, error.message);
            console.error("❌ Full error object:", error); // Added for debugging
            throw error;
        } finally {
            await this.disconnect();
        }
    }

    async getRLUSDBalance(address) {
        try {
            const trustLines = await this.getTrustLines(address);
            const rlusdTrustLine = trustLines.find(line => line.currency === "524C555344000000000000000000000000000000" && line.account === this.rlusdIssuer);

            if (rlusdTrustLine) {
                console.log(`✅ Found RLUSD trust line with balance: ${rlusdTrustLine.balance}`);
                return parseFloat(rlusdTrustLine.balance);
            } else {
                console.log("⚠️  RLUSD trust line not found or balance is 0.");
                return 0;
            }
        } catch (error) {
            console.error("❌ Error getting RLUSD balance:", error.message);
            console.error("❌ Full error object:", error); // Added for debugging
            return 0;
        }
    }

    async sendRLUSD(senderSeed, destinationAddress, amount, destinationTag) {
        await this.connect();
        try {
            const wallet = Wallet.fromSeed(senderSeed);
            console.log(`💸 Sending ${amount} RLUSD from XRPL to ${destinationAddress}...`);
            console.log(`📝 Sender address: ${wallet.address}`);

            const prepared = await this.client.autofill({
                "TransactionType": "Payment",
                "Account": wallet.address,
                "Amount": {
                    "currency": "524C555344000000000000000000000000000000",
                    "value": amount.toString(),
                    "issuer": this.rlusdIssuer
                },
                "Destination": destinationAddress,
                "DestinationTag": parseInt(destinationTag),
            });

            console.log(`🔄 Preparing transaction...`);
            const signed = wallet.sign(prepared);
            console.log(`✍️  Signing transaction...`);
            const result = await this.client.submitAndWait(signed.tx_blob);
            console.log(`📡 Submitting transaction to XRPL...`);

            if (result.result.meta.TransactionResult === "tesSUCCESS") {
                console.log(`✅ XRPL transaction successful! Hash: ${result.result.hash}`);
                return { success: true, hash: result.result.hash };
            } else {
                console.error(`❌ XRPL transaction failed: ${result.result.meta.TransactionResult}`);
                console.error("❌ Full result object:", result); // Added for debugging
                return { success: false, message: result.result.meta.TransactionResult };
            }
        } catch (error) {
            console.error("❌ Error sending RLUSD:", error.message);
            console.error("❌ Full error object:", error); // Added for debugging
            throw error;
        } finally {
            await this.disconnect();
        }
    }
}

const bitgetService = new BitgetService();
const xrplService = new XRPLService();

// Supported networks endpoint
app.get("/api/crosschain/supported-networks", (req, res) => {
    const supportedNetworks = [
        { id: "ethereum", name: "Ethereum", token: "USDC" },
        { id: "polygon", name: "Polygon", token: "USDC" },
        { id: "bsc", name: "BSC", token: "USDC" },
        { id: "arbitrum", name: "Arbitrum", token: "USDC" },
        { id: "optimism", name: "Optimism", token: "USDC" },
        { id: "avalanche", name: "Avalanche", token: "USDC" },
        { id: "solana", name: "Solana", token: "USDC" }
    ];
    res.json(supportedNetworks);
});

// API Endpoints
app.get("/api/xrpl/balance/:address", async (req, res) => {
    try {
        const { address } = req.params;
        const balance = await xrplService.getRLUSDBalance(address);
        res.json({ balance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/xrpl/send", async (req, res) => {
    try {
        const { senderSeed, destinationAddress, amount, destinationTag } = req.body;
        const result = await xrplService.sendRLUSD(senderSeed, destinationAddress, amount, destinationTag);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/crosschain/transfer", async (req, res) => {
    try {
        const { senderSeed, rlusd_amount, targetChain, usdcAddress } = req.body;

        // Step 1: Get Bitget deposit address for RLUSD
        console.log("🏦 Step 1: Getting Bitget deposit address for RLUSD...");
        const depositAddressResponse = await bitgetService.getDepositAddress("RLUSD", "XRPL");

        if (depositAddressResponse.code !== "00000" || !depositAddressResponse.data) {
            throw new Error(`Failed to get deposit address: ${depositAddressResponse.msg || "Unknown error"}`);
        }

        const bitgetDepositAddress = depositAddressResponse.data.address;
        const bitgetDestinationTag = depositAddressResponse.data.tag;

        // Step 2: Send RLUSD from XRPL to Bitget
        console.log("💸 Step 2: Sending RLUSD from XRPL to Bitget...");
        const sendResult = await xrplService.sendRLUSD(senderSeed, bitgetDepositAddress, rlusd_amount, bitgetDestinationTag);

        if (!sendResult.success) {
            throw new Error(`Failed to send RLUSD: ${sendResult.message}`);
        }

        // Step 2.5: Wait for RLUSD deposit confirmation at Bitget
        console.log("⏳ Step 2.5: Waiting for RLUSD deposit confirmation at Bitget...");
        const depositConfirmation = await bitgetService.waitForDepositConfirmation("RLUSD", rlusd_amount, sendResult.hash);

        if (!depositConfirmation.success) {
            throw new Error(`RLUSD deposit confirmation failed: ${depositConfirmation.error}`);
        }

        // Step 3: Convert RLUSD to USDC at Bitget
        console.log("💱 Step 3: Converting RLUSD to USDC at Bitget...");
        const convertResponse = await bitgetService.convertCurrency("RLUSD", "USDC", rlusd_amount);

        if (convertResponse.code !== "00000" || !convertResponse.data) {
            throw new Error(`Failed to convert currency: ${convertResponse.msg || "Unknown error"}`);
        }

        const convertedAmount = convertResponse.data.convertedAmount;

        // Step 4: Withdraw USDC to target chain
        console.log(`💸 Step 4: Withdrawing ${convertedAmount} USDC to ${targetChain} address ${usdcAddress}...`);
        const withdrawResponse = await bitgetService.withdraw("USDC", usdcAddress, targetChain, convertedAmount);

        if (withdrawResponse.code !== "00000" || !withdrawResponse.data) {
            throw new Error(`Failed to withdraw USDC: ${withdrawResponse.msg || "Unknown error"}`);
        }

        res.json({ success: true, message: "Cross-chain transfer completed successfully!" });

    } catch (error) {
        console.error("❌ Cross-chain transfer failed:", error.message);
        res.status(500).json({ error: error.message });
    }
});


// XRPL Account Info Route
app.post("/api/xrpl/account-info", async (req, res) => {
    try {
        const { address, xrpl_seed } = req.body;
        
        let xrplAddress = address;
        
        // If seed is provided instead of address, extract address from seed
        if (!xrplAddress && xrpl_seed) {
            try {
                const wallet = Wallet.fromSeed(xrpl_seed);
                xrplAddress = wallet.address;
            } catch (seedError) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Invalid XRPL seed provided." 
                });
            }
        }
        
        if (!xrplAddress) {
            return res.status(400).json({ 
                success: false, 
                message: "Address or XRPL seed is required." 
            });
        }
        
        const accountInfo = await xrplService.getAccountInfo(xrplAddress);
        const rlusdBalance = await xrplService.getRLUSDBalance(xrplAddress);
        
        res.json({ 
            success: true, 
            data: {
                address: xrplAddress,
                account_exists: !!accountInfo,
                xrp_balance: accountInfo?.Balance || "0",
                rlusd_balance: rlusdBalance.toString()
            }
        });
    } catch (error) {
        console.error("❌ Error in /api/xrpl/account-info:", error.message);
        res.status(500).json({ 
            success: false, 
            message: "Error connecting to XRPL. Please try again." 
        });
    }
});

// Cross-chain transfer route
app.post("/api/crosschain/start-crosschain", async (req, res) => {
    try {
        const { rlusd_amount, destination_network, xrpl_seed, destination_address } = req.body;

        if (!rlusd_amount || !destination_network || !xrpl_seed || !destination_address) {
            return res.status(400).json({ error: "Missing required parameters." });
        }

        const senderSeed = xrpl_seed; // Use xrpl_seed as senderSeed
        const usdcAddress = destination_address; // Use destination_address as usdcAddress
        const targetChain = destination_network; // Use destination_network as targetChain

        // Step 1: Get Bitget deposit address for RLUSD
        console.log("🏦 Step 1: Getting Bitget deposit address for RLUSD...");
        const depositAddressResponse = await bitgetService.getDepositAddress("RLUSD", "XRPL");

        if (depositAddressResponse.code !== "00000" || !depositAddressResponse.data) {
            throw new Error(`Failed to get deposit address: ${depositAddressResponse.msg || "Unknown error"}`);
        }

        const bitgetDepositAddress = depositAddressResponse.data.address;
        const bitgetDestinationTag = depositAddressResponse.data.tag;

        // Step 2: Send RLUSD from XRPL to Bitget
        console.log("💸 Step 2: Sending RLUSD from XRPL to Bitget...");
        const sendResult = await xrplService.sendRLUSD(senderSeed, bitgetDepositAddress, rlusd_amount, bitgetDestinationTag);

        if (!sendResult.success) {
            throw new Error(`Failed to send RLUSD: ${sendResult.message}`);
        }

        // Step 2.5: Wait for RLUSD deposit confirmation at Bitget
        console.log("⏳ Step 2.5: Waiting for RLUSD deposit confirmation at Bitget...");
        const depositConfirmation = await bitgetService.waitForDepositConfirmation("RLUSD", rlusd_amount, sendResult.hash);

        if (!depositConfirmation.success) {
            throw new Error(`RLUSD deposit confirmation failed: ${depositConfirmation.error}`);
        }

        // Step 3: Convert RLUSD to USDC at Bitget
        console.log("💱 Step 3: Converting RLUSD to USDC at Bitget...");
        const convertResponse = await bitgetService.convertCurrency("RLUSD", "USDC", rlusd_amount);

        if (convertResponse.code !== "00000" || !convertResponse.data) {
            throw new Error(`Failed to convert currency: ${convertResponse.msg || "Unknown error"}`);
        }

        const convertedAmount = convertResponse.data.convertedAmount;

        // Step 4: Withdraw USDC to target chain
        console.log(`💸 Step 4: Withdrawing ${convertedAmount} USDC to ${targetChain} address ${usdcAddress}...`);
        const withdrawResponse = await bitgetService.withdraw("USDC", usdcAddress, targetChain, convertedAmount);

        if (withdrawResponse.code !== "00000" || !withdrawResponse.data) {
            throw new Error(`Failed to withdraw USDC: ${withdrawResponse.msg || "Unknown error"}`);
        }

        res.json({ success: true, message: "Cross-chain transfer completed successfully!" });

    } catch (error) {
        console.error("❌ Cross-chain transfer failed:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 XRPL Network: ${process.env.XRPL_NETWORK}`);
    console.log(`🏦 Bitget API configured: ${bitgetService.api_key !== "YOUR_BITGET_API_KEY" ? "Yes" : "No"}`);
});