import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, CheckCircle } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { ShopItemPreview } from "./ShopItemPreview";

interface InventoryPanelProps {
  mode: 'single_player' | 'multiplayer';
}

export const InventoryPanel = ({ mode }: InventoryPanelProps) => {
  const { inventory, equipItem, unequipItem } = useInventory(mode);

  const groupedInventory = inventory.reduce((acc, item) => {
    const type = item.item.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, typeof inventory>);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5" />
        <h3 className="text-xl font-bold uppercase">Inventory</h3>
      </div>

      {Object.keys(groupedInventory).length === 0 ? (
        <p className="text-sm text-muted-foreground">No items in inventory. Visit the shop to purchase items!</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedInventory).map(([type, items]) => (
            <div key={type} className="space-y-2">
              <h4 className="text-sm font-medium uppercase text-muted-foreground">{type}s</h4>
              <div className="grid grid-cols-2 gap-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`border border-border p-3 rounded-lg transition-colors ${
                      item.equipped ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                    }`}
                  >
                    <ShopItemPreview
                      type={item.item.type}
                      properties={item.item.properties}
                      rarity="common"
                    />
                    <div className="flex items-start justify-between mb-2 mt-2">
                      <span className="text-xs font-medium">{item.item.name}</span>
                      {item.equipped && <CheckCircle className="h-4 w-4 text-primary" />}
                    </div>
                    {item.item.properties && Object.keys(item.item.properties).length > 0 && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {Object.entries(item.item.properties).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(", ")}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant={item.equipped ? "outline" : "default"}
                      className="w-full text-xs"
                      onClick={() =>
                        item.equipped
                          ? unequipItem(item.id)
                          : equipItem(item.id, item.item.type)
                      }
                    >
                      {item.equipped ? "Unequip" : "Equip"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
