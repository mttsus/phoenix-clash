import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HexGrid } from '@/components/game/HexGrid';
import { ResourcePanel } from '@/components/game/ResourcePanel';
import { ArmyPanel } from '@/components/game/ArmyPanel';
import { BattleArena } from '@/components/game/BattleArena';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { TutorialTracker } from '@/components/tutorial/TutorialTracker';
import { GameProvider } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [tutorialEvents, setTutorialEvents] = useState({
    castleMoved: false,
    castleClicked: false,
    constructionStarted: false,
    constructionCompleted: false,
    buildingUpgraded: false,
    battleStarted: false
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleTutorialEvent = (eventType: keyof typeof tutorialEvents) => {
    setTutorialEvents(prev => ({ ...prev, [eventType]: true }));
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <GameProvider>
      <div className="min-h-screen bg-background">
        <div className="flex flex-col h-screen">
          {/* Tutorial Overlay */}
          <TutorialOverlay />
          
          {/* Tutorial Event Tracker */}
          <TutorialTracker
            onCastleMoved={tutorialEvents.castleMoved ? () => {} : () => handleTutorialEvent('castleMoved')}
            onCastleClicked={tutorialEvents.castleClicked ? () => {} : () => handleTutorialEvent('castleClicked')}
            onConstructionStarted={tutorialEvents.constructionStarted ? () => {} : () => handleTutorialEvent('constructionStarted')}
            onConstructionCompleted={tutorialEvents.constructionCompleted ? () => {} : () => handleTutorialEvent('constructionCompleted')}
            onBuildingUpgraded={tutorialEvents.buildingUpgraded ? () => {} : () => handleTutorialEvent('buildingUpgraded')}
            onBattleStarted={tutorialEvents.battleStarted ? () => {} : () => handleTutorialEvent('battleStarted')}
          />

          {/* Üst Panel - Kaynaklar ve Kontroller */}
          <div className="h-20 border-b border-border flex">
            <div className="flex-1">
              <ResourcePanel />
            </div>
            <div className="flex items-center gap-2 px-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                <span>Hoşgeldin, {user.user_metadata?.username || user.email?.split('@')[0]}</span>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Çıkış
              </Button>
            </div>
          </div>
          
          {/* Ana Oyun Alanı */}
          <div className="flex-1 flex">
            {/* Sol Panel - Ordu Yönetimi */}
            <div className="w-80 border-r border-border bg-card">
              <ArmyPanel />
            </div>
            
            {/* Tam Ekran Hex Grid Harita */}
            <div className="flex-1 relative">
              <HexGrid 
                onCastleMoved={() => handleTutorialEvent('castleMoved')}
                onCastleClicked={() => handleTutorialEvent('castleClicked')}
                onBattleStarted={() => handleTutorialEvent('battleStarted')}
              />
            </div>
          </div>
        </div>
        
        {/* Savaş Arenası Modal */}
        <BattleArena />
      </div>
    </GameProvider>
  );
};

export default Index;
