import { HoneycombClient } from '@honeycomb-protocol/edge-client';
import { Connection, PublicKey } from '@solana/web3.js';

// Honeycomb configuration
export const HONEYCOMB_CONFIG = {
    // Replace with your actual project ID from Honeycomb Dashboard
    projectId: "your-project-id-here",
    
    // Devnet endpoint
    rpcUrl: "https://api.devnet.solana.com",
    
    // For production, use mainnet
    // rpcUrl: "https://api.mainnet-beta.solana.com",
};

// Initialize Honeycomb client
export const initializeHoneycomb = async (wallet) => {
    try {
        const connection = new Connection(HONEYCOMB_CONFIG.rpcUrl, 'confirmed');
        
        const client = new HoneycombClient({
            connection,
            wallet,
            projectId: HONEYCOMB_CONFIG.projectId,
        });
        
        return client;
    } catch (error) {
        console.error('Failed to initialize Honeycomb client:', error);
        throw error;
    }
};

// Mission definitions
export const MISSIONS = {
    CLEAR_LINES: {
        id: 'clear_10_lines',
        name: 'Line Clearer',
        description: 'Clear 10 lines in total',
        target: 10,
        reward: 'Speed Demon XP'
    },
    HIGH_SCORE: {
        id: 'score_5000',
        name: 'Score Master', 
        description: 'Score 5000 points in a single game',
        target: 5000,
        reward: 'Line Clearer XP'
    },
    REACH_LEVEL: {
        id: 'reach_level_5',
        name: 'Level Up',
        description: 'Reach level 5 in a single game',
        target: 5,
        reward: 'New Block Theme'
    }
};

// Trait definitions
export const TRAITS = {
    SPEED_DEMON: {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Master of fast gameplay'
    },
    LINE_CLEARER: {
        id: 'line_clearer', 
        name: 'Line Clearer',
        description: 'Expert at clearing lines'
    },
    PERFECTIONIST: {
        id: 'perfectionist',
        name: 'Perfectionist',
        description: 'Precision and accuracy master'
    }
};

// Create or update player profile
export const createPlayerProfile = async (honeycombClient, walletPublicKey) => {
    try {
        // Check if profile exists
        const existingProfile = await honeycombClient.getProfile(walletPublicKey);
        
        if (existingProfile) {
            return existingProfile;
        }
        
        // Create new profile with initial traits
        const profile = await honeycombClient.createProfile({
            owner: walletPublicKey,
            traits: Object.values(TRAITS).map(trait => ({
                ...trait,
                level: 1,
                xp: 0
            }))
        });
        
        return profile;
    } catch (error) {
        console.error('Error creating player profile:', error);
        throw error;
    }
};

// Create missions for player
export const createMissions = async (honeycombClient, walletPublicKey) => {
    try {
        const missions = [];
        
        for (const mission of Object.values(MISSIONS)) {
            try {
                const createdMission = await honeycombClient.createMission({
                    id: mission.id,
                    name: mission.name,
                    description: mission.description,
                    target: mission.target,
                    player: walletPublicKey
                });
                missions.push(createdMission);
            } catch (error) {
                // Mission might already exist
                console.log(`Mission ${mission.id} might already exist:`, error.message);
            }
        }
        
        return missions;
    } catch (error) {
        console.error('Error creating missions:', error);
        throw error;
    }
};

// Update mission progress
export const updateMissionProgress = async (honeycombClient, missionId, progress) => {
    try {
        const result = await honeycombClient.updateMissionProgress({
            missionId,
            progress
        });
        
        return result;
    } catch (error) {
        console.error('Error updating mission progress:', error);
        throw error;
    }
};

// Complete mission and award XP
export const completeMission = async (honeycombClient, missionId, traitId, xpReward = 100) => {
    try {
        // Complete the mission
        await honeycombClient.completeMission(missionId);
        
        // Award XP to trait
        const result = await honeycombClient.addTraitXP({
            traitId,
            xp: xpReward
        });
        
        return result;
    } catch (error) {
        console.error('Error completing mission:', error);
        throw error;
    }
};

// Get player stats
export const getPlayerStats = async (honeycombClient, walletPublicKey) => {
    try {
        const profile = await honeycombClient.getProfile(walletPublicKey);
        const missions = await honeycombClient.getPlayerMissions(walletPublicKey);
        
        return {
            profile,
            missions,
            traits: profile?.traits || []
        };
    } catch (error) {
        console.error('Error getting player stats:', error);
        return {
            profile: null,
            missions: [],
            traits: []
        };
    }
};