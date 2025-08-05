
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTutorial, TutorialStep } from '@/hooks/useTutorial';
import { ChevronRight, Star, Target, Hammer, Swords, Crown, X, Minimize2 } from 'lucide-react';

interface TutorialConfig {
  title: string;
  description: string;
  instruction: string;
  icon: React.ReactNode;
  progress: number;
  highlightArea?: {
    element: string;
    description: string;
  };
}

const tutorialSteps: Record<TutorialStep, TutorialConfig> = {
  move_castle: {
    title: 'Kaleyi Taşı',
    description: 'Hoşgeldin! İlk görevin kalenizi haritada uygun bir yere taşımak.',
    instruction: 'Sağdaki haritada boş bir hex alanına tıklayarak kalenizi o konuma taşıyın.',
    icon: <Target className="w-6 h-6" />,
    progress: 12.5,
    highlightArea: {
      element: 'hex-grid',
      description: 'Bu harita üzerinde boş bir alana tıklayın'
    }
  },
  enter_castle: {
    title: 'Kaleye Gir',
    description: 'Harika! Kalenizi yerleştirdiniz. Şimdi kale yönetimine bakalım.',
    instruction: 'Haritada mavi renkli kendi kalenize tıklayarak kale içi yönetim ekranına giriniz.',
    icon: <Crown className="w-6 h-6" />,
    progress: 25,
    highlightArea: {
      element: 'hex-grid',
      description: 'Mavi kalenize tıklayın'
    }
  },
  build_structure: {
    title: 'İnşaat Başlat',
    description: 'Kale içinde kaynak üretimi için bina inşa etme zamanı.',
    instruction: 'Kale içinde boş bir alan seçin ve herhangi bir bina türü ile inşaata başlayın.',
    icon: <Hammer className="w-6 h-6" />,
    progress: 37.5
  },
  wait_construction: {
    title: 'İnşaatı Bekle',
    description: 'İnşaat başladı! Binanın tamamlanmasını sabırla bekleyin.',
    instruction: 'İnşaat süreci yaklaşık 1 dakika sürer. Tamamlandığında bilgilendirileceksiniz.',
    icon: <Hammer className="w-6 h-6" />,
    progress: 50
  },
  upgrade_building: {
    title: 'Binayı Geliştir',
    description: 'İnşaat tamamlandı! Binayı bir seviye geliştirin.',
    instruction: 'Tamamlanan binaya tıklayıp "Geliştir" butonunu kullanarak seviyesini artırın.',
    icon: <Star className="w-6 h-6" />,
    progress: 62.5
  },
  train_army: {
    title: 'Ordu Oluştur',
    description: 'Savaşa hazırlanmak için güçlü bir ordu oluşturalım.',
    instruction: 'Sol panelden 6 farklı asker türünden en az 1000 asker eğitin.',
    icon: <Swords className="w-6 h-6" />,
    progress: 75,
    highlightArea: {
      element: 'army-panel',
      description: 'Bu panelden asker üretimi yapın'
    }
  },
  battle_enemy: {
    title: 'Savaşa Gir',
    description: 'Ordunuz hazır! İlk savaş deneyiminizi yaşayın.',
    instruction: 'Haritadan düşman kalesini (kırmızı renk) bulup tıklayarak savaş başlatın.',
    icon: <Swords className="w-6 h-6" />,
    progress: 87.5,
    highlightArea: {
      element: 'hex-grid',
      description: 'Kırmızı düşman kalesine tıklayın'
    }
  },
  completed: {
    title: 'Tebrikler!',
    description: 'Tüm tutorial adımlarını başarıyla tamamladınız!',
    instruction: 'Artık Phoenix Clash oyununu özgürce keşfedebilirsiniz.',
    icon: <Crown className="w-6 h-6" />,
    progress: 100
  }
};

export const TutorialOverlay = () => {
  const { tutorialProgress, isTutorialActive, currentStep, updateTutorialStep, completeTutorial } = useTutorial();
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isTutorialActive || !tutorialProgress) return null;

  const config = tutorialSteps[currentStep];

  // Tutorial tamamlandıysa completion dialog göster
  if (currentStep === 'completed') {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center">
              <Crown className="w-6 h-6 text-yellow-500" />
              Tebrikler! 🎉
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-center">
            <div className="text-4xl">🏆</div>
            <p className="text-lg font-semibold">Tutorial Tamamlandı!</p>
            <p className="text-sm text-muted-foreground">
              Phoenix Clash oyununu başarıyla öğrendiniz! 
              Artık tüm oyun özelliklerini kullanabilirsiniz.
            </p>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-800 font-medium">
                🎁 Tutorial ödülleriniz hesabınıza eklendi!
              </p>
            </div>

            <Button
              onClick={completeTutorial}
              className="w-full"
              size="lg"
            >
              Oyuna Başla!
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Küçültülmüş durumda sadece floating button
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 animate-pulse"
          size="lg"
        >
          <div className="flex items-center gap-2">
            {config.icon}
            <span className="font-semibold">Tutorial</span>
            <Badge variant="secondary" className="ml-2">
              Adım {Object.keys(tutorialSteps).indexOf(currentStep) + 1}/8
            </Badge>
          </div>
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Highlight overlay - eğer belirli bir alanı vurgulamak gerekiyorsa */}
      {config.highlightArea && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="absolute inset-0 bg-black bg-opacity-30">
            {/* Highlight çemberi veya dikdörtgeni buraya eklenebilir */}
          </div>
        </div>
      )}

      {/* Tutorial guide dialog */}
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {config.icon}
                <span>{config.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(true)}
                  className="w-8 h-8 p-0"
                  title="Küçült"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>İlerleme</span>
                <span>{Math.round(config.progress)}%</span>
              </div>
              <Progress value={config.progress} className="w-full h-2" />
            </div>
            
            {/* Ana açıklama */}
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {config.description}
              </p>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">🎯</span>
                  <p className="text-sm font-medium text-blue-800 text-left">
                    {config.instruction}
                  </p>
                </div>
              </div>

              {config.highlightArea && (
                <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                  <p className="text-xs text-yellow-800 font-medium">
                    💡 {config.highlightArea.description}
                  </p>
                </div>
              )}
            </div>

            {/* Adım bilgisi */}
            <div className="text-center">
              <Badge variant="outline" className="text-xs">
                Adım {Object.keys(tutorialSteps).indexOf(currentStep) + 1} / {Object.keys(tutorialSteps).length}
              </Badge>
            </div>
            
            {/* Uyarı notu */}
            <div className="text-xs text-center text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
              ⚠️ Tutorial tamamlanana kadar diğer özellikler kısıtlıdır
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
