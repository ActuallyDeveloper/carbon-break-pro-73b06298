import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  item_id: string;
  equipped: boolean;
  item: {
    name: string;
    type: string;
    properties: any;
    mode: string;
  };
}

export const useInventory = (mode: 'single_player' | 'multiplayer') => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equippedItems, setEquippedItems] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    fetchInventory();

    // Real-time subscription for inventory updates
    const channel = supabase
      .channel(`inventory_updates:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_inventory',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, mode]);

  const fetchInventory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_inventory')
      .select(`
        id,
        item_id,
        equipped,
        item:shop_items(name, type, properties, mode)
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching inventory:', error);
      return;
    }

    const modeInventory = (data || []).filter(
      (item: any) => item.item?.mode === mode
    );
    
    setInventory(modeInventory);

    const equipped: Record<string, string> = {};
    modeInventory.forEach((item: any) => {
      if (item.equipped && item.item) {
        equipped[item.item.type] = item.item_id;
      }
    });
    setEquippedItems(equipped);
  };

  const equipItem = async (inventoryId: string, itemType: string) => {
    if (!user) return;

    try {
      // Unequip other items of the same type
      const itemsToUnequip = inventory.filter(
        (item) => item.item.type === itemType && item.equipped
      );

      for (const item of itemsToUnequip) {
        await supabase
          .from('user_inventory')
          .update({ equipped: false })
          .eq('id', item.id);
      }

      // Equip the new item
      const { error } = await supabase
        .from('user_inventory')
        .update({ equipped: true })
        .eq('id', inventoryId);

      if (error) throw error;

      await fetchInventory();
      toast.success('Item equipped!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to equip item');
    }
  };

  const unequipItem = async (inventoryId: string) => {
    try {
      const { error } = await supabase
        .from('user_inventory')
        .update({ equipped: false })
        .eq('id', inventoryId);

      if (error) throw error;

      await fetchInventory();
      toast.success('Item unequipped!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to unequip item');
    }
  };

  // Convert equipped items to the format expected by GameCanvas with full item data
  const equippedItemsWithData = inventory
    .filter(item => item.equipped)
    .reduce((acc, item) => {
      if (item.item) {
        acc[item.item.type] = {
          id: item.item_id,
          name: item.item.name,
          properties: item.item.properties,
        };
      }
      return acc;
    }, {} as Record<string, { id: string; name: string; properties: any }>);

  return {
    inventory,
    equippedItems: equippedItemsWithData,
    equipItem,
    unequipItem,
    refetch: fetchInventory,
  };
};
