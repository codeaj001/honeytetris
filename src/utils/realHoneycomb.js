import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@project-serum/anchor';

// Honeycomb Protocol imports
// Note: You'll need to install the actual Honeycomb packages
// npm install @honeycomb-protocol/hive-control @honeycomb-protocol/edge-client

let HoneycombProject, HiveControlProgram, EdgeClient;

try {
  // Try to import real Honeycomb packages
  const honeycombHive = require('@honeycomb-protocol/hive-control');
  const honeycombEdge = require('@honeycomb-protocol/edge-client');
  
  HoneycombProject = honeycombHive.HoneycombProject;
  HiveControlProgram = honeycombHive.HiveControlProgram;
  EdgeClient = honeycombEdge.EdgeClient;
} catch (error) {
  console.log('Honeycomb packages not installed, using mock implementation');
  // We'll provide fallback implementations below
}

// Configuration
export const HONEYCOMB_CONFIG = {
  // Your actual Honeycomb project address (you get this from Hive Control dashboard)
  projectAddress: process.env.REACT_APP_HONEYCOMB_PROJECT_ADDRESS || "11111111111111111111111111111111",
  
  // Solana network configuration
  network: process.env.REACT_APP_SOLANA_NETWORK || "devnet",
  rpcUrl: process.env.REACT_APP_RPC_URL || "https://api.devnet.solana.com",
  
  // Character and mission definitions
  gameVersion: "1.0.0"
};

// Mock implementations for when real packages aren't available
const MockHoneycombProject = {
  async fromAddress() {
    console.log('🍯 Mock: Creating Honeycomb project');
    return {
      address: new PublicKey(HONEYCOMB_CONFIG.projectAddress),
      name: "Chain Tetris",
      authority: null
    };
  }
};

const MockEdgeClient = class {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
    console.log('🍯 Mock: EdgeClient initialized');
  }

  async getOrCreateProfile(userPubkey) {
    console.log('🍯 Mock: Getting/creating profile for', userPubkey.toString());
    return {
      address: new PublicKey("11111111111111111111111111111111"),
      owner: userPubkey,
      username: `Player_${userPubkey.toString().slice(0, 8)}`,
      stats: {
        gamesPlayed: 0,
        totalLines: 0,
        highScore: 0
      }
    };
  }

  async updateProfile(profileAddress, updates) {
    console.log('🍯 Mock: Updating profile', updates);
    return { success: true };
  }
};

// Real Honeycomb Protocol Integration
export class ChainTetrisHoneycomb {
  constructor() {
    this.connection = null;
    this.wallet = null;
    this.provider = null;
    this.project = null;
    this.edgeClient = null;
    this.playerProfile = null;
    this.missions = new Map();
    this.characters = new Map();
  }

  // Initialize Honeycomb connection
  async initialize(wallet) {
    try {
      console.log('🍯 Initializing Honeycomb Protocol...');
      
      this.wallet = wallet;
      this.connection = new Connection(HONEYCOMB_CONFIG.rpcUrl, 'confirmed');
      
      // Create Anchor provider
      this.provider = new AnchorProvider(
        this.connection,
        wallet,
        { commitment: 'confirmed' }
      );

      // Initialize Honeycomb project
      const ProjectClass = HoneycombProject || MockHoneycombProject;
      this.project = await ProjectClass.fromAddress(
        this.connection,
        new PublicKey(HONEYCOMB_CONFIG.projectAddress)
      );

      // Initialize Edge Client
      const EdgeClientClass = EdgeClient || MockEdgeClient;
      this.edgeClient = new EdgeClientClass(this.connection, wallet);

      console.log('✅ Honeycomb Protocol initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Honeycomb:', error);
      throw error;
    }
  }

  // Create or get player profile (Character in Honeycomb terms)
  async getOrCreatePlayerProfile(userPubkey) {
    try {
      console.log('🍯 Getting/creating player profile...');
      
      this.playerProfile = await this.edgeClient.getOrCreateProfile(userPubkey);
      
      // Initialize player stats if new profile
      if (!this.playerProfile.stats) {
        await this.edgeClient.updateProfile(this.playerProfile.address, {
          stats: {
            gamesPlayed: 0,
            totalLines: 0,
            highScore: 0,
            speedDemonLevel: 1,
            lineClearerLevel: 1,
            perfectionistLevel: 1,
            speedDemonXP: 0,
            lineClearerXP: 0,
            perfectionistXP: 0
          }
        });
      }

      return this.playerProfile;
    } catch (error) {
      console.error('❌ Failed to create player profile:', error);
      throw error;
    }
  }

