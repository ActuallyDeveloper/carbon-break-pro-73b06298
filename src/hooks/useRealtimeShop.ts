import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface ShopItem {
  id: string;
  name: string;
  type: string;
  mode: string;
  price: number;
  rarity: string;
  properties: any;
}

interface Currency {
  single_player_coins: number;
  multiplayer_coins: number;
}

export const useRealtimeShop = (mode: 'single_player' | 'multiplayer') => {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [currency, setCurrency] = useState(0);
  const [inventory, setInventory] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [{ data: shopItems }, { data: userCurrency }, { data: userInventory }] =
        await Promise.all([
          supabase
            .from("shop_items")
            .select("*")
            .in("mode", [mode, "both"])
            .order("rarity", { ascending: false }),
          supabase
            .from("user_currency")
            .select("*")
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("user_inventory")
            .select("item_id")
            .eq("user_id", user.id),
        ]);

      setItems(shopItems || []);
      const coinKey = mode === 'single_player' ? 'single_player_coins' : 'multiplayer_coins';
      setCurrency((userCurrency as Currency)?.[coinKey] || 0);
      setInventory(new Set(userInventory?.map((i) => i.item_id) || []));
      setLoading(false);
    };

    fetchData();

    // Real-time subscription for currency updates
    const currencyChannel = supabase
      .channel(`user_currency:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_currency',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as Currency;
          const coinKey = mode === 'single_player' ? 'single_player_coins' : 'multiplayer_coins';
          setCurrency(newData[coinKey] || 0);
        }
      )
      .subscribe();

    // Real-time subscription for inventory updates
    const inventoryChannel = supabase
      .channel(`user_inventory:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_inventory',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch inventory when it changes
          supabase
            .from("user_inventory")
            .select("item_id")
            .eq("user_id", user.id)
            .then(({ data }) => {
              setInventory(new Set(data?.map((i) => i.item_id) || []));
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(currencyChannel);
      supabase.removeChannel(inventoryChannel);
    };
  }, [user, mode]);

  return { items, currency, inventory, loading };
};
