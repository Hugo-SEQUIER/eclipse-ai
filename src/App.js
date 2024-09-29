import React, { useEffect, useState, useMemo } from 'react';
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import './App.css';
import ChatBot from './ChatBot.js';
import { AnchorProvider, Program, web3 } from '@project-serum/anchor';
import idl from './idl.json'; // Import the IDL

require('@solana/wallet-adapter-react-ui/styles.css');

function App() {
  const network = 'https://staging-rpc.dev2.eclipsenetwork.xyz'; // Use Devnet for testing
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={network}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="App">
            <ChatBot />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

const SignAccess = () => {
  const { publicKey, sendTransaction, wallet, connected } = useWallet();
  const { connection } = useConnection();
  const [signing, setSigning] = useState(false);
  const [signature, setSignature] = useState(null);
  const [error, setError] = useState(null);

  const handleSignAccess = async () => {
    if (!publicKey) {
      setError('Wallet not connected');
      return;
    }

    setSigning(true);
    setError(null);

    try {
      console.log('Signing access for user:', publicKey.toBase58());

      const programId = new web3.PublicKey(idl.address);
      console.log('Program ID:', programId.toBase58());

      const provider = new AnchorProvider(connection, wallet, {
        preflightCommitment: "processed",
      });
      const program = new Program(idl, programId, provider);

      const transaction = await program.methods.signAccess()
        .accounts({
          user: publicKey,
        })
        .transaction();

      console.log('Transaction constructed:', transaction);

      const txSignature = await sendTransaction(transaction, connection);
      console.log('Transaction signature:', txSignature);

      const confirmation = await connection.confirmTransaction(txSignature, "confirmed");
      console.log('Transaction confirmation:', confirmation);

      if (confirmation.value.err) {
        throw new Error('Transaction failed during confirmation');
      }

      setSignature(txSignature);
      console.log('Contract signed successfully:', txSignature);
    } catch (err) {
      console.error('Error signing contract:', err);
      if (err.message.includes('Blockhash not found')) {
        setError('Transaction failed: Blockhash not found. Please try again.');
      } else if (err.message.includes('User rejected the request')) {
        setError('Transaction was rejected by the user.');
      } else {
        setError(err.message);
      }
    } finally {
      setSigning(false);
    }
  };

  return (
    <div>
      <button onClick={handleSignAccess} disabled={signing || !connected}>
        {signing ? 'Signing...' : 'Sign Access Contract'}
      </button>
      {signature && <p>Contract signed! Signature: {signature}</p>}
      {error && <p style={{ color: 'red' }}>Error signing contract: {error}</p>}
    </div>
  );
};

export default App;