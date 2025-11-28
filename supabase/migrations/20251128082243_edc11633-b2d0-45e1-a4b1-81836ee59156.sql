-- Populate shop_items table with various customization options

-- Ball Skins
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Classic Ball', 'ball', 'both', 0, 'common', '{"color": "default"}'),
('Fire Ball', 'ball', 'both', 100, 'rare', '{"color": "red", "effect": "fire"}'),
('Ice Ball', 'ball', 'both', 100, 'rare', '{"color": "blue", "effect": "ice"}'),
('Lightning Ball', 'ball', 'both', 250, 'epic', '{"color": "yellow", "effect": "lightning"}'),
('Rainbow Ball', 'ball', 'both', 500, 'legendary', '{"color": "rainbow", "effect": "rainbow"}'),
('Shadow Ball', 'ball', 'both', 150, 'rare', '{"color": "purple", "effect": "shadow"}'),
('Neon Ball', 'ball', 'both', 200, 'epic', '{"color": "neon", "effect": "glow"}');

-- Paddle Skins
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Classic Paddle', 'paddle', 'both', 0, 'common', '{"color": "default"}'),
('Steel Paddle', 'paddle', 'both', 80, 'rare', '{"color": "silver", "effect": "metal"}'),
('Gold Paddle', 'paddle', 'both', 120, 'rare', '{"color": "gold", "effect": "shine"}'),
('Crystal Paddle', 'paddle', 'both', 200, 'epic', '{"color": "crystal", "effect": "sparkle"}'),
('Plasma Paddle', 'paddle', 'both', 400, 'legendary', '{"color": "plasma", "effect": "energy"}'),
('Wooden Paddle', 'paddle', 'both', 50, 'common', '{"color": "brown", "effect": "wood"}'),
('Diamond Paddle', 'paddle', 'both', 600, 'legendary', '{"color": "diamond", "effect": "brilliant"}');

-- Brick Effects
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Standard Bricks', 'brick', 'both', 0, 'common', '{"effect": "none"}'),
('Exploding Bricks', 'brick', 'both', 150, 'rare', '{"effect": "explosion"}'),
('Dissolving Bricks', 'brick', 'both', 120, 'rare', '{"effect": "dissolve"}'),
('Shattering Bricks', 'brick', 'both', 180, 'epic', '{"effect": "shatter"}'),
('Particle Bricks', 'brick', 'both', 300, 'epic', '{"effect": "particles"}'),
('Glitch Bricks', 'brick', 'both', 450, 'legendary', '{"effect": "glitch"}');

-- Background Skins
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Default Background', 'background', 'both', 0, 'common', '{"theme": "default"}'),
('Space Background', 'background', 'both', 100, 'rare', '{"theme": "space", "animation": "stars"}'),
('Matrix Background', 'background', 'both', 150, 'rare', '{"theme": "matrix", "animation": "code"}'),
('Neon Grid', 'background', 'both', 200, 'epic', '{"theme": "neon", "animation": "grid"}'),
('Cosmic Waves', 'background', 'both', 350, 'legendary', '{"theme": "cosmic", "animation": "waves"}'),
('Cyber Circuit', 'background', 'both', 250, 'epic', '{"theme": "cyber", "animation": "circuit"}');

-- Special Effects (Auras)
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Bat Aura', 'aura', 'both', 300, 'epic', '{"type": "bat", "animation": "flying"}'),
('Flower Aura', 'aura', 'both', 250, 'epic', '{"type": "flower", "animation": "petals"}'),
('Butterfly Aura', 'aura', 'both', 280, 'epic', '{"type": "butterfly", "animation": "flutter"}'),
('Fire Aura', 'aura', 'both', 400, 'legendary', '{"type": "fire", "animation": "flames"}'),
('Lightning Aura', 'aura', 'both', 450, 'legendary', '{"type": "lightning", "animation": "bolts"}'),
('Ice Aura', 'aura', 'both', 350, 'epic', '{"type": "ice", "animation": "crystals"}'),
('Shadow Aura', 'aura', 'both', 500, 'legendary', '{"type": "shadow", "animation": "smoke"}');

-- Explosion Effects
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Default Explosion', 'explosion', 'both', 0, 'common', '{"effect": "basic"}'),
('Firework Explosion', 'explosion', 'both', 120, 'rare', '{"effect": "firework", "particles": true}'),
('Nova Explosion', 'explosion', 'both', 200, 'epic', '{"effect": "nova", "shockwave": true}'),
('Blackhole Explosion', 'explosion', 'both', 400, 'legendary', '{"effect": "blackhole", "gravity": true}');

-- Skin Variations
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Retro Skin', 'skin', 'both', 100, 'rare', '{"theme": "retro", "pixelated": true}'),
('Futuristic Skin', 'skin', 'both', 150, 'rare', '{"theme": "futuristic", "metallic": true}'),
('Minimal Skin', 'skin', 'both', 80, 'common', '{"theme": "minimal", "clean": true}'),
('Holographic Skin', 'skin', 'both', 350, 'legendary', '{"theme": "hologram", "shimmer": true}');

-- Color Themes (Single Player)
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Sunset Theme', 'color', 'single_player', 150, 'rare', '{"primary": "orange", "secondary": "pink"}'),
('Ocean Theme', 'color', 'single_player', 150, 'rare', '{"primary": "blue", "secondary": "cyan"}'),
('Forest Theme', 'color', 'single_player', 150, 'rare', '{"primary": "green", "secondary": "lime"}'),
('Galaxy Theme', 'color', 'single_player', 300, 'epic', '{"primary": "purple", "secondary": "violet", "sparkle": true}');

-- Animations (Multiplayer)
INSERT INTO shop_items (name, type, mode, price, rarity, properties) VALUES
('Victory Dance', 'animation', 'multiplayer', 200, 'rare', '{"type": "emote", "duration": 3}'),
('Champion Pose', 'animation', 'multiplayer', 350, 'epic', '{"type": "emote", "duration": 5}'),
('Taunt Animation', 'animation', 'multiplayer', 150, 'rare', '{"type": "emote", "duration": 2}'),
('Ultimate Flex', 'animation', 'multiplayer', 500, 'legendary', '{"type": "emote", "duration": 8, "particles": true}');
