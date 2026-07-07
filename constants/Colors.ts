export interface ThemeColors {
  bg: string;
  bgAlt: string;
  card: string;
  cardAlt: string;
  text: string;
  textDim: string;
  textFaint: string;
  border: string;
  tint: string;
  shadow: string;
}

export const LightColors: ThemeColors = {
  bg: '#f8f8f8',
  bgAlt: '#f0f0f0',
  card: '#ffffff',
  cardAlt: '#FFFBEA',
  text: '#1a1a1a',
  textDim: '#555555',
  textFaint: '#aaaaaa',
  border: '#f0f0f0',
  tint: '#2f95dc',
  shadow: '#000000',
};

export const DarkColors: ThemeColors = {
  bg: '#121212',
  bgAlt: '#1a1a1a',
  card: '#1e1e1e',
  cardAlt: '#2a2410',
  text: '#f0f0f0',
  textDim: '#b0b0b0',
  textFaint: '#777777',
  border: '#2a2a2a',
  tint: '#4da8e8',
  shadow: '#000000',
};

export default { light: LightColors, dark: DarkColors };
