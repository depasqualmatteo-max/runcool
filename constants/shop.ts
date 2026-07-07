export type SkinVariant = 'base' | 'gold' | 'pro' | 'proGold';

export interface ShopSkin {
  id: number;
  name: string;
  price: number;
  sprite: 1 | 2;
  spriteCell: number;
  achievement?: boolean;
  achievementMedalId?: string;
  animalLocked?: boolean;
}

export interface ShopBg {
  id: number;
  name: string;
  color: string;
  price: number;
  image?: any;
  secretOnly?: boolean;
}

export const SHOP_SKINS: ShopSkin[] = [
  { id: 0,  name: 'Maialino',   price: 0,  sprite: 2, spriteCell: 0 },
  { id: 1,  name: 'Supereroe',  price: 10, sprite: 1, spriteCell: 0 },
  { id: 2,  name: 'Gladiatore', price: 10, sprite: 1, spriteCell: 1 },
  { id: 3,  name: 'Soldato',    price: 10, sprite: 1, spriteCell: 2 },
  { id: 4,  name: 'Nerd',       price: 10, sprite: 1, spriteCell: 3 },
  { id: 5,  name: 'Ubriaco',    price: 10, sprite: 1, spriteCell: 4, achievement: true, achievementMedalId: 'alcolizzato' },
  { id: 6,  name: 'Palestrato', price: 10, sprite: 1, spriteCell: 5, achievement: true, achievementMedalId: 'centurione' },
  { id: 7,  name: 'Mago',       price: 10, sprite: 1, spriteCell: 6 },
  { id: 8,  name: 'Clown',      price: 10, sprite: 1, spriteCell: 7 },
  { id: 9,  name: 'Ciccione',   price: 10, sprite: 1, spriteCell: 8 },
  { id: 10, name: 'Lupo',       price: 20, sprite: 2, spriteCell: 1, animalLocked: true },
  { id: 11, name: 'Coniglio',   price: 0,  sprite: 2, spriteCell: 2 },
  { id: 12, name: 'Tartaruga',  price: 20, sprite: 2, spriteCell: 3, animalLocked: true },
  { id: 13, name: 'Gatto',      price: 20, sprite: 2, spriteCell: 4, animalLocked: true },
  { id: 14, name: 'Gufo',       price: 20, sprite: 2, spriteCell: 5, animalLocked: true },
  { id: 15, name: 'Foca',       price: 20, sprite: 2, spriteCell: 6, animalLocked: true },
  { id: 16, name: 'Leone',      price: 20, sprite: 2, spriteCell: 7, animalLocked: true },
  { id: 17, name: 'Orso',       price: 20, sprite: 2, spriteCell: 8, animalLocked: true },
];

export const VARIANT_SKIN_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11];
export const GOLD_PRICE = 50;
export const PRO_GOLD_PRICE = 100;
export const PRO_POINTS_NEEDED = 100;

