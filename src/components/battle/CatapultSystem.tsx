
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Catapult {
  id: number;
  team: 'player' | 'enemy';
  health: number;
  lastShot: number;
  isDestroyed: boolean;
}

interface CatapultSystemProps {
  catapults: Catapult[];
  battleTime: number;
  onManualFire: (catapultId: number, targetLane: number) => void;
}

export const CatapultSystem = ({ catapults, battleTime, onManualFire }: CatapultSystemProps) => {
  const [selectedTarget, setSelectedTarget] = useState<number>(0);

  const playerCatapult = catapults.find(c => c.team === 'player');
  const enemyCatapult = catapults.find(c => c.team === 'enemy');

  const getNextAutoFire = (lastShot: number) => {
    const nextFire = lastShot + 21;
    const remaining = Math.max(0, nextFire - battleTime);
    return remaining;
  };

  const getReloadProgress = (lastShot: number) => {
    const timeSinceLastShot = battleTime - lastShot;
    const reloadTime = 3; // 3 saniye reload
    return Math.min((timeSinceLastShot / reloadTime) * 100, 100);
  };

  const canFire = (catapult: Catapult) => {
    return !catapult.isDestroyed && (battleTime - catapult.lastShot) >= 3;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          🎯 Mancınık Sistemi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Oyuncu Mancınığı */}
        {playerCatapult && (
          <div className="p-3 border rounded bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <span className="font-medium">Mancınığınız</span>
              </div>
              <Badge variant={playerCatapult.isDestroyed ? "destructive" : "secondary"}>
                {playerCatapult.isDestroyed ? "Yıkıldı" : "Aktif"}
              </Badge>
            </div>

            {!playerCatapult.isDestroyed && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Yeniden Yükleme:</span>
                    <span>{canFire(playerCatapult) ? "Hazır" : `${3 - (battleTime - playerCatapult.lastShot)}s`}</span>
                  </div>
                  <Progress 
                    value={getReloadProgress(playerCatapult.lastShot)}
                    className="h-2"
                  />
                </div>

                <div className="space-y-2 mt-3">
                  <div className="text-sm font-medium">Hedef Seç:</div>
                  <div className="grid grid-cols-3 gap-1">
                    {['Sol Hat', 'Orta Hat', 'Sağ Hat'].map((lane, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={selectedTarget === index ? "default" : "outline"}
                        onClick={() => setSelectedTarget(index)}
                        className="text-xs"
                      >
                        {lane}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => onManualFire(playerCatapult.id, selectedTarget)}
                  disabled={!canFire(playerCatapult)}
                  className="w-full mt-2"
                  size="sm"
                >
                  Manuel Atış (100 Hasar)
                </Button>
              </>
            )}
          </div>
        )}

        {/* Düşman Mancınığı */}
        {enemyCatapult && (
          <div className="p-3 border rounded bg-red-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <span className="font-medium">Düşman Mancınığı</span>
              </div>
              <Badge variant={enemyCatapult.isDestroyed ? "destructive" : "secondary"}>
                {enemyCatapult.isDestroyed ? "Yıkıldı" : "Aktif"}
              </Badge>
            </div>

            {!enemyCatapult.isDestroyed && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sonraki Otomatik Atış:</span>
                  <span>{getNextAutoFire(enemyCatapult.lastShot)}s</span>
                </div>
                <Progress 
                  value={((21 - getNextAutoFire(enemyCatapult.lastShot)) / 21) * 100}
                  className="h-2"
                />
              </div>
            )}
          </div>
        )}

        {/* Mancınık Bilgileri */}
        <div className="p-3 bg-gray-50 rounded space-y-2">
          <div className="text-sm font-medium">Mancınık Özellikleri:</div>
          <ul className="text-xs space-y-1 text-gray-600">
            <li>• Her atış: 100 hasar</li>
            <li>• Reload süresi: 3 saniye</li>
            <li>• Otomatik atış: 21 saniyede bir</li>
            <li>• Sadece kulelere ve binalara saldırır</li>
            <li>• 10 atışla kule yıkılır</li>
            <li>• Tek vuruşla yok edilebilir</li>
          </ul>
        </div>

        {/* Strateji İpuçları */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-sm font-medium text-yellow-800 mb-1">
            💡 Strateji İpucu
          </div>
          <p className="text-xs text-yellow-700">
            Korumasız mancınık 30 saniyede 1 kuleyi yıkabilir. 
            Düşman askerlerini kulelerine ulaşmadan durdurmaya çalışın.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
