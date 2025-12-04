import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Sparkles, Circle, Square, Flame, Palette, Zap, Star, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ShopItemPreview } from "@/components/ShopItemPreview";
import { useRealtimeShop } from "@/hooks/useRealtimeShop";
import { useInventory } from "@/hooks/useInventory";
import { useAchievements } from "@/hooks/useAchievements";
import { useState, useEffect } from "react";

const ITEM_CATEGORIES = [
  { id: 'ball', label: 'Balls', icon: Circle },
  { id: 'paddle', label: 'Paddles', icon: Square },
  { id: 'trail', label: 'Trails', icon: Sparkles },
  { id: 'brick', label: 'Bricks', icon: Square },
  { id: 'explosion', label: 'Explosions', icon: Flame },
  { id: 'background', label: 'Backgrounds', icon: Palette },
  { id: 'aura', label: 'Auras', icon: Zap },
];

const RARITY_STYLES: Record<string, { bg: string; glow: string; text: string; border: string }> = {
  common: { 
    bg: 'bg-muted/50', 
    glow: '', 
    text: 'text-muted-foreground',
    border: 'border-muted'
  },
  rare: { 
    bg: 'bg-blue-500/10', 
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]', 
    text: 'text-blue-400',
    border: 'border-blue-500/50'
  },
  epic: { 
    bg: 'bg-purple-500/10', 
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-pulse', 
    text: 'text-purple-400',
    border: 'border-purple-500/50'
  },
  legendary: { 
    bg: 'bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20', 
    glow: 'shadow-[0_0_30px_rgba(234,179,8,0.5)]', 
    text: 'text-yellow-400',
    border: 'border-yellow-500/50'
  },
};

interface ShopProps {
  mode: 'single_player' | 'multiplayer';
}

const ShopContent = ({ mode }: ShopProps) => {
  const { user } = useAuth();
  const { items, currency, inventory, loading } = useRealtimeShop(mode);
  const { inventory: userInventory, equipItem, unequipItem, refetch } = useInventory(mode);
  const { updateProgress } = useAchievements();
  const [activeCategory, setActiveCategory] = useState('ball');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Refetch inventory when mode changes
  useEffect(() => {
    refetch();
  }, [mode, refetch]);

  const purchaseItem = async (item: any) => {
    if (!user || purchasingId) return;
    
    setPurchasingId(item.id);
    
    try {
      const currencyField = mode === 'single_player' ? 'single_player_coins' : 'multiplayer_coins';
      const { data: currentCurrency } = await supabase
        .from("user_currency")
        .select(currencyField)
        .eq("user_id", user.id)
        .single();
        
      const balance = currentCurrency?.[currencyField] || 0;

      if (balance < item.price) {
        toast.error("Not enough coins!");
        return;
      }
      
      if (inventory.has(item.id)) {
        toast.error("Already owned!");
        return;
      }

      const { error: insertError } = await supabase.from("user_inventory").insert({
        user_id: user.id,
        item_id: item.id,
        equipped: false,
      });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("user_currency")
        .update({ [currencyField]: balance - item.price })
        .eq("user_id", user.id);

      if (updateError) {
        toast.error("Transaction error");
        return;
      }

      toast.success(`Purchased ${item.name}!`);
      await updateProgress(mode === 'single_player' ? 'coins_collected_single' : 'coins_collected_multi', -item.price);
      await refetch();
    } catch (error: any) {
      toast.error(error.message || "Purchase failed");
    } finally {
      setPurchasingId(null);
    }
  };

  const handleEquipToggle = async (item: any) => {
    if (togglingId) return;
    
    setTogglingId(item.id);
    
    try {
      const inventoryItem = userInventory.find(inv => inv.item_id === item.id);
      if (!inventoryItem) {
        toast.error("Item not found in inventory");
        return;
      }

      if (inventoryItem.equipped) {
        await unequipItem(inventoryItem.id);
      } else {
        await equipItem(inventoryItem.id, item.type);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle item");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredItems = items.filter(item => item.type === activeCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {ITEM_CATEGORIES.map(cat => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 gap-2"
            >
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ITEM_CATEGORIES.map(cat => (
          <TabsContent key={cat.id} value={cat.id} className="mt-6">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No {cat.label.toLowerCase()} available in this shop
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredItems.map((item, index) => {
                  const owned = inventory.has(item.id);
                  const inventoryItem = userInventory.find(inv => inv.item_id === item.id);
                  const isEquipped = inventoryItem?.equipped || false;
                  const rarityStyle = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;
                  const isPurchasing = purchasingId === item.id;
                  const isToggling = togglingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`relative p-4 space-y-3 transition-all duration-300 hover:scale-105 animate-fade-in bg-card rounded-lg ${rarityStyle.bg} ${rarityStyle.glow}`}
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      {/* Rarity effects */}
                      {item.rarity === 'legendary' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/20 to-yellow-500/0 animate-pulse pointer-events-none rounded-lg" />
                      )}
                      {item.rarity === 'epic' && (
                        <div className="absolute top-2 right-2">
                          <Star className="h-4 w-4 text-purple-400 animate-pulse" />
                        </div>
                      )}
                      {item.rarity === 'rare' && (
                        <div className="absolute top-2 right-2">
                          <Sparkles className="h-4 w-4 text-blue-400" />
                        </div>
                      )}
                      
                      {/* Equipped indicator */}
                      {isEquipped && (
                        <div className="absolute top-2 left-2 bg-green-500 rounded-full p-1">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      
                      <ShopItemPreview 
                        type={item.type}
                        properties={item.properties}
                        rarity={item.rarity}
                      />
                      
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm truncate">{item.name}</h3>
                        <span className={`text-xs uppercase font-medium ${rarityStyle.text}`}>
                          {item.rarity}
                        </span>
                      </div>

                      {owned ? (
                        <Button
                          onClick={() => handleEquipToggle(item)}
                          variant={isEquipped ? "secondary" : "default"}
                          className={`w-full ${isEquipped ? 'bg-green-500/20 hover:bg-green-500/30' : ''}`}
                          size="sm"
                          disabled={isToggling}
                        >
                          {isToggling ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          ) : isEquipped ? (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              UNEQUIP
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              EQUIP
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => purchaseItem(item)}
                          className="w-full"
                          size="sm"
                          disabled={isPurchasing || item.price > currency}
                        >
                          {isPurchasing ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          ) : item.price === 0 ? (
                            "FREE"
                          ) : (
                            <span className="flex items-center gap-1">
                              <Coins className="h-3 w-3" />
                              {item.price}
                            </span>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export const SinglePlayerShopPage = () => {
  const { currency } = useRealtimeShop('single_player');
  
  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">SINGLE PLAYER SHOP</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-wider">Customize Your Game</p>
          </div>
          <div className="flex items-center gap-2 text-xl font-bold bg-accent px-4 py-2 rounded-lg">
            <Coins className="h-5 w-5 text-yellow-500" />
            {currency}
          </div>
        </div>
        <ShopContent mode="single_player" />
      </div>
    </Layout>
  );
};

export const MultiplayerShopPage = () => {
  const { currency } = useRealtimeShop('multiplayer');
  
  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">MULTIPLAYER SHOP</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-wider">Battle Customizations</p>
          </div>
          <div className="flex items-center gap-2 text-xl font-bold bg-accent px-4 py-2 rounded-lg">
            <Coins className="h-5 w-5 text-yellow-500" />
            {currency}
          </div>
        </div>
        <ShopContent mode="multiplayer" />
      </div>
    </Layout>
  );
};

export default SinglePlayerShopPage;