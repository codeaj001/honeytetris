import React from 'react';
import WalletContextProvider from './components/WalletProvider';
import ChainTetris from './components/ChainTetris';
import './App.css';

function App() {
  return (
    <WalletContextProvider>
      <div className="App">
        <ChainTetris />
      </div>
    </WalletContextProvider>
  );
}

export default App;
