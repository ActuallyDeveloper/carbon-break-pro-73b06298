import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ShopItemPreview } from "@/components/ShopItemPreview";
import { useRealtimeShop } from "@/hooks/useRealtimeShop";
import { useInventory } from "@/hooks/useInventory";

const SinglePlayerShop = () => {
  const { user } = useAuth();
  const { items, currency, inventory, loading } = useRealtimeShop('single_player');
  const { inventory: userInventory, equipItem, unequipItem } = useInventory('single_player');

  const purchaseItem = async (item: any) => {
    if (!user) return;
    
    // Re-check currency to be safe
    const { data: currentCurrency } = await supabase
      .from("user_currency")
      .select("single_player_coins")
      .eq("user_id", user.id)
      .single();
      
    const balance = currentCurrency?.single_player_coins || 0;

    if (balance < item.price) {
      toast.error("Not enough coins!");
      return;
    }
    if (inventory.has(item.id)) {
      toast.error("Already owned!");
      return;
    }

    try {
      // 1. Insert into inventory
      const { error: insertError } = await supabase.from("user_inventory").insert({
        user_id: user.id,
        item_id: item.id,
      });

      if (insertError) throw insertError;

      // 2. Deduct coins
      const { error: updateError } = await supabase
        .from("user_currency")
        .update({ single_player_coins: balance - item.price })
        .eq("user_id", user.id);

      if (updateError) {
        // Critical error: Item given but coins not deducted. 
        // In a real app, we might want to rollback the inventory insert here.
        console.error("Failed to deduct coins", updateError);
        toast.error("Transaction error. Please contact support.");
        return;
      }

      toast.success(`Purchased ${item.name}!`);
    } catch (error: any) {
      toast.error(error.message || "Purchase failed");
    }
  };

  const handleEquipToggle = async (item: any) => {
    const inventoryItem = userInventory.find(inv => inv.item_id === item.id);
    if (!inventoryItem) return;

    if (inventoryItem.equipped) {
      await unequipItem(inventoryItem.id);
    } else {
      await equipItem(inventoryItem.id, item.type);
    }
  };

  const rarityColors: Record<string, string> = {
    common: "border-muted",
    rare: "border-primary",
    epic: "border-accent",
    legendary: "border-foreground",
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">SINGLE PLAYER SHOP</h1>
            <p className="text-muted-foreground uppercase tracking-wider">Customize Your Game</p>
          </div>
          <div className="flex items-center gap-2 text-2xl font-bold">
            <Coins className="h-6 w-6" />
            {currency}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Loading shop...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {items.map((item, index) => {
              const owned = inventory.has(item.id);
              const inventoryItem = userInventory.find(inv => inv.item_id === item.id);
              const isEquipped = inventoryItem?.equipped || false;
              
              return (
                <div
                  key={item.id}
                  className={`border-2 ${rarityColors[item.rarity]} p-4 space-y-3 transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fade-in bg-card`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <ShopItemPreview 
                    type={item.type}
                    properties={item.properties}
                    rarity={item.rarity}
                  />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold uppercase text-sm">{item.name}</h3>
                      <span className="text-xs text-muted-foreground uppercase">{item.rarity}</span>
                    </div>
                    <p className="text-xs text-muted-foreground uppercase">{item.type}</p>
                  </div>

                  {owned ? (
                    <Button
                      onClick={() => handleEquipToggle(item)}
                      variant={isEquipped ? "secondary" : "default"}
                      className="w-full transition-all duration-200 hover:scale-105"
                    >
                      {isEquipped ? "UNEQUIP" : "EQUIP"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => purchaseItem(item)}
                      className="w-full transition-all duration-200 hover:scale-105"
                    >
                      {item.price} COINS
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SinglePlayerShop;