export const SKIN_VARIANT_IMAGES: Record<number, Record<SkinVariant, any>> = {
  0: {
    base: null,
    gold: null,
    pro: require('@/assets/skin maiali/maialinopro.png'),
    proGold: require('@/assets/skin maiali/maialinoprooro.png'),
  },
  1: {
    base: null,
    gold: require('@/assets/skin maiali/supereroeoro.png'),
    pro: require('@/assets/skin maiali/supereroepro.png'),
    proGold: require('@/assets/skin maiali/supereroeprooro.png'),
  },
  2: {
    base: null,
    gold: require('@/assets/skin maiali/guerrierooro.png'),
    pro: require('@/assets/skin maiali/guerrieropro.png'),
    proGold: require('@/assets/skin maiali/guerrieroprooro.png'),
  },
  3: {
    base: null,
    gold: require('@/assets/skin maiali/soldatooro.png'),
    pro: require('@/assets/skin maiali/soldatopro.png'),
    proGold: require('@/assets/skin maiali/soldatoprooro.png'),
  },
  4: {
    base: null,
    gold: require('@/assets/skin maiali/nerdoro.png'),
    pro: require('@/assets/skin maiali/nerdpro.png'),
    proGold: require('@/assets/skin maiali/nerdprooro.png'),
  },
  5: {
    base: null,
    gold: require('@/assets/skin maiali/sbronzooro.png'),
    pro: require('@/assets/skin maiali/sbronzopro.png'),
    proGold: require('@/assets/skin maiali/sbronzoprooro.png'),
  },
  6: {
    base: null,
    gold: require('@/assets/skin maiali/palestratooro.png'),
    pro: require('@/assets/skin maiali/palestratopro.png'),
    proGold: require('@/assets/skin maiali/palestratoprooro.png'),
  },
  7: {
    base: null,
    gold: require('@/assets/skin maiali/magooro.png'),
    pro: require('@/assets/skin maiali/magopro.png'),
    proGold: require('@/assets/skin maiali/magoprooro.png'),
  },
  8: {
    base: null,
    gold: require('@/assets/skin maiali/clownoro.png'),
    pro: require('@/assets/skin maiali/clownpro.png'),
    proGold: require('@/assets/skin maiali/clownprooro.png'),
  },
  9: {
    base: null,
    gold: require('@/assets/skin maiali/ciccioneoro.png'),
    pro: require('@/assets/skin maiali/ciccionepro.png'),
    proGold: require('@/assets/skin maiali/ciccioneprooro.png'),
  },
  11: {
    base: null,
    gold: require('@/assets/skin maiali/conigliooro.png'),
    pro: require('@/assets/skin maiali/conigliopro.png'),
    proGold: require('@/assets/skin maiali/coniglioprooro.png'),
  },
};

export const SHOP_BGS: ShopBg[] = [
  { id: 0,  name: 'Giallo',     color: '#FFEAA7', price: 0  },
  { id: 1,  name: 'Grigio',     color: '#DFE6E9', price: 2  },
  { id: 2,  name: 'Corallo',    color: '#FAB1A0', price: 2  },
  { id: 3,  name: 'Turchese',   color: '#81ECEC', price: 2  },
  { id: 4,  name: 'Lavanda',    color: '#A29BFE', price: 2  },
  { id: 5,  name: 'Rosa',       color: '#FD79A8', price: 2  },
  { id: 6,  name: 'Verde',      color: '#55EFC4', price: 2  },
  { id: 7,  name: 'Arancio',    color: '#FDCB6E', price: 2  },
  { id: 8,  name: 'Blu',        color: '#74B9FF', price: 2  },
  { id: 9,  name: 'Notte',      color: '#2D3436', price: 2  },
  { id: 11, name: 'Rosso',      color: '#E74C3C', price: 2  },
  { id: 12, name: 'Secret',        color: '#f5e6d3', price: 0,  image: require('@/assets/sfondi/Secret.jpeg') },
  { id: 13, name: 'Stramilano',   color: '#d6e8f5', price: 0,  secretOnly: true, image: require('@/assets/sfondi/Stramilano.jpeg') },
  { id: 20, name: 'Arena',        color: '#e8d5b0', price: 10, image: require('@/assets/sfondi/Arena.png') },
  { id: 21, name: 'Campo mil.',   color: '#c8d8c0', price: 10, image: require('@/assets/sfondi/Campo militare.jpeg') },
  { id: 22, name: 'Circo',        color: '#f5d3e8', price: 10, image: require('@/assets/sfondi/Circo.png') },
  { id: 23, name: 'Delicious',    color: '#fce4b0', price: 0,  secretOnly: true, image: require('@/assets/sfondi/Delicious.png') },
  { id: 24, name: 'Palestra',     color: '#d0e8f5', price: 10, image: require('@/assets/sfondi/Palestra.jpeg') },
  { id: 25, name: 'Server Room',  color: '#c8d0e8', price: 10, image: require('@/assets/sfondi/Server room.jpeg') },
  { id: 26, name: 'Skyline',      color: '#b0c8e8', price: 10, image: require('@/assets/sfondi/Skyline.jpeg') },
  { id: 27, name: 'Sumo Ring',    color: '#f0e0c8', price: 10, image: require('@/assets/sfondi/Sumo ring.jpeg') },
  { id: 28, name: 'Taverna',      color: '#e8d0b8', price: 10, image: require('@/assets/sfondi/Taverna.jpeg') },
  { id: 29, name: 'Torre Magica', color: '#d8c8f0', price: 10, image: require('@/assets/sfondi/Torre magica.jpeg') },
];
