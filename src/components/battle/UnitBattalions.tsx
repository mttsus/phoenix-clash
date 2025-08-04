
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface Battalion {
  id: number;
  type: 'swordsman' | 'archer' | 'cavalry' | 'mage_fire' | 'mage_ice' | 'mage_lightning';
  lane: number;
  position: number;
  units: number;
  isMoving: boolean;
  reachedTower: boolean;
}

interface UnitBattalionsProps {
  battalions: Battalion[];
  totalUnitsDeployed: number;
}

const UNIT_CONFIGS = {
  swordsman: { icon: '⚔️', name: 'Kılıçlı', speed: 10, damage: 1 },
  archer: { icon: '🏹', name: 'Okçu', speed: 12, damage: 1 },
  cavalry: { icon: '🐎', name: 'Atlı', speed: 7, damage: 1 },
  mage_fire: { icon: '🔥', name: 'Ateş Büyücüsü', speed: 15, damage: 2 },
  mage_ice: { icon: '❄️', name: 'Buz Büyücüsü', speed: 15, damage: 2 },
  mage_lightning: { icon: '⚡', name: 'Şimşek Büyücüsü', speed: 15, damage: 3 }
};

export const UnitBattalions = ({ battalions, totalUnitsDeployed }: UnitBattalionsProps) => {
  const getLaneLabel = (lane: number) => {
    switch (lane) {
      case 0: return 'Sol';
      case 1: return 'Orta';
      case 2: return 'Sağ';
      default: return `${lane + 1}`;
    }
  };

  const getPositionLabel = (position: number) => {
    switch (position) {
      case 0: return 'Başlangıç';
      case 1: return 'Orta Alan';
      case 2: return 'Kule Yakını';
      default: return `Pozisyon ${position}`;
    }
  };

  const activeBattalions = battalions.filter(b => b.units > 0);
  const totalCasualties = battalions.reduce((sum, b) => sum + (100 - b.units), 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          ⚔️ Savaş Taburları
          <Badge variant="secondary">
            {activeBattalions.length} Aktif Tabur
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Genel İstatistikler */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-2 bg-blue-50 rounded">
            <div className="text-xs text-gray-600">Toplam Asker</div>
            <div className="text-lg font-bold">{totalUnitsDeployed}</div>
            <Progress value={Math.min((totalUnitsDeployed / 10000) * 100, 100)} className="h-1 mt-1" />
          </div>
          
          <div className="p-2 bg-red-50 rounded">
            <div className="text-xs text-gray-600">Kayıplar</div>
            <div className="text-lg font-bold text-red-600">{totalCasualties}</div>
            <div className="text-xs text-gray-500">
              %{totalCasualties > 0 ? Math.round((totalCasualties / (totalUnitsDeployed + totalCasualties)) * 100) : 0} Kayıp
            </div>
          </div>
        </div>

        {/* Aktif Taburlar */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <div className="text-sm font-medium">Aktif Taburlar:</div>
          
          {activeBattalions.map(battalion => {
            const unitConfig = UNIT_CONFIGS[battalion.type];
            return (
              <div key={battalion.id} className="p-2 border rounded">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{unitConfig.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{unitConfig.name}</div>
                      <div className="text-xs text-gray-500">
                        {getLaneLabel(battalion.lane)} Hat - {getPositionLabel(battalion.position)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge variant={battalion.units > 50 ? "secondary" : "destructive"}>
                      {battalion.units}/100
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Progress 
                    value={(battalion.units / 100) * 100}
                    className="h-2"
                  />
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      {battalion.isMoving ? '🏃 Hareket Ediyor' : 
                       battalion.reachedTower ? '⚔️ Kule Saldırısı' : '⏸️ Bekliyor'}
                    </span>
                    <span>Hasar: {unitConfig.damage}/asker</span>
                  </div>
                </div>
              </div>
            );
          })}

          {activeBattalions.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">🏳️</div>
              <p className="text-sm">Hiç aktif tabur yok</p>
              <p className="text-xs text-gray-400">Yeni taburlar gönderin</p>
            </div>
          )}
        </div>

        {/* Asker Türü İstatistikleri */}
        <div className="pt-4 border-t">
          <div className="text-sm font-medium mb-2">Asker Türü Özellikleri:</div>
          <div className="grid grid-cols-1 gap-1 text-xs">
            <div className="flex justify-between">
              <span>🐎 Atlı (Hızlı):</span>
              <span>7s orta alana</span>
            </div>
            <div className="flex justify-between">
              <span>⚔️ Kılıçlı (Sağlam):</span>
              <span>10s orta alana</span>
            </div>
            <div className="flex justify-between">
              <span>🏹 Okçu (Menzilli):</span>
              <span>12s orta alana</span>
            </div>
            <div className="flex justify-between">
              <span>🔥 Büyücüler (Güçlü):</span>
              <span>15s, fazla hasar</span>
            </div>
          </div>
        </div>

        {/* Strateji Rehberi */}
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-xs font-medium text-yellow-800 mb-1">
            💡 Strateji Rehberi
          </div>
          <ul className="text-xs text-yellow-700 space-y-0.5">
            <li>• Atlılar hızlı ama savunmasız</li>
            <li>• Kuleler 100-200 asker öldürebilir</li>
            <li>• 300 atlı kuleye ulaşırsa 300 hasar</li>
            <li>• Taburları farklı hatlarda gönderin</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
