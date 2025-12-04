import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EquippedItems } from "@/types/game";
import { Sparkles, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";

interface EquippedItemsPanelProps {
  equippedItems: EquippedItems;
  mode?: 'single_player' | 'multiplayer';
  showQuickSwap?: boolean;
}

const ITEM_TYPE_ICONS: Record<string, string> = {
  paddle: '🏓',
  ball: '⚽',
  trail: '✨',
  brick: '🧱',
  explosion: '💥',
  background: '🌌',
  aura: '🔮',
  color: '🎨',
  skin: '🎭',
};

const RARITY_COLORS: Record<string, { bg: string; glow: string }> = {
  common: { bg: 'bg-muted', glow: '' },
  rare: { bg: 'bg-blue-500/20', glow: 'shadow-[0_0_8px_rgba(59,130,246,0.5)]' },
  epic: { bg: 'bg-purple-500/20', glow: 'shadow-[0_0_8px_rgba(168,85,247,0.5)] animate-pulse' },
  legendary: { bg: 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30', glow: 'shadow-[0_0_12px_rgba(234,179,8,0.5)]' },
};

export const EquippedItemsPanel = ({ 
  equippedItems, 
  mode = 'single_player',
  showQuickSwap = true 
}: EquippedItemsPanelProps) => {
  const [expanded, setExpanded] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const { inventory, equipItem, unequipItem } = useInventory(mode);

  const itemTypes = Object.keys(equippedItems) as Array<keyof EquippedItems>;

  if (itemTypes.length === 0 && !showQuickSwap) {
    return null;
  }

  const getItemRarity = (itemType: string): string => {
    const item = equippedItems[itemType as keyof EquippedItems];
    return (item?.properties as any)?.rarity || 'common';
  };

  const getAvailableItems = (type: string) => {
    return inventory.filter(item => item.item?.type === type);
  };

  const handleQuickSwap = async (inventoryId: string, itemType: string) => {
    await equipItem(inventoryId, itemType);
    setSelectedType(null);
  };

  const handleUnequip = async (type: string) => {
    const equippedItem = inventory.find(
      item => item.item?.type === type && item.equipped
    );
    if (equippedItem) {
      await unequipItem(equippedItem.id);
    }
    setSelectedType(null);
  };

  return (
    <Card className="fixed top-20 right-4 p-3 bg-card/95 backdrop-blur-sm z-10 w-56 max-h-[80vh] overflow-hidden flex flex-col">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase">Equipped</h3>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      
      {expanded && (
        <div className="mt-3 space-y-2 overflow-y-auto flex-1">
          {itemTypes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No items equipped
            </p>
          ) : (
            itemTypes.map((type) => {
              const item = equippedItems[type];
              if (!item) return null;

              const rarity = getItemRarity(type);
              const rarityStyle = RARITY_COLORS[rarity] || RARITY_COLORS.common;
              const availableItems = getAvailableItems(type);
              const isSelected = selectedType === type;

              return (
                <div key={type} className="space-y-1">
                  <div
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${rarityStyle.bg} ${rarityStyle.glow} hover:scale-[1.02]`}
                    onClick={() => setSelectedType(isSelected ? null : type)}
                  >
                    <div className="w-8 h-8 rounded flex items-center justify-center text-lg bg-background/50">
                      {ITEM_TYPE_ICONS[type] || type[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{type}</p>
                    </div>
                    {rarity === 'legendary' && (
                      <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    )}
                  </div>

                  {/* Quick swap dropdown */}
                  {isSelected && showQuickSwap && availableItems.length > 1 && (
                    <div className="ml-4 p-2 bg-background rounded space-y-1 animate-fade-in">
                      <p className="text-[10px] text-muted-foreground uppercase mb-2">Quick Swap</p>
                      {availableItems.map((invItem) => {
                        const isCurrentlyEquipped = invItem.equipped;
                        return (
                          <button
                            key={invItem.id}
                            className={`w-full flex items-center gap-2 p-1.5 rounded text-left text-xs transition-colors ${
                              isCurrentlyEquipped 
                                ? 'bg-primary/20 text-primary' 
                                : 'hover:bg-muted'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isCurrentlyEquipped) {
                                handleQuickSwap(invItem.id, type);
                              }
                            }}
                          >
                            <span className="flex-1 truncate">{invItem.item?.name}</span>
                            {isCurrentlyEquipped && <span className="text-[10px]">✓</span>}
                          </button>
                        );
                      })}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-xs mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnequip(type);
                        }}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Unequip
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </Card>
  );
};