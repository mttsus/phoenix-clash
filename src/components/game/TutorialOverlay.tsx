
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTutorial, TutorialStep } from '@/hooks/useTutorial';
import { ChevronRight, Star, Target, Hammer, Swords, Crown, X } from 'lucide-react';

interface TutorialConfig {
  title: string;
  description: string;
  instruction: string;
  icon: React.ReactNode;
  progress: number;
}

const tutorialSteps: Record<TutorialStep, TutorialConfig> = {
  move_castle: {
    title: 'Kaleyi Taşı',
    description: 'Hoşgeldin! İlk görevin kalenizi haritada boş bir alana taşımak.',
    instruction: 'Haritada boş bir alana tıklayın ve kalenizi o konuma taşıyın.',
    icon: <Target className="w-6 h-6" />,
    progress: 12.5
  },
  enter_castle: {
    title: 'Kaleye Gir',
    description: 'Harika! Şimdi kale yönetimine başlayalım.',
    instruction: 'Mavi renkli kendi kalenize tıklayarak kale içi ekranını açın.',
    icon: <Crown className="w-6 h-6" />,
    progress: 25
  },
  build_structure: {
    title: 'İnşaat Başlat',
    description: 'Kale içinde kaynak üretimi için bir bina inşa edelim.',
    instruction: 'Boş bir alan seçin, herhangi bir bina türü seçin ve inşaatı başlatın.',
    icon: <Hammer className="w-6 h-6" />,
    progress: 37.5
  },
  wait_construction: {
    title: 'İnşaatı Bekle',
    description: 'İnşaat başladı! Binanın tamamlanmasını bekleyin (1 dakika).',
    instruction: 'İnşaat tamamlanınca otomatik olarak bildirim alacaksınız.',
    icon: <Hammer className="w-6 h-6" />,
    progress: 50
  },
  upgrade_building: {
    title: 'Binayı Geliştir',
    description: 'İnşaat tamamlandı! Şimdi binayı geliştirin.',
    instruction: 'Tamamlanan binanın üzerindeki "Geliştir" butonuna tıklayın.',
    icon: <Star className="w-6 h-6" />,
    progress: 62.5
  },
  train_army: {
    title: 'Ordu Oluştur',
    description: 'Savaş için ordu oluşturma zamanı!',
    instruction: 'Sol panelden 6 farklı asker türünden en az 1000 asker üretin.',
    icon: <Swords className="w-6 h-6" />,
    progress: 75
  },
  battle_enemy: {
    title: 'Savaşa Gir',
    description: 'Ordunuz hazır! Şimdi ilk savaşınızı yapın.',
    instruction: 'Haritadan düşman kalesi (kırmızı) bulun ve savaş başlatın.',
    icon: <Swords className="w-6 h-6" />,
    progress: 87.5
  },
  completed: {
    title: 'Tebrikler!',
    description: 'Tüm tutorial adımlarını tamamladınız!',
    instruction: 'Artık oyunu özgürce oynayabilirsiniz.',
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
              Artık Phoenix Clash oyununu özgürce oynayabilirsiniz. 
              Tüm özellikler kullanıma açıldı!
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

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          📚 Tutorial
          <Badge variant="secondary" className="ml-2">
            {Math.round(config.progress)}%
          </Badge>
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {config.icon}
              {config.title}
            </div>
            {/* Küçültme butonu sadece tutorial aktifken */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Progress value={config.progress} className="w-full" />
          
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {config.description}
            </p>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-800">
                🎯 {config.instruction}
              </p>
            </div>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            Adım {Object.keys(tutorialSteps).indexOf(currentStep) + 1} / {Object.keys(tutorialSteps).length}
          </div>
          
          <div className="text-xs text-center text-orange-600 bg-orange-50 p-2 rounded">
            ⚠️ Tutorial tamamlanmadan oyunun diğer özelliklerini kullanamazsınız
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
