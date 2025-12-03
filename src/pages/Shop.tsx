import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Sparkles, Circle, Square, Flame, Palette, Zap, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ShopItemPreview } from "@/components/ShopItemPreview";
import { useRealtimeShop } from "@/hooks/useRealtimeShop";
import { useInventory } from "@/hooks/useInventory";
import { useAchievements } from "@/hooks/useAchievements";
import { useState } from "react";

const ITEM_CATEGORIES = [
  { id: 'ball', label: 'Balls', icon: Circle },
  { id: 'paddle', label: 'Paddles', icon: Square },
  { id: 'trail', label: 'Trails', icon: Sparkles },
  { id: 'brick', label: 'Bricks', icon: Square },
  { id: 'explosion', label: 'Explosions', icon: Flame },
  { id: 'background', label: 'Backgrounds', icon: Palette },
  { id: 'aura', label: 'Auras', icon: Zap },
];

const RARITY_STYLES: Record<string, { bg: string; glow: string; text: string }> = {
  common: { bg: 'bg-muted/50', glow: '', text: 'text-muted-foreground' },
  rare: { bg: 'bg-primary/10', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]', text: 'text-primary' },
  epic: { bg: 'bg-purple-500/10', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-pulse', text: 'text-purple-400' },
  legendary: { bg: 'bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20', glow: 'shadow-[0_0_30px_rgba(234,179,8,0.5)]', text: 'text-yellow-400' },
};

interface ShopProps {
  mode: 'single_player' | 'multiplayer';
}

const ShopContent = ({ mode }: ShopProps) => {
  const { user } = useAuth();
  const { items, currency, inventory, loading } = useRealtimeShop(mode);
  const { inventory: userInventory, equipItem, unequipItem } = useInventory(mode);
  const { updateProgress } = useAchievements();
  const [activeCategory, setActiveCategory] = useState('ball');

  const purchaseItem = async (item: any) => {
    if (!user) return;
    
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

    try {
      const { error: insertError } = await supabase.from("user_inventory").insert({
        user_id: user.id,
        item_id: item.id,
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

  const filteredItems = items.filter(item => item.type === activeCategory);

  if (loading) {
    return <div className="text-center text-muted-foreground py-8">Loading shop...</div>;
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item, index) => {
                const owned = inventory.has(item.id);
                const inventoryItem = userInventory.find(inv => inv.item_id === item.id);
                const isEquipped = inventoryItem?.equipped || false;
                const rarityStyle = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;

                return (
                  <div
                    key={item.id}
                    className={`relative p-4 space-y-3 transition-all duration-300 hover:scale-105 animate-fade-in bg-card ${rarityStyle.bg} ${rarityStyle.glow}`}
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    {item.rarity === 'legendary' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/20 to-yellow-500/0 animate-pulse pointer-events-none" />
                    )}
                    {item.rarity === 'epic' && (
                      <div className="absolute top-2 right-2">
                        <Star className="h-4 w-4 text-purple-400 animate-pulse" />
                      </div>
                    )}
                    
                    <ShopItemPreview 
                      type={item.type}
                      properties={item.properties}
                      rarity={item.rarity}
                    />
                    
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm">{item.name}</h3>
                      <span className={`text-xs uppercase font-medium ${rarityStyle.text}`}>
                        {item.rarity}
                      </span>
                    </div>

                    {owned ? (
                      <Button
                        onClick={() => handleEquipToggle(item)}
                        variant={isEquipped ? "secondary" : "default"}
                        className="w-full"
                        size="sm"
                      >
                        {isEquipped ? "UNEQUIP" : "EQUIP"}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => purchaseItem(item)}
                        className="w-full"
                        size="sm"
                        disabled={item.price === 0}
                      >
                        {item.price === 0 ? "FREE" : `${item.price} COINS`}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export const SinglePlayerShopPage = () => {
  const { items, currency } = useRealtimeShop('single_player');
  
  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">SINGLE PLAYER SHOP</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-wider">Customize Your Game</p>
          </div>
          <div className="flex items-center gap-2 text-xl font-bold bg-accent px-4 py-2">
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
          <div className="flex items-center gap-2 text-xl font-bold bg-accent px-4 py-2">
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