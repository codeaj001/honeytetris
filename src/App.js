import React from 'react';
import WalletContextProvider from './components/WalletProvider';
import ChainTetris from './components/ChainTetris';
import ErrorBoundary from './components/ErrorBoundary'
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <WalletContextProvider>
        <div className="App">
          <ChainTetris />
        </div>
      </WalletContextProvider>
    </ErrorBoundary>
  );
}

export default App;
