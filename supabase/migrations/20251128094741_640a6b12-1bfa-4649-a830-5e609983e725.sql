-- Lower all shop item prices to make them more affordable
UPDATE shop_items SET price = GREATEST(0, ROUND(price * 0.4)) WHERE price > 0;