import { DrinkDefinition, DrinkId } from '@/types';

export const DRINKS: DrinkDefinition[] = [
  { id: 'beer_pint',   name: 'Birra (330ml)',  calories: 150, icon: '🍺' },
  { id: 'beer_large',  name: 'Birra (500ml)',  calories: 215, icon: '🍺' },
  { id: 'wine_glass',  name: 'Vino (150ml)',   calories: 120, icon: '🍷' },
  { id: 'wine_large',  name: 'Vino (250ml)',   calories: 200, icon: '🍷' },
  { id: 'prosecco',    name: 'Prosecco',       calories: 105, icon: '🥂' },
  { id: 'spritz',      name: 'Spritz',         calories: 130, icon: '🍊' },
  { id: 'cocktail',    name: 'Cocktail',       calories: 180, icon: '🍹' },
  { id: 'shot',        name: 'Shot (40ml)',    calories: 97,  icon: '🥃' },
  { id: 'whisky',      name: 'Whisky (40ml)',  calories: 105, icon: '🥃' },
  { id: 'gin_tonic',   name: 'Gin Tonic',      calories: 160, icon: '🍸' },
  { id: 'mojito',      name: 'Mojito',         calories: 200, icon: '🍹' },
  { id: 'amaro',       name: 'Amaro (40ml)',   calories: 90,  icon: '🥃' },
];

export const DRINK_MAP: Record<DrinkId, DrinkDefinition> = Object.fromEntries(
  DRINKS.map((d) => [d.id, d])
) as Record<DrinkId, DrinkDefinition>;
