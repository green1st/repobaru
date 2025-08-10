import React, { useState, useEffect } from 'react';
import { ArrowRight, Wallet, RefreshCw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  // State untuk seed import
  const [seedImported, setSeedImported] = useState(false);
  const [xrplSeed, setXrplSeed] = useState('');
  const [accountInfo, setAccountInfo] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [seedError, setSeedError] = useState('');

  // State untuk crosschain transaction
  const [rlusdAmount, setRlusdAmount] = useState('');
  const [destinationNetwork, setDestinationNetwork] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [networks, setNetworks] = useState([]);
  const [showNetworks, setShowNetworks] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [transactionResult, setTransactionResult] = useState(null);
  const [error, setError] = useState('');

  // Load supported networks
  useEffect(() => {
    fetch(`${API_BASE_URL}/crosschain/supported-networks`)
      .then(res => res.json())
      .then(data => setNetworks(data))
      .catch(err => console.error('Error loading networks:', err));
  }, []);

  // Import XRPL seed and get account info
  const handleSeedImport = async () => {
    if (!xrplSeed.trim()) {
      setSeedError('Please enter your XRPL seed');
      return;
    }

    setLoadingAccount(true);
    setSeedError('');

    try {
      const response = await fetch(`${API_BASE_URL}/xrpl/account-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ xrpl_seed: xrplSeed }),
      });

      const result = await response.json();

      if (result.success) {
        setAccountInfo(result.data);
        setSeedImported(true);
        console.log('Account info:', result.data);
      } else {
        setSeedError(result.message || 'Failed to get account information');
      }
    } catch (err) {
      setSeedError('Error connecting to XRPL. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoadingAccount(false);
    }
  };

  // Refresh account balance
  const refreshBalance = async () => {
    if (!xrplSeed) return;
    
    setLoadingAccount(true);
    try {
      const response = await fetch(`${API_BASE_URL}/xrpl/account-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ xrpl_seed: xrplSeed }),
      });

      const result = await response.json();
      if (result.success) {
        setAccountInfo(result.data);
      }
    } catch (err) {
      console.error('Error refreshing balance:', err);
    } finally {
      setLoadingAccount(false);
    }
  };

  // Reset to seed import
  const resetToSeedImport = () => {
    setSeedImported(false);
    setXrplSeed('');
    setAccountInfo(null);
    setRlusdAmount('');
    setDestinationNetwork('');
    setDestinationAddress('');
    setTransactionResult(null);
    setError('');
    setProgress(0);
    setCurrentStep('');
    setIsProcessing(false);
  };

  // Start crosschain transaction
  const startCrossChain = async () => {
    const amount = parseFloat(rlusdAmount);

    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid positive RLUSD amount');
      return;
    }

    if (!destinationNetwork || !destinationAddress) {
      setError('Please fill in all fields');
      return;
    }

    if (amount > parseFloat(accountInfo.rlusd_balance)) {
      setError('Insufficient RLUSD balance');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProgress(0);
    setTransactionResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/crosschain/start-crosschain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rlusd_amount: amount, // Use the parsed amount here
          destination_network: destinationNetwork,
          xrpl_seed: xrplSeed,
          destination_address: destinationAddress,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setProgress(100);
        setCurrentStep('Transaction completed successfully!');
        setTransactionResult(result.data);
        // Refresh balance after successful transaction
        setTimeout(refreshBalance, 2000);
      } else {
        setError(result.message || 'Transaction failed');
        setProgress(75);
        setCurrentStep('Transaction failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setProgress(75);
      setCurrentStep('Transaction failed. Please try again.');
      console.error('Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Progress tracking simulation
  useEffect(() => {
    if (isProcessing && progress < 75) {
      const steps = [
        { progress: 25, message: 'Getting Bitget deposit address...' },
        { progress: 50, message: 'Sending RLUSD to Bitget...' },
        { progress: 75, message: 'Converting RLUSD to USDC...' },    ];

      const currentStepIndex = Math.floor(progress / 25);
      if (currentStepIndex < steps.length) {
        const timer = setTimeout(() => {
          setProgress(steps[currentStepIndex].progress);
          setCurrentStep(steps[currentStepIndex].message);
        }, 2000);

        return () => clearTimeout(timer);
      }
    }
  }, [isProcessing, progress]);

  // Seed Import Screen
  if (!seedImported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">CrossChain Bridge</h1>
            <p className="text-gray-600">Import your XRPL seed to get started</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                XRPL Seed
              </label>
              <input
                type="password"
                value={xrplSeed}
                onChange={(e) => setXrplSeed(e.target.value)}
                placeholder="Enter your XRPL seed"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loadingAccount}
              />
              <p className="text-xs text-gray-500 mt-1">
                Your seed is used to sign transactions and is not stored
              </p>
            </div>

            {seedError && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{seedError}</span>
              </div>
            )}

            <button
              onClick={handleSeedImport}
              disabled={loadingAccount || !xrplSeed.trim()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loadingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to XRPL...</span>
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  <span>Import Seed & Connect</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main CrossChain Interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header with Account Info */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">CrossChain Bridge</h1>
            <button
              onClick={resetToSeedImport}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Change Wallet
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">XRPL Address</span>
              <button
                onClick={refreshBalance}
                disabled={loadingAccount}
                className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAccount ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-gray-600 mb-3 font-mono">
              {accountInfo?.address || 'Unknown'}
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">XRP Balance</span>
                <p className="text-lg font-bold text-gray-900">
                  {accountInfo?.xrp_balance ? (parseFloat(accountInfo.xrp_balance) / 1000000).toFixed(2) : '0.00'} XRP
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">RLUSD Balance</span>
                <p className="text-lg font-bold text-green-600">
                  {parseFloat(accountInfo?.rlusd_balance || '0').toFixed(2)} RLUSD
                </p>
              </div>
            </div>

            {!accountInfo?.account_exists && (
              <div className="mt-3 flex items-center space-x-2 text-amber-600 bg-amber-50 p-2 rounded">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Account not found on XRPL network</span>
              </div>
            )}
          </div>
        </div>

        {/* CrossChain Transaction Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center space-x-2 mb-6">
            <ArrowRight className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">CrossChain Transaction</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RLUSD Amount
              </label>
              <input
                type="number"
                value={rlusdAmount}
                onChange={(e) => {
                  setRlusdAmount(e.target.value);
                  setError(''); // Clear error when amount changes
                }}
                placeholder="Enter RLUSD amount"
                max={accountInfo?.rlusd_balance || '0'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 mt-1">
                Available: {parseFloat(accountInfo?.rlusd_balance || '0').toFixed(2)} RLUSD
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Network
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowNetworks(!showNetworks)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isProcessing}
                >
                  {destinationNetwork ? 
                    networks.find(n => n.id === destinationNetwork)?.name || 'Select destination network' :
                    'Select destination network'
                  }
                </button>
                {showNetworks && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                    {networks.map((network) => (
                      <button
                        key={network.id}
                        onClick={() => {
                          setDestinationNetwork(network.id);
                          setShowNetworks(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                      >
                        {network.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Address
              </label>
              <input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="Enter destination wallet address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isProcessing}
              />
            </div>

            {rlusdAmount && destinationNetwork && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Transaction Summary</h3>
                <div className="flex items-center justify-between text-sm">
                  <span>From: {parseFloat(rlusdAmount).toFixed(2)} RLUSD (XRPL)</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span>To: ~{(parseFloat(rlusdAmount) * 0.998).toFixed(2)} USDC ({networks.find(n => n.id === destinationNetwork)?.token})</span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              onClick={startCrossChain}
              disabled={isProcessing || !rlusdAmount || !destinationNetwork || !destinationAddress || parseFloat(accountInfo?.rlusd_balance || '0') === 0}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Start CrossChain Transaction</span>
              )}
            </button>
          </div>
        </div>

        {/* Progress Tracking */}
        {(isProcessing || transactionResult) && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
            <div className="flex items-center space-x-2 mb-4">
              {transactionResult ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              )}
              <h3 className="text-lg font-semibold text-gray-900">Transaction Progress</h3>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <p className="text-center text-gray-600 mb-4">
              {currentStep}
            </p>
            <p className="text-center text-sm text-gray-500">
              {progress}% Complete
            </p>

            {transactionResult && (
              <div className="mt-6 bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3">Transaction Details:</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Original Amount:</strong> {transactionResult.original_amount} RLUSD</div>
                  <div><strong>Converted Amount:</strong> {transactionResult.converted_amount} USDC</div>
                  <div><strong>Destination Network:</strong> {networks.find(n => n.id === transactionResult.destination_network)?.name}</div>
                  <div><strong>Destination Address:</strong> {transactionResult.destination_address}</div>
                  <div><strong>XRPL Transaction:</strong> {transactionResult.xrpl_transaction}</div>
                  <div><strong>Convert Order ID:</strong> {transactionResult.convert_order_id}</div>
                  <div><strong>Withdraw Order ID:</strong> {transactionResult.withdraw_order_id}</div>
                </div>
                
                <button
                  onClick={() => {
                    setTransactionResult(null);
                    setProgress(0);
                    setCurrentStep('');
                    setRlusdAmount('');
                    setDestinationAddress('');
                  }}
                  className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Start New Transaction
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;