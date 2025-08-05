
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

  // Tutorial tamamlanmamışsa sadece tutorial göster
  if (tutorialProgress && !tutorialProgress.tutorial_completed) {
    return (
      <div className="min-h-screen bg-background">
        <GameProvider>
          {/* Minimal üst panel - sadece çıkış butonu */}
          <div className="h-16 border-b border-border flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-primary">🏰 Tutorial Modu</h1>
              <span className="text-sm text-muted-foreground">
                Oyunu öğrenmek için tutorial'ı tamamlayın
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                <span>{user.user_metadata?.username || user.email?.split('@')[0]}</span>
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
          
          {/* Tutorial alanı */}
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="max-w-2xl mx-auto p-8 text-center">
              <div className="mb-8">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-2xl font-bold mb-2">Hoşgeldin Komutan!</h2>
                <p className="text-muted-foreground">
                  Phoenix Clash oyununa hoşgeldin. Oyunu öğrenmek için tutorial'ı tamamlamalısın.
                  Tutorial boyunca adım adım tüm oyun mekaniklerini öğreneceksin.
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-lg border">
                <h3 className="font-semibold mb-2">Tutorial İçeriği:</h3>
                <ul className="text-left space-y-1 text-sm text-muted-foreground">
                  <li>✓ Kale yerleştirme</li>
                  <li>✓ Kale yönetimi</li>
                  <li>✓ Bina inşa etme</li>
                  <li>✓ Ordu oluşturma</li>
                  <li>✓ Savaş mekanikleri</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Tutorial Overlay - Her zaman görünür */}
          <TutorialOverlay />
        </GameProvider>
      </div>
    );
  }

  // Tutorial tamamlandıysa normal oyun ekranını göster
  return (
    <GameProvider>
      <div className="min-h-screen bg-background">
        <div className="flex flex-col h-screen">
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
              <HexGrid />
            </div>
          </div>
        </div>
        
        {/* Savaş Arenası Modal */}
        <BattleArena />
        
        {/* Tutorial Overlay - Sadece aktifse göster */}
        <TutorialOverlay />
      </div>
    </GameProvider>
  );
};

export default Index;
