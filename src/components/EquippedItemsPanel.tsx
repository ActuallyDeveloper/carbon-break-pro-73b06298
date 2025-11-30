import { Card } from "@/components/ui/card";
import { EquippedItems } from "@/types/game";
import { Sparkles } from "lucide-react";

interface EquippedItemsPanelProps {
  equippedItems: EquippedItems;
  rarity?: Record<string, string>;
}

export const EquippedItemsPanel = ({ equippedItems, rarity = {} }: EquippedItemsPanelProps) => {
  const getRarityColor = (itemType: string) => {
    const itemRarity = rarity[itemType] || 'common';
    const colors: Record<string, string> = {
      common: 'border-muted',
      rare: 'border-primary',
      epic: 'border-accent',
      legendary: 'border-foreground',
    };
    return colors[itemRarity] || 'border-muted';
  };

  const getRarityGlow = (itemType: string) => {
    const itemRarity = rarity[itemType] || 'common';
    if (itemRarity === 'legendary') {
      return 'shadow-lg shadow-foreground/50 animate-pulse';
    }
    if (itemRarity === 'epic') {
      return 'shadow-md shadow-accent/50';
    }
    return '';
  };

  const itemTypes = Object.keys(equippedItems) as Array<keyof EquippedItems>;

  if (itemTypes.length === 0) {
    return null;
  }

  return (
    <Card className="fixed top-20 right-4 p-3 bg-card/90 backdrop-blur-sm border-2 z-10 w-48">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4" />
        <h3 className="text-sm font-bold uppercase">Equipped</h3>
      </div>
      
      <div className="space-y-2">
        {itemTypes.map((type) => {
          const item = equippedItems[type];
          if (!item) return null;

          return (
            <div
              key={type}
              className={`flex items-center gap-2 p-2 border ${getRarityColor(type)} ${getRarityGlow(type)} rounded bg-background/50 transition-all`}
            >
              <div className="w-8 h-8 rounded border border-border flex items-center justify-center text-xs bg-muted">
                {type[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{type}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