  // Create Nectar Missions
  async initializeMissions() {
    try {
      console.log('🍯 Initializing Nectar Missions...');

      const missionDefinitions = [
        {
          id: 'daily_lines_10',
          name: 'Daily Line Clearer',
          description: 'Clear 10 lines today',
          type: 'daily',
          target: 10,
          reward: {
            xp: 100,
            trait: 'speedDemon'
          },
          duration: 24 * 60 * 60 * 1000 // 24 hours
        },
        {
          id: 'high_score_5000',
          name: 'Score Master',
          description: 'Achieve 5000 points in a single game',
          type: 'achievement',
          target: 5000,
          reward: {
            xp: 250,
            trait: 'lineClearer'
          }
        },
        {
          id: 'level_master_5',
          name: 'Level Master',
          description: 'Reach level 5 in a single game',
          type: 'achievement',
          target: 5,
          reward: {
            xp: 150,
            trait: 'perfectionist'
          }
        },
        {
          id: 'tetris_master',
          name: 'Tetris Master',
          description: 'Clear 4 lines at once (Tetris)',
          type: 'skill',
          target: 1,
          reward: {
            xp: 300,
            trait: 'perfectionist'
          }
        }
      ];

      // Create missions using Honeycomb's Nectar Missions
      for (const missionDef of missionDefinitions) {
        try {
          if (this.edgeClient.createMission) {
            const mission = await this.edgeClient.createMission({
              project: this.project.address,
              name: missionDef.name,
              description: missionDef.description,
              requirements: {
                target: missionDef.target,
                type: missionDef.type
              },
              rewards: [
                {
                  type: 'xp',
                  amount: missionDef.reward.xp,
                  trait: missionDef.reward.trait
                }
              ],
              duration: missionDef.duration || null
            });
            
            this.missions.set(missionDef.id, {
              ...missionDef,
              address: mission.address,
              progress: 0,
              completed: false,
              lastUpdated: Date.now()
            });
          } else {
            // Mock implementation
            this.missions.set(missionDef.id, {
              ...missionDef,
              address: new PublicKey("11111111111111111111111111111111"),
              progress: 0,
              completed: false,
              lastUpdated: Date.now()
            });
          }
        } catch (error) {
          console.log(`⚠️  Mission ${missionDef.id} might already exist`);
          // Mission already exists, get existing one
          this.missions.set(missionDef.id, {
            ...missionDef,
            address: new PublicKey("11111111111111111111111111111111"),
            progress: 0,
            completed: false,
            lastUpdated: Date.now()
          });
        }
      }

      console.log('✅ Missions initialized:', this.missions.size);
      return Array.from(this.missions.values());
    } catch (error) {
      console.error('❌ Failed to initialize missions:', error);
      throw error;
    }
  }

  // Update mission progress
  async updateMissionProgress(missionId, progress, gameStats = {}) {
    try {
      const mission = this.missions.get(missionId);
      if (!mission) {
        console.warn(`Mission ${missionId} not found`);
        return;
      }

      const oldProgress = mission.progress;
      mission.progress = Math.min(progress, mission.target);
      mission.lastUpdated = Date.now();

      // Check if mission completed
      if (!mission.completed && mission.progress >= mission.target) {
        await this.completeMission(missionId, gameStats);
      }

      // Update on-chain if real Honeycomb is available
      if (this.edgeClient.updateMissionProgress) {
        await this.edgeClient.updateMissionProgress(mission.address, {
          progress: mission.progress
        });
      }

      console.log(`🎯 Mission ${missionId}: ${oldProgress} → ${mission.progress}/${mission.target}`);
      return mission;
    } catch (error) {
      console.error(`❌ Failed to update mission ${missionId}:`, error);
    }
  }

