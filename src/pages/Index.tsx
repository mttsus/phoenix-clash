
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HexGrid } from '@/components/game/HexGrid';
import { ResourcePanel } from '@/components/game/ResourcePanel';
import { ArmyPanel } from '@/components/game/ArmyPanel';
import { BattleArena } from '@/components/game/BattleArena';
import { GameProvider } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TutorialOverlay } from '@/components/game/TutorialOverlay';
import { useTutorial } from '@/hooks/useTutorial';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { tutorialProgress, loading: tutorialLoading } = useTutorial();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Kullanıcı giriş yapmamışsa auth sayfasına yönlendir
  if (!user) {
    navigate('/auth');
    return null;
  }

  // Tutorial verisi yüklenirken loading göster
  if (tutorialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="w-48 h-4" />
          <p className="text-muted-foreground">Tutorial verisi yükleniyor...</p>
        </div>
      </div>
    );
  }

  const isTutorialActive = tutorialProgress && !tutorialProgress.tutorial_completed;

  return (
    <GameProvider>
      <div className="min-h-screen bg-background">
        <div className="flex flex-col h-screen">
          {/* Üst Panel - Tutorial modu için özel başlık */}
          <div className="h-20 border-b border-border flex">
            <div className="flex-1">
              {isTutorialActive ? (
                <div className="h-full flex items-center px-4 bg-blue-50 border-r border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      📚
                    </div>
                    <div>
                      <h2 className="font-semibold text-blue-800">Tutorial Modu</h2>
                      <p className="text-xs text-blue-600">Oyunu öğrenmek için adımları takip edin</p>
                    </div>
                  </div>
                </div>
              ) : (
                <ResourcePanel />
              )}
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
          
          {/* Ana Oyun Alanı - Tutorial modunda da aynı */}
          <div className="flex-1 flex">
            {/* Sol Panel - Tutorial modunda sınırlı erişim */}
            <div className={`w-80 border-r border-border bg-card ${isTutorialActive ? 'opacity-50' : ''}`}>
              <ArmyPanel />
            </div>
            
            {/* Tam Ekran Hex Grid Harita - Her zaman görünür */}
            <div className="flex-1 relative">
              <HexGrid />
              {isTutorialActive && (
                <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-none" />
              )}
            </div>
          </div>
        </div>
        
        {/* Savaş Arenası Modal */}
        <BattleArena />
        
        {/* Tutorial Overlay - Aktifse görünür */}
        <TutorialOverlay />
      </div>
    </GameProvider>
  );
};

export default Index;
