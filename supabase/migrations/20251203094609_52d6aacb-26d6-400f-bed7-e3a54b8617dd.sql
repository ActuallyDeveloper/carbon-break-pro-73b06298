-- Delete all existing shop items
DELETE FROM user_inventory;
DELETE FROM shop_items;

-- Insert new modern shop items organized by category

-- BALLS
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Classic Ball', 'ball', 'both', 0, 'common', '{"color": "default", "effect": "none"}'),
('Ruby Ball', 'ball', 'both', 50, 'rare', '{"color": "#ef4444", "effect": "glow"}'),
('Sapphire Ball', 'ball', 'both', 50, 'rare', '{"color": "#3b82f6", "effect": "glow"}'),
('Emerald Ball', 'ball', 'both', 50, 'rare', '{"color": "#10b981", "effect": "glow"}'),
('Inferno Ball', 'ball', 'both', 120, 'epic', '{"color": "#f97316", "effect": "fire"}'),
('Frost Ball', 'ball', 'both', 120, 'epic', '{"color": "#06b6d4", "effect": "ice"}'),
('Storm Ball', 'ball', 'both', 150, 'epic', '{"color": "#eab308", "effect": "lightning"}'),
('Void Ball', 'ball', 'both', 200, 'legendary', '{"color": "#8b5cf6", "effect": "shadow"}'),
('Prismatic Ball', 'ball', 'both', 300, 'legendary', '{"color": "rainbow", "effect": "rainbow"}'),
('Nova Ball', 'ball', 'both', 350, 'legendary', '{"color": "#ec4899", "effect": "nova"}');

-- PADDLES
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Classic Paddle', 'paddle', 'both', 0, 'common', '{"color": "default", "effect": "none"}'),
('Iron Paddle', 'paddle', 'both', 40, 'rare', '{"color": "#71717a", "effect": "metal"}'),
('Bronze Paddle', 'paddle', 'both', 50, 'rare', '{"color": "#d97706", "effect": "metal"}'),
('Silver Paddle', 'paddle', 'both', 60, 'rare', '{"color": "#94a3b8", "effect": "shine"}'),
('Gold Paddle', 'paddle', 'both', 100, 'epic', '{"color": "#eab308", "effect": "shine"}'),
('Plasma Paddle', 'paddle', 'both', 150, 'epic', '{"color": "#a855f7", "effect": "energy"}'),
('Crystal Paddle', 'paddle', 'both', 200, 'legendary', '{"color": "#e0e7ff", "effect": "sparkle"}'),
('Diamond Paddle', 'paddle', 'both', 300, 'legendary', '{"color": "#67e8f9", "effect": "brilliant"}'),
('Celestial Paddle', 'paddle', 'both', 400, 'legendary', '{"color": "rainbow", "effect": "celestial"}');

-- TRAILS
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Basic Trail', 'trail', 'both', 0, 'common', '{"color": "default", "effect": "basic", "length": 5}'),
('Ember Trail', 'trail', 'both', 60, 'rare', '{"color": "#ef4444", "effect": "fire", "length": 8}'),
('Frost Trail', 'trail', 'both', 60, 'rare', '{"color": "#3b82f6", "effect": "ice", "length": 8}'),
('Spark Trail', 'trail', 'both', 80, 'rare', '{"color": "#eab308", "effect": "spark", "length": 8}'),
('Storm Trail', 'trail', 'both', 120, 'epic', '{"color": "#8b5cf6", "effect": "lightning", "length": 10}'),
('Shadow Trail', 'trail', 'both', 120, 'epic', '{"color": "#64748b", "effect": "shadow", "length": 10}'),
('Aurora Trail', 'trail', 'both', 200, 'legendary', '{"color": "rainbow", "effect": "rainbow", "length": 15}'),
('Cosmic Trail', 'trail', 'both', 300, 'legendary', '{"color": "#ec4899", "effect": "cosmic", "length": 20}');

-- BRICKS
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Standard Brick', 'brick', 'both', 0, 'common', '{"effect": "none"}'),
('Glowing Brick', 'brick', 'both', 50, 'rare', '{"effect": "glow", "color": "#3b82f6"}'),
('Pulsing Brick', 'brick', 'both', 60, 'rare', '{"effect": "pulse", "color": "#10b981"}'),
('Explosive Brick', 'brick', 'both', 100, 'epic', '{"effect": "explosion", "color": "#ef4444"}'),
('Dissolving Brick', 'brick', 'both', 100, 'epic', '{"effect": "dissolve", "color": "#a855f7"}'),
('Shatter Brick', 'brick', 'both', 150, 'legendary', '{"effect": "shatter", "color": "#eab308"}'),
('Void Brick', 'brick', 'both', 200, 'legendary', '{"effect": "void", "color": "#1f2937"}');

-- EXPLOSIONS
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Basic Explosion', 'explosion', 'both', 0, 'common', '{"type": "basic", "intensity": 1}'),
('Fire Burst', 'explosion', 'both', 70, 'rare', '{"type": "fire", "intensity": 1.2}'),
('Ice Shatter', 'explosion', 'both', 70, 'rare', '{"type": "ice", "intensity": 1.2}'),
('Electric Burst', 'explosion', 'both', 120, 'epic', '{"type": "lightning", "intensity": 1.5}'),
('Plasma Burst', 'explosion', 'both', 150, 'epic', '{"type": "plasma", "intensity": 1.5}'),
('Black Hole', 'explosion', 'both', 250, 'legendary', '{"type": "blackhole", "intensity": 2}'),
('Supernova', 'explosion', 'both', 350, 'legendary', '{"type": "supernova", "intensity": 2.5}');

-- BACKGROUNDS
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Default Background', 'background', 'both', 0, 'common', '{"theme": "default"}'),
('Starfield', 'background', 'both', 80, 'rare', '{"theme": "space"}'),
('Neon Grid', 'background', 'both', 80, 'rare', '{"theme": "neon"}'),
('Matrix Rain', 'background', 'both', 100, 'rare', '{"theme": "matrix"}'),
('Sunset Gradient', 'background', 'both', 120, 'epic', '{"theme": "gradient", "color1": "#f97316", "color2": "#ec4899"}'),
('Ocean Depth', 'background', 'both', 120, 'epic', '{"theme": "gradient", "color1": "#0ea5e9", "color2": "#1e3a8a"}'),
('Aurora Borealis', 'background', 'both', 200, 'legendary', '{"theme": "aurora"}'),
('Galaxy', 'background', 'both', 300, 'legendary', '{"theme": "galaxy"}');

-- AURAS
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('None', 'aura', 'both', 0, 'common', '{"type": "none"}'),
('Fire Aura', 'aura', 'both', 80, 'rare', '{"type": "fire", "color": "#ef4444"}'),
('Ice Aura', 'aura', 'both', 80, 'rare', '{"type": "ice", "color": "#3b82f6"}'),
('Lightning Aura', 'aura', 'both', 120, 'epic', '{"type": "lightning", "color": "#eab308"}'),
('Shadow Aura', 'aura', 'both', 120, 'epic', '{"type": "shadow", "color": "#64748b"}'),
('Divine Aura', 'aura', 'both', 200, 'legendary', '{"type": "divine", "color": "#fbbf24"}'),
('Cosmic Aura', 'aura', 'both', 300, 'legendary', '{"type": "cosmic", "color": "#8b5cf6"}');