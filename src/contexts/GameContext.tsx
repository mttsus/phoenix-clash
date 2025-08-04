
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

export interface HexTile {
  q: number;
  r: number;
  s: number;
  type: 'castle' | 'forest' | 'mountain' | 'plain' | 'mine' | 'chest';
  owner?: string;
  army?: ArmyUnit[];
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
}

const initialState: GameState = {
  resources: {
    wood: 5000,
    gold: 5000,
    iron: 5000,
    wheat: 5000,
    stone: 5000
  },
  productionRate: 1500, // saatte 1500 her kaynak
  isRestructuringMode: false,
  consecutiveLosses: 0,
  army: [],
  hexTiles: [],
  selectedTile: null,
  lastUpdate: Date.now()
};

type GameAction = 
  | { type: 'UPDATE_RESOURCES'; payload: Partial<Resources> }
  | { type: 'PRODUCE_RESOURCES' }
  | { type: 'CREATE_ARMY_UNIT'; payload: ArmyUnit }
  | { type: 'SELECT_TILE'; payload: HexTile | null }
  | { type: 'BATTLE_RESULT'; payload: { won: boolean } }
  | { type: 'ENTER_RESTRUCTURING_MODE' }
  | { type: 'EXIT_RESTRUCTURING_MODE' };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
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
      // Ordu oluşturma maliyeti: 500 her kaynak
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
