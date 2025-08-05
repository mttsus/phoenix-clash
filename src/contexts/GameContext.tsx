import { createContext, useContext, useReducer, ReactNode } from 'react';

export interface Resources {
  wood: number;
  gold: number;
  iron: number;
  wheat: number;
  stone: number;
}

export interface ArmyUnit {
  id: string;
  type: 'swordsman' | 'archer' | 'cavalry' | 'mage_fire' | 'mage_ice' | 'mage_lightning';
  count: number;
  damage: number;
  health: number;
}

export interface BattleUnit {
  id: string;
  type: 'swordsman' | 'archer' | 'cavalry' | 'mage_fire' | 'mage_ice' | 'mage_lightning';
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  damage: number;
  team: 'player' | 'enemy';
  target?: { x: number; y: number };
  isMoving: boolean;
  isAttacking: boolean;
}

export interface HexTile {
  q: number;
  r: number;
  s: number;
  type: 'castle' | 'forest' | 'mountain' | 'plain' | 'mine' | 'chest';
  owner?: string;
  army?: ArmyUnit[];
}

export interface BattleState {
  inBattle: boolean;
  battleType?: 'pvp' | 'resource';
  enemy?: {
    id: string;
    user_id: string;
    username: string;
    q: number;
    r: number;
    s: number;
  };
  resourceRegion?: {
    id: string;
    q: number;
    r: number;
    s: number;
    resource_type: string;
    boss_health: number;
    max_boss_health: number;
    production_bonus: number;
  };
  playerArmy: ArmyUnit[];
  battleUnits: BattleUnit[];
  playerMana: number;
  maxMana: number;
  enemyHealth: number;
  maxEnemyHealth: number;
}

export interface GameState {
  resources: Resources;
  productionRate: number;
  isRestructuringMode: boolean;
  consecutiveLosses: number;
  army: ArmyUnit[];
  hexTiles: HexTile[];
  selectedTile: HexTile | null;
  lastUpdate: number;
  battleState: BattleState;
}

const initialState: GameState = {
  resources: {
    wood: 0,
    gold: 0,
    iron: 0,
    wheat: 0,
    stone: 0
  },
  productionRate: 1500,
  isRestructuringMode: false,
  consecutiveLosses: 0,
  army: [],
  hexTiles: [],
  selectedTile: null,
  lastUpdate: Date.now(),
  battleState: {
    inBattle: false,
    playerArmy: [],
    battleUnits: [],
    playerMana: 10,
    maxMana: 10,
    enemyHealth: 0,
    maxEnemyHealth: 0
  }
};

type GameAction = 
  | { type: 'SET_RESOURCES'; payload: Resources }
  | { type: 'UPDATE_RESOURCES'; payload: Partial<Resources> }
  | { type: 'PRODUCE_RESOURCES' }
  | { type: 'CREATE_ARMY_UNIT'; payload: ArmyUnit }
  | { type: 'SELECT_TILE'; payload: HexTile | null }
  | { type: 'SET_HEX_TILES'; payload: HexTile[] }
  | { type: 'BATTLE_RESULT'; payload: { won: boolean } }
  | { type: 'ENTER_RESTRUCTURING_MODE' }
  | { type: 'EXIT_RESTRUCTURING_MODE' }
  | { type: 'START_BATTLE'; payload: { enemy?: any; resourceRegion?: any; playerArmy: ArmyUnit[]; battleType: 'pvp' | 'resource' } }
  | { type: 'END_BATTLE' }
  | { type: 'DEPLOY_UNIT'; payload: { unitType: string; x: number; y: number } }
  | { type: 'UPDATE_BATTLE_UNITS'; payload: BattleUnit[] }
  | { type: 'UPDATE_MANA'; payload: number }
  | { type: 'UPDATE_ENEMY_HEALTH'; payload: number };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_RESOURCES':
      return {
        ...state,
        resources: action.payload
      };

    case 'UPDATE_RESOURCES':
      return {
        ...state,
        resources: { ...state.resources, ...action.payload }
      };
    
    case 'PRODUCE_RESOURCES':
      const now = Date.now();
      const hoursPassed = (now - state.lastUpdate) / (1000 * 60 * 60);
      const productionMultiplier = state.isRestructuringMode ? 1.5 : 1;
      
      const baseProduction = state.productionRate * hoursPassed * productionMultiplier;
      
      return {
        ...state,
        resources: {
          wood: Math.min(36000, state.resources.wood + baseProduction),
          gold: Math.min(36000, state.resources.gold + baseProduction),
          iron: Math.min(36000, state.resources.iron + baseProduction),
          wheat: Math.min(36000, state.resources.wheat + baseProduction),
          stone: Math.min(36000, state.resources.stone + baseProduction)
        },
        lastUpdate: now
      };
    
    case 'CREATE_ARMY_UNIT':
      const cost = 500;
      if (Object.values(state.resources).every(resource => resource >= cost)) {
        return {
          ...state,
          resources: {
            wood: state.resources.wood - cost,
            gold: state.resources.gold - cost,
            iron: state.resources.iron - cost,
            wheat: state.resources.wheat - cost,
            stone: state.resources.stone - cost
          },
          army: [...state.army, action.payload]
        };
      }
      return state;
    
    case 'SELECT_TILE':
      return { ...state, selectedTile: action.payload };
    
    case 'SET_HEX_TILES':
      return {
        ...state,
        hexTiles: action.payload
      };
    
    case 'START_BATTLE':
      const enemyHealth = action.payload.battleType === 'resource' 
        ? action.payload.resourceRegion?.boss_health || 1000
        : 5000; // Kale canı
      
      return {
        ...state,
        battleState: {
          inBattle: true,
          battleType: action.payload.battleType,
          enemy: action.payload.enemy,
          resourceRegion: action.payload.resourceRegion,
          playerArmy: action.payload.playerArmy,
          battleUnits: [],
          playerMana: 10,
          maxMana: 10,
          enemyHealth: enemyHealth,
          maxEnemyHealth: enemyHealth
        }
      };
    
    case 'END_BATTLE':
      return {
        ...state,
        battleState: {
          inBattle: false,
          playerArmy: [],
          battleUnits: [],
          playerMana: 10,
          maxMana: 10,
          enemyHealth: 0,
          maxEnemyHealth: 0
        }
      };
    
    case 'DEPLOY_UNIT':
      return {
        ...state,
        battleState: {
          ...state.battleState,
          playerMana: Math.max(0, state.battleState.playerMana - 1)
        }
      };
    
    case 'UPDATE_BATTLE_UNITS':
      return {
        ...state,
        battleState: {
          ...state.battleState,
          battleUnits: action.payload
        }
      };
    
    case 'UPDATE_MANA':
      return {
        ...state,
        battleState: {
          ...state.battleState,
          playerMana: Math.min(state.battleState.maxMana, action.payload)
        }
      };
    
    case 'UPDATE_ENEMY_HEALTH':
      return {
        ...state,
        battleState: {
          ...state.battleState,
          enemyHealth: Math.max(0, action.payload)
        }
      };
    
    case 'BATTLE_RESULT':
      const newLosses = action.payload.won ? 0 : state.consecutiveLosses + 1;
      return {
        ...state,
        consecutiveLosses: newLosses,
        isRestructuringMode: newLosses >= 3
      };
    
    case 'ENTER_RESTRUCTURING_MODE':
      return { ...state, isRestructuringMode: true };
    
    case 'EXIT_RESTRUCTURING_MODE':
      return { ...state, isRestructuringMode: false, consecutiveLosses: 0 };
    
    default:
      return state;
  }
}

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};
