import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Play, Pause, RotateCw, Trophy, Target, Zap, Wallet, Loader, AlertCircle } from 'lucide-react';
import { honeycombClient } from '../utils/realHoneycomb';
import { MISSIONS, TRAITS } from '../utils/honeycomb';

// Tetris pieces (same as before)
const PIECES = {
    I: { shape: [[1, 1, 1, 1]], color: '#00f5ff' },
    O: { shape: [[1, 1], [1, 1]], color: '#ffff00' },
    T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#800080' },
    S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00ff00' },
    Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ff0000' },
    J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000ff' },
    L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#ff7f00' }
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const EMPTY_BOARD = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));

const createPiece = () => {
    const types = Object.keys(PIECES);
    const type = types[Math.floor(Math.random() * types.length)];
    return {
        type,
        shape: PIECES[type].shape,
        color: PIECES[type].color,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(PIECES[type].shape[0].length / 2),
        y: 0
    };
};

const ChainTetris = () => {
    // Wallet and connection
    const { publicKey, connected, wallet } = useWallet();
    const { connection } = useConnection();
    
    // Game state
    const [board, setBoard] = useState(EMPTY_BOARD);
    const [currentPiece, setCurrentPiece] = useState(createPiece());
    const [nextPiece, setNextPiece] = useState(createPiece());
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    // Honeycomb state
    const [honeycombInitialized, setHoneycombInitialized] = useState(false);
    const [playerProfile, setPlayerProfile] = useState(null);
    const [playerTraits, setPlayerTraits] = useState([]);
    const [playerMissions, setPlayerMissions] = useState([]);
    const [isLoadingHoneycomb, setIsLoadingHoneycomb] = useState(false);
    const [honeycombError, setHoneycombError] = useState(null);
    const [gameStats, setGameStats] = useState({
        totalLines: 0,
        tetrisCount: 0,
        gameScore: 0,
        gameLevel: 0
    });

    const gameRef = useRef();
    const dropTimeRef = useRef(1000);

    // Initialize Honeycomb when wallet connects
    useEffect(() => {
        const initHoneycomb = async () => {
            if (!connected || !publicKey || !wallet) return;
            
            setIsLoadingHoneycomb(true);
            setHoneycombError(null);
            
            try {
                console.log('🍯 Initializing Honeycomb for wallet:', publicKey.toString());
                
                // Initialize Honeycomb client
                await honeycombClient.initialize(wallet.adapter);
                
                // Create or get player profile
                const profile = await honeycombClient.getOrCreatePlayerProfile(publicKey);
                setPlayerProfile(profile);
                
                // Initialize missions
                const missions = await honeycombClient.initializeMissions();
                setPlayerMissions(missions);
                
                // Get traits for UI
                const traits = honeycombClient.getTraitsForUI();
                setPlayerTraits(traits);
                
                setHoneycombInitialized(true);
                console.log('✅ Honeycomb initialized successfully');
            } catch (error) {
                console.error('❌ Honeycomb initialization failed:', error);
                setHoneycombError(error.message);
            } finally {
                setIsLoadingHoneycomb(false);
            }
        };

        initHoneycomb();
    }, [connected, publicKey, wallet]);

    // Collision detection (same as before)
    const isValidMove = useCallback((piece, board, deltaX = 0, deltaY = 0, newShape = null) => {
        const shape = newShape || piece.shape;
        const newX = piece.x + deltaX;
        const newY = piece.y + deltaY;

        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const boardX = newX + col;
                    const boardY = newY + row;
                    
                    if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
                        return false;
                    }
                    if (boardY >= 0 && board[boardY][boardX]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }, []);

    // Rotate piece (same as before)
    const rotatePiece = useCallback((piece) => {
        const rotated = piece.shape[0].map((_, index) =>
            piece.shape.map(row => row[index]).reverse()
        );
        return rotated;
    }, []);

    // Clear completed lines (same as before)
    const clearLines = useCallback((board) => {
        let linesCleared = 0;
        let newBoard = board.filter(row => {
            if (row.every(cell => cell !== 0)) {
                linesCleared++;
                return false;
            }
            return true;
        });

        while (newBoard.length < BOARD_HEIGHT) {
            newBoard.unshift(Array(BOARD_WIDTH).fill(0));
        }

        return { newBoard, linesCleared };
    }, []);

    // Update Honeycomb progress - REAL IMPLEMENTATION
    const updateHoneycombProgress = useCallback(async (linesCleared, currentScore, currentLevel) => {
        if (!honeycombInitialized || !connected) return;

        try {
            // Track Tetris (4-line clears)
            const tetrisBonus = linesCleared === 4 ? 1 : 0;
            
            // Update game stats
            setGameStats(prev => ({
                totalLines: lines + linesCleared,
                tetrisCount: prev.tetrisCount + tetrisBonus,
                gameScore: currentScore,
                gameLevel: currentLevel
            }));

            // Update missions in real-time during gameplay
            const missions = honeycombClient.getMissions();
            const updatedMissions = [];

            for (const mission of missions) {
                let progress = mission.progress;
                
                // Update progress based on mission type
                switch (mission.id) {
                    case 'daily_lines_10':
                        progress = lines + linesCleared;
                        break;
                    case 'high_score_5000':
                        progress = currentScore;
                        break;
                    case 'level_master_5':
                        progress = currentLevel;
                        break;
                    case 'tetris_master':
                        progress = gameStats.tetrisCount + tetrisBonus;
                        break;
                }

                // Update mission progress
                if (progress > mission.progress) {
                    await honeycombClient.updateMissionProgress(mission.id, progress, {
                        score: currentScore,
                        level: currentLevel,
                        totalLines: lines + linesCleared
                    });
                }
                
                updatedMissions.push({
                    ...mission,
                    progress: Math.min(progress, mission.target)
                });
            }

            // Update UI state
            setPlayerMissions(updatedMissions);
            setPlayerTraits(honeycombClient.getTraitsForUI());
            
        } catch (error) {
            console.error('❌ Failed to update Honeycomb progress:', error);
        }
    }, [honeycombInitialized, connected, lines, gameStats]);

    // Place piece on board (same as before)
    const placePiece = useCallback((piece, board) => {
        const newBoard = board.map(row => [...row]);
        
        piece.shape.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell) {
                    const boardY = piece.y + rowIndex;
                    const boardX = piece.x + colIndex;
                    if (boardY >= 0) {
                        newBoard[boardY][boardX] = piece.color;
                    }
                }
            });
        });

        return newBoard;
    }, []);

    // Drop piece with Honeycomb integration
    const dropPiece = useCallback(() => {
        if (gameOver || isPaused || !isPlaying) return;

        setCurrentPiece(prevPiece => {
            if (isValidMove(prevPiece, board, 0, 1)) {
                return { ...prevPiece, y: prevPiece.y + 1 };
            } else {
                // Place piece and create new one
                const newBoard = placePiece(prevPiece, board);
                const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
                
                const newScore = score + (linesCleared * 100 * level) + (linesCleared === 4 ? 800 : 0);
                const newLines = lines + linesCleared;
                const newLevel = Math.floor(newLines / 10) + 1;
                
                setBoard(clearedBoard);
                setScore(newScore);
                setLines(newLines);
                setLevel(newLevel);
                
                // Update Honeycomb progress
                updateHoneycombProgress(linesCleared, newScore, newLevel);
                
                // Check game over
                const newPiece = nextPiece;
                if (!isValidMove(newPiece, clearedBoard)) {
                    setGameOver(true);
                    setIsPlaying(false);
                    return prevPiece;
                }

                setNextPiece(createPiece());
                return newPiece;
            }
        });
    }, [board, gameOver, isPaused, isPlaying, isValidMove, placePiece, clearLines, score, lines, level, nextPiece, updateHoneycombProgress]);

    // Game loop (same as before)
    useEffect(() => {
        if (!isPlaying || isPaused || gameOver) return;

        dropTimeRef.current = Math.max(50, 1000 - (level - 1) * 50);
        
        const gameLoop = setInterval(() => {
            dropPiece();
        }, dropTimeRef.current);

        return () => clearInterval(gameLoop);
    }, [dropPiece, isPlaying, isPaused, gameOver, level]);

    // Handle keyboard input (same as before)
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (!isPlaying || isPaused || gameOver) return;

            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    setCurrentPiece(prev => 
                        isValidMove(prev, board, -1, 0) ? { ...prev, x: prev.x - 1 } : prev
                    );
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    setCurrentPiece(prev => 
                        isValidMove(prev, board, 1, 0) ? { ...prev, x: prev.x + 1 } : prev
                    );
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    dropPiece();
                    break;
                case 'ArrowUp':
                case ' ':
                    e.preventDefault();
                    setCurrentPiece(prev => {
                        const rotated = rotatePiece(prev);
                        return isValidMove(prev, board, 0, 0, rotated) 
                            ? { ...prev, shape: rotated }
                            : prev;
                    });
                    break;
                case 'p':
                case 'P':
                    setIsPaused(prev => !prev);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isPlaying, isPaused, gameOver, board, isValidMove, dropPiece, rotatePiece]);

    // Render game board (same as before)
    const renderBoard = () => {
        const displayBoard = board.map(row => [...row]);
        
        if (currentPiece && !gameOver) {
            currentPiece.shape.forEach((row, rowIndex) => {
                row.forEach((cell, colIndex) => {
                    if (cell) {
                        const boardY = currentPiece.y + rowIndex;
                        const boardX = currentPiece.x + colIndex;
                        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                            displayBoard[boardY][boardX] = currentPiece.color;
                        }
                    }
                });
            });
        }

        return displayBoard.map((row, rowIndex) => (
            <div key={rowIndex} className="flex">
                {row.map((cell, colIndex) => (
                    <div
                        key={`${rowIndex}-${colIndex}`}
                        className="w-6 h-6 border border-gray-700 flex-shrink-0"
                        style={{
                            backgroundColor: cell || '#1a1a1a'
                        }}
                    />
                ))}
            </div>
        ));
    };

    const startGame = () => {
        setBoard(EMPTY_BOARD);
        setCurrentPiece(createPiece());
        setNextPiece(createPiece());
        setScore(0);
        setLines(0);
        setLevel(1);
        setGameOver(false);
        setIsPaused(false);
        setIsPlaying(true);
    };

    const togglePause = () => {
        if (isPlaying && !gameOver) {
            setIsPaused(prev => !prev);
        }
    };

    // Wallet connection UI
    if (!connected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="mb-8">
                        <Wallet size={64} className="mx-auto mb-4 text-purple-400" />
                        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                            Chain Tetris
                        </h1>
                        <p className="text-gray-300 mb-6">
                            Connect your wallet to start playing and earning on-chain achievements with Honeycomb Protocol
                        </p>
                    </div>
                    
                    <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 hover:!from-purple-700 hover:!to-blue-700 !rounded-lg !px-8 !py-3 !font-semibold !transition-all" />
                    
                    <div className="mt-8 text-sm text-gray-400">
                        <p>✨ Persistent progression across games</p>
                        <p>🏆 On-chain achievements and traits</p>
                        <p>🎯 Complete missions to level up</p>
                    </div>
                </div>
            </div>
        );
    }

    // Loading Honeycomb
    if (isLoadingHoneycomb) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <Loader size={48} className="animate-spin mx-auto mb-4 text-purple-400" />
                    <h2 className="text-2xl font-bold mb-2">Initializing Honeycomb Protocol</h2>
                    <p className="text-gray-300">Setting up your on-chain gaming profile...                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header with wallet info */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                            Chain Tetris
                        </h1>
                        <p className="text-gray-300">Powered by Honeycomb Protocol</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                            {/* <p className="text-gray-400">Connected as:</p>
                            <p className="font-mono text-xs text-purple-400">
                                {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
                            </p> */}
                        </div>
                        <WalletMultiButton className="!bg-gradient-to-r !from-purple-600/50 !to-blue-600/50 hover:!from-purple-700/50 hover:!to-blue-700/50" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Game Board */}
                    <div className="lg:col-span-2 flex flex-col items-center">
                        <div className="bg-black/50 p-4 rounded-lg border border-purple-500/30 backdrop-blur">
                            <div className="flex flex-col">
                                {renderBoard()}
                            </div>
                            
                            {/* Game Controls */}
                            <div className="flex justify-center gap-4 mt-4">
                                {!isPlaying ? (
                                    <button
                                        onClick={startGame}
                                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition-colors"
                                    >
                                        <Play size={20} />
                                        Start Game
                                    </button>
                                ) : (
                                    <button
                                        onClick={togglePause}
                                        className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-6 py-3 rounded-lg font-semibold transition-colors"
                                    >
                                        {isPaused ? <Play size={20} /> : <Pause size={20} />}
                                        {isPaused ? 'Resume' : 'Pause'}
                                    </button>
                                )}
                            </div>

                            {gameOver && (
                                <div className="text-center mt-4 p-4 bg-red-900/50 rounded-lg">
                                    <h3 className="text-xl font-bold mb-2">Game Over!</h3>
                                    <p>Final Score: {score.toLocaleString()}</p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Progress saved to Honeycomb Protocol ✓
                                    </p>
                                    <button
                                        onClick={startGame}
                                        className="mt-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Play Again
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Mobile Controls */}
                        <div className="lg:hidden mt-4 grid grid-cols-3 gap-2 max-w-sm">
                            <button 
                                className="bg-blue-600/50 p-3 rounded-lg"
                                onTouchStart={() => setCurrentPiece(prev => 
                                    isValidMove(prev, board, -1, 0) ? { ...prev, x: prev.x - 1 } : prev
                                )}
                            >
                                ←
                            </button>
                            <button 
                                className="bg-purple-600/50 p-3 rounded-lg"
                                onTouchStart={() => {
                                    setCurrentPiece(prev => {
                                        const rotated = rotatePiece(prev);
                                        return isValidMove(prev, board, 0, 0, rotated) 
                                            ? { ...prev, shape: rotated }
                                            : prev;
                                    });
                                }}
                            >
                                <RotateCw size={20} className="mx-auto" />
                            </button>
                            <button 
                                className="bg-blue-600/50 p-3 rounded-lg"
                                onTouchStart={() => setCurrentPiece(prev => 
                                    isValidMove(prev, board, 1, 0) ? { ...prev, x: prev.x + 1 } : prev
                                )}
                            >
                                →
                            </button>
                            <div></div>
                            <button 
                                className="bg-red-600/50 p-3 rounded-lg"
                                onTouchStart={dropPiece}
                            >
                                ↓
                            </button>
                            <div></div>
                        </div>
                    </div>

                                
                    

                    {/* Side Panel */}
                    <div className="space-y-6">
                        {/* Next Piece */}
                        <div className="bg-black/30 p-4 rounded-lg border border-blue-500/30">
                            <h3 className="text-lg font-bold mb-3 text-blue-400">Next Piece</h3>
                            <div className="flex justify-center">
                                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, 1fr)` }}>
                                    {nextPiece.shape.map((row, rowIndex) =>
                                        row.map((cell, colIndex) => (
                                            <div
                                                key={`${rowIndex}-${colIndex}`}
                                                className="w-4 h-4 border border-gray-600"
                                                style={{
                                                    backgroundColor: cell ? nextPiece.color : 'transparent'
                                                }}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Active Missions (Honeycomb) */}
                        <div className="bg-black/30 p-4 rounded-lg border border-green-500/30">
                            <h3 className="text-lg font-bold mb-3 text-green-400 flex items-center gap-2">
                                <Target size={20} />
                                Active Missions
                                {honeycombClient && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">ON-CHAIN</span>}
                            </h3>
                            <div className="space-y-3">
                                {Object.values(MISSIONS).map(mission => {
                                    const playerMission = Array.isArray(playerMissions)
                                        ? playerMissions.find(m => m.id === mission.id)
                                        : null;
                                    
                                    let progress = 0;
                                    let completed = false;
                                    
                                    if (mission.id === MISSIONS.CLEAR_LINES.id) {
                                        progress = lines;
                                    } else if (mission.id === MISSIONS.HIGH_SCORE.id) {
                                        progress = score;
                                    } else if (mission.id === MISSIONS.REACH_LEVEL.id) {
                                        progress = level;
                                    }
                                    
                                    completed = progress >= mission.target || playerMission?.completed;
                                    
                                    return (
                                        <div key={mission.id} className={`p-3 rounded-lg ${completed ? 'bg-green-900/30' : 'bg-gray-800/30'}`}>
                                            <div className="text-sm font-medium mb-1">{mission.description}</div>
                                            <div className="flex justify-between text-xs text-gray-400 mb-2">
                                                <span>{Math.min(progress, mission.target)}/{mission.target}</span>
                                                <span className="text-yellow-400">{mission.reward}</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-1.5">
                                                <div 
                                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                                        completed ? 'bg-green-500' : 'bg-blue-500'
                                                    }`}
                                                    style={{ width: `${Math.min((progress / mission.target) * 100, 100)}%` }}
                                                />
                                            </div>
                                            {completed && (
                                                <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                                    <Zap size={12} />
                                                    Mission Complete!
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Game Stats */}
                        <div className="bg-black/30 p-4 rounded-lg border border-cyan-500/30">
                            <h3 className="text-lg font-bold mb-3 text-cyan-400">Game Stats</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Score:</span>
                                    <span className="font-bold">{score.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Lines:</span>
                                    <span className="font-bold">{lines}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Level:</span>
                                    <span className="font-bold">{level}</span>
                                </div>
                            </div>
                        </div>

                        {/* Player Traits (Honeycomb) */}
                        <div className="bg-black/30 p-4 rounded-lg border border-purple-500/30">
                            <h3 className="text-lg font-bold mb-3 text-purple-400 flex items-center gap-2">
                                <Trophy size={20} />
                                Player Traits
                                {honeycombClient && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">ON-CHAIN</span>}
                            </h3>
                            <div className="space-y-3">
                                {Object.values(TRAITS).map(trait => {
                                    const playerTrait = Array.isArray(playerTraits) 
                                        ? playerTraits.find(t => t.id === trait.id)
                                        : null;
                                    
                                    const level = playerTrait?.level || 1;
                                    const xp = playerTrait?.xp || 0;
                                    const progress = Math.min((xp % 100) / 100 * 100, 100);
                                    
                                    return (
                                        <div key={trait.id}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>{trait.name}</span>
                                                <span>Lv.{level}</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                                <div 
                                                    className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {trait.description}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        


                        {/* Honeycomb Status */}
                        <div className="bg-black/30 p-4 rounded-lg border border-yellow-500/30">
                            <h3 className="text-lg font-bold mb-3 text-yellow-400">Blockchain Status</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Network:</span>
                                    <span className="text-purple-400">Devnet</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Honeycomb:</span>
                                    <span className={honeycombClient ? 'text-green-400' : 'text-red-400'}>
                                        {honeycombClient ? 'Connected' : 'Disconnected'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Profile:</span>
                                    <span className={playerProfile ? 'text-green-400' : 'text-gray-400'}>
                                        {playerProfile ? 'Active' : 'Loading...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 text-center text-sm text-gray-400">
                    <p className="mb-2">Desktop: Use arrow keys to move, up arrow or space to rotate, P to pause</p>
                    <p className="mb-2">Mobile: Use the on-screen controls</p>
                    <p className="text-purple-400">🍯 Your progress is automatically saved to Honeycomb Protocol!</p>
                </div>
            </div>
        </div>
    );
};

export default ChainTetris;