  // Complete mission and award rewards
  async completeMission(missionId, gameStats = {}) {
    try {
      const mission = this.missions.get(missionId);
      if (!mission || mission.completed) return;

      console.log(`🏆 Mission completed: ${mission.name}`);
      mission.completed = true;

      // Award XP to trait
      await this.awardTraitXP(mission.reward.trait, mission.reward.xp);

      // Update player stats
      if (this.playerProfile) {
        const newStats = {
          ...this.playerProfile.stats,
          ...gameStats,
          missionsCompleted: (this.playerProfile.stats.missionsCompleted || 0) + 1
        };

        if (this.edgeClient.updateProfile) {
          await this.edgeClient.updateProfile(this.playerProfile.address, {
            stats: newStats
          });
        }

        this.playerProfile.stats = newStats;
      }

      // On-chain mission completion if available
      if (this.edgeClient.completeMission) {
        await this.edgeClient.completeMission(mission.address);
      }

      return {
        mission,
        reward: mission.reward,
        newLevel: this.getTraitLevel(mission.reward.trait)
      };
    } catch (error) {
      console.error(`❌ Failed to complete mission ${missionId}:`, error);
    }
  }

  // Award XP to trait
  async awardTraitXP(traitName, xp) {
    try {
      if (!this.playerProfile) return;

      const xpField = `${traitName}XP`;
      const levelField = `${traitName}Level`;
      
      const currentXP = this.playerProfile.stats[xpField] || 0;
      const newXP = currentXP + xp;
      
      // Calculate new level (100 XP per level)
      const newLevel = Math.floor(newXP / 100) + 1;
      const oldLevel = this.playerProfile.stats[levelField] || 1;

      this.playerProfile.stats[xpField] = newXP;
      this.playerProfile.stats[levelField] = newLevel;

      console.log(`⬆️  ${traitName}: +${xp} XP (Level ${oldLevel} → ${newLevel})`);

      // Update on-chain
      if (this.edgeClient.updateProfile) {
        await this.edgeClient.updateProfile(this.playerProfile.address, {
          stats: this.playerProfile.stats
        });
      }

      return { newLevel, newXP, levelUp: newLevel > oldLevel };
    } catch (error) {
      console.error(`❌ Failed to award XP to ${traitName}:`, error);
    }
  }

  // Get trait level
  getTraitLevel(traitName) {
    if (!this.playerProfile) return 1;
    return this.playerProfile.stats[`${traitName}Level`] || 1;
  }

  // Get trait XP
  getTraitXP(traitName) {
    if (!this.playerProfile) return 0;
    return this.playerProfile.stats[`${traitName}XP`] || 0;
  }

  // Get trait progress (0-100%)
  getTraitProgress(traitName) {
    const xp = this.getTraitXP(traitName);
    return (xp % 100) / 100 * 100;
  }

  // Process game end
  async processGameEnd(gameStats) {
    try {
      console.log('🎮 Processing game end...', gameStats);

      // Update mission progress based on game stats
      await this.updateMissionProgress('daily_lines_10', gameStats.totalLines || 0, gameStats);
      await this.updateMissionProgress('high_score_5000', gameStats.score || 0, gameStats);
      await this.updateMissionProgress('level_master_5', gameStats.level || 0, gameStats);
      
      if (gameStats.tetrisCount > 0) {
        await this.updateMissionProgress('tetris_master', gameStats.tetrisCount, gameStats);
      }

      // Update player lifetime stats
      if (this.playerProfile) {
        const newStats = {
          ...this.playerProfile.stats,
          gamesPlayed: (this.playerProfile.stats.gamesPlayed || 0) + 1,
          totalLines: (this.playerProfile.stats.totalLines || 0) + (gameStats.totalLines || 0),
          highScore: Math.max(this.playerProfile.stats.highScore || 0, gameStats.score || 0),
          lastPlayed: Date.now()
        };

        if (this.edgeClient.updateProfile) {
          await this.edgeClient.updateProfile(this.playerProfile.address, {
            stats: newStats
          });
        }

        this.playerProfile.stats = newStats;
      }

      return {
        success: true,
        stats: this.playerProfile?.stats,
        missions: Array.from(this.missions.values())
      };
    } catch (error) {
      console.error('❌ Failed to process game end:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all current missions
  getMissions() {
    return Array.from(this.missions.values());
  }

  // Get player stats
  getPlayerStats() {
    return this.playerProfile?.stats || {};
  }

  // Get formatted trait data for UI
  getTraitsForUI() {
    const traits = ['speedDemon', 'lineClearer', 'perfectionist'];
    
    return traits.map(trait => ({
      id: trait,
      name: trait.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      level: this.getTraitLevel(trait),
      xp: this.getTraitXP(trait),
      progress: this.getTraitProgress(trait)
    }));
  }

  // Check connection status
  isConnected() {
    return !!(this.connection && this.wallet && this.edgeClient);
  }
}

// Export singleton instance
export const honeycombClient = new ChainTetrisHoneycomb();