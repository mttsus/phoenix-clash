
import { useTutorial } from '@/hooks/useTutorial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Gift } from 'lucide-react';

export const TutorialOverlay = () => {
  const { tutorialSteps, currentStep, tutorialActive, skipTutorial } = useTutorial();

  if (!tutorialActive || !currentStep) return null;

  const completedSteps = tutorialSteps.filter(step => step.completed).length;
  const totalSteps = tutorialSteps.length;
  const progress = (completedSteps / totalSteps) * 100;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-96">
      <Card className="bg-yellow-50 border-yellow-300 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              📚 Eğitim Görevi
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={skipTutorial}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-gray-600">
            {completedSteps}/{totalSteps} görev tamamlandı
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-yellow-800">{currentStep.title}</h3>
              <p className="text-sm text-gray-700">{currentStep.description}</p>
            </div>
            
            <div className="flex items-center gap-2 text-sm bg-green-100 p-2 rounded">
              <Gift className="h-4 w-4 text-green-600" />
              <span className="text-green-700">
                Ödül: {currentStep.reward.toLocaleString()} kaynak
              </span>
            </div>
            
            <Button 
              onClick={skipTutorial}
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              Eğitimi Atla
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
