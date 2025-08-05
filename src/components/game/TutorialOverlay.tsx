
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTutorial, TutorialStep } from '@/hooks/useTutorial';
import { ChevronRight, Star, Target, Hammer, Swords, Crown, X, Minimize2, FastForward, Play } from 'lucide-react';
import { toast } from 'sonner';

interface TutorialConfig {
  title: string;
  description: string;
  instruction: string;
  icon: React.ReactNode;
  progress: number;
  canSkipStep?: boolean;
  nextStep?: TutorialStep;
}

const tutorialSteps: Record<TutorialStep, TutorialConfig> = {
  move_castle: {
    title: 'Kaleyi Taşı',
    description: 'Hoşgeldin! İlk görevin kalenizi haritada uygun bir yere taşımak.',
    instruction: 'Sağdaki haritada boş bir hex alanına tıklayarak kalenizi o konuma taşıyın.',
    icon: <Target className="w-6 h-6" />,
    progress: 12.5,
    canSkipStep: true,
    nextStep: 'enter_castle'
  },
  enter_castle: {
    title: 'Kaleye Gir',
    description: 'Harika! Kalenizi yerleştirdiniz. Şimdi kale yönetimine bakalım.',
    instruction: 'Haritada mavi renkli kendi kalenize tıklayarak kale içi yönetim ekranına giriniz.',
    icon: <Crown className="w-6 h-6" />,
    progress: 25,
    canSkipStep: true,
    nextStep: 'build_structure'
  },
  build_structure: {
    title: 'İnşaat Başlat',
    description: 'Kale içinde kaynak üretimi için bina inşa etme zamanı.',
    instruction: 'Kale içinde boş bir alan seçin ve herhangi bir bina türü ile inşaata başlayın.',
    icon: <Hammer className="w-6 h-6" />,
    progress: 37.5,
    canSkipStep: true,
    nextStep: 'wait_construction'
  },
  wait_construction: {
    title: 'İnşaatı Bekle',
    description: 'İnşaat başladı! Binanın tamamlanmasını sabırla bekleyin.',
    instruction: 'İnşaat süreci yaklaşık 1 dakika sürer. Tamamlandığında bilgilendirileceksiniz.',
    icon: <Hammer className="w-6 h-6" />,
    progress: 50,
    canSkipStep: true,
    nextStep: 'upgrade_building'
  },
  upgrade_building: {
    title: 'Binayı Geliştir',
    description: 'İnşaat tamamlandı! Binayı bir seviye geliştirin.',
    instruction: 'Tamamlanan binaya tıklayıp "Geliştir" butonunu kullanarak seviyesini artırın.',
    icon: <Star className="w-6 h-6" />,
    progress: 62.5,
    canSkipStep: true,
    nextStep: 'train_army'
  },
  train_army: {
    title: 'Ordu Oluştur',
    description: 'Savaşa hazırlanmak için güçlü bir ordu oluşturalım.',
    instruction: 'Sol panelden 6 farklı asker türünden en az 1000 asker eğitin.',
    icon: <Swords className="w-6 h-6" />,
    progress: 75,
    canSkipStep: true,
    nextStep: 'battle_enemy'
  },
  battle_enemy: {
    title: 'Savaşa Gir',
    description: 'Ordunuz hazır! İlk savaş deneyiminizi yaşayın.',
    instruction: 'Haritadan düşman kalesini (kırmızı renk) bulup tıklayarak savaş başlatın.',
    icon: <Swords className="w-6 h-6" />,
    progress: 87.5,
    canSkipStep: true,
    nextStep: 'completed'
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
  const { tutorialProgress, isTutorialActive, currentStep, updateTutorialStep, skipTutorial, completeTutorial } = useTutorial();
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  if (!isTutorialActive || !tutorialProgress) return null;

  const config = tutorialSteps[currentStep];

  const handleSkipStep = async () => {
    if (config.nextStep) {
      const success = await updateTutorialStep(config.nextStep);
      if (success) {
        toast.success('Adım atlandı!');
      }
    }
  };

  const handleSkipTutorial = async () => {
    const success = await skipTutorial();
    if (success) {
      setShowSkipConfirm(false);
    }
  };

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

  // Skip confirmation dialog
  if (showSkipConfirm) {
    return (
      <Dialog open={true} onOpenChange={() => setShowSkipConfirm(false)}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FastForward className="w-5 h-5 text-orange-500" />
              Tutorial'ı Atla?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tutorial'ı atlarsanız oyunun temel özelliklerini öğrenme fırsatını kaçırabilirsiniz. 
              Yine de atlamak istediğinizden emin misiniz?
            </p>
            
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
              <p className="text-sm text-yellow-800">
                💡 Tutorial'ı atlasanız bile hoşgeldin bonusunuzu alacaksınız!
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowSkipConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Devam Et
              </Button>
              <Button
                onClick={handleSkipTutorial}
                variant="destructive"
                className="flex-1"
              >
                Atla
              </Button>
            </div>
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
          </div>

          {/* Adım bilgisi */}
          <div className="text-center">
            <Badge variant="outline" className="text-xs">
              Adım {Object.keys(tutorialSteps).indexOf(currentStep) + 1} / {Object.keys(tutorialSteps).length}
            </Badge>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {config.canSkipStep && (
              <Button
                onClick={handleSkipStep}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-xs"
              >
                <Play className="w-3 h-3" />
                Bu Adımı Atla
              </Button>
            )}
            <Button
              onClick={() => setShowSkipConfirm(true)}
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-xs text-orange-600"
            >
              <FastForward className="w-3 h-3" />
              Tutorial'ı Atla
            </Button>
          </div>
          
          {/* Uyarı notu */}
          <div className="text-xs text-center text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
            💡 Eğer adımları zaten yaptıysanız "Bu Adımı Atla" butonunu kullanabilirsiniz
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
