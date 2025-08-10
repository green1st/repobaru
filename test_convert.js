const { RestClientV2 } = require("bitget-api");
require("dotenv").config();

class BitgetServiceTest {
    constructor() {
        this.api_key = process.env.BITGET_API_KEY || "YOUR_BITGET_API_KEY";
        this.secret_key = process.env.BITGET_SECRET_KEY || "YOUR_BITGET_SECRET_KEY";
        this.passphrase = process.env.BITGET_PASSPHRASE || "YOUR_BITGET_PASSPHRASE";

        this.client = new RestClientV2({
            apiKey: this.api_key,
            apiSecret: this.secret_key,
            apiPass: this.passphrase,
        });
    }

    async getQuotedPrice(fromCoin, toCoin, fromCoinSize) {
        try {
            console.log(`📋 Getting quoted price for ${fromCoinSize} ${fromCoin} to ${toCoin} using bitget-api library...`);
            const response = await this.client.getConvertQuotedPrice({
                fromCoin: fromCoin,
                toCoin: toCoin,
                fromCoinSize: fromCoinSize.toString()
            });
            console.log(`✅ Quoted price API response:`, JSON.stringify(response, null, 2));
            return response;

        } catch (error) {
            console.error("❌ Error getting quoted price:", error.message);
            console.error("❌ Error details:", {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            throw new Error(`Failed to get quoted price: ${error.message}`);
        }
    }

    async convertCurrency(fromCoin, toCoin, amount) {
        try {
            // Step 1: Get quoted price
            console.log(`💱 Getting quoted price for ${amount} ${fromCoin} to ${toCoin}...`);
            const quotedPriceResponse = await this.getQuotedPrice(fromCoin, toCoin, amount);

            if (quotedPriceResponse.code !== "00000" || !quotedPriceResponse.data) {
                throw new Error(`Failed to get quoted price: ${quotedPriceResponse.msg || "Unknown error"}`);
            }

            const cnvtPrice = quotedPriceResponse.data.cnvtPrice;
            const toCoinSize = quotedPriceResponse.data.toCoinSize;
            const traceId = quotedPriceResponse.data.traceId;

            console.log(`✅ Quoted price obtained: ${cnvtPrice}, toCoinSize: ${toCoinSize}, traceId: ${traceId}`);

            console.log(`💱 Converting ${amount} ${fromCoin} to ${toCoin} using bitget-api library...`);

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
            console.error("❌ Error details:", {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            throw new Error(`Failed to convert currency: ${error.message}`);
        }
    }
}

async function runTest() {
    const bitgetService = new BitgetServiceTest();
    const amountToConvert = 3; // Test with 3 RLUSD

    try {
        console.log(`
--- Starting conversion test for ${amountToConvert} RLUSD to USDC ---
`);
        await bitgetService.convertCurrency("RLUSD", "USDC", amountToConvert);
        console.log(`
--- Conversion test completed successfully ---
`);
    } catch (error) {
        console.error(`
--- Conversion test failed: ${error.message} ---
`);
    }
}

runTest();


