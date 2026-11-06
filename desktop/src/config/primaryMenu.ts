// src/config/primaryMenu.ts

type MenuItem = {
  featureId: string;
  i18nPrefix: string;
  icon: string;
  cardGradient: string;
  route: string;
  enabled: boolean;
};

const menuList: MenuItem[] = [
  {
    featureId: 'dashboard',
    i18nPrefix: 'card.dashboard',
    icon: 'DashboardOutlined',
    cardGradient: 'linear-gradient(135deg, #2ee6c8, #1cd0b0)',
    route: '/dashboard',
    enabled: true
  },
  {
    featureId: 'sports',
    i18nPrefix: 'card.sports',
    icon: 'HikingOutlined',
    cardGradient: 'linear-gradient(135deg, #62d857, #28a745)',
    route: '/sports',
    enabled: true
  },
  {
    featureId: 'chinese',
    i18nPrefix: 'card.chinese',
    icon: 'BookOutlined',
    cardGradient: 'linear-gradient(135deg, #ed4337, #c62828)',
    route: '/chinese',
    enabled: true
  },
  {
    featureId: 'english',
    i18nPrefix: 'card.english',
    icon: 'FontSizeOutlined',
    cardGradient: 'linear-gradient(135deg, #364e86, #203864)',
    route: '/english',
    enabled: true
  },
  {
    featureId: 'science',
    i18nPrefix: 'card.science',
    icon: 'ExperimentOutlined',
    cardGradient: 'linear-gradient(135deg, #ffb726, #ff8800)',
    route: '/science',
    enabled: true
  },
  {
    featureId: 'music',
    i18nPrefix: 'card.music',
    icon: 'MusicNoteOutlined',
    cardGradient: 'linear-gradient(135deg, #f062b8, #d82b7e)',
    route: '/music',
    enabled: true
  },
  {
    featureId: 'games',
    i18nPrefix: 'card.games',
    icon: 'GameConsoleOutlined',
    cardGradient: 'linear-gradient(135deg, #34b8eb, #0288d1)',
    route: '/games',
    enabled: true
  },
  {
    featureId: 'books',
    i18nPrefix: 'card.books',
    icon: 'BookOpenOutlined',
    cardGradient: 'linear-gradient(135deg, #7b61ff, #512da8)',
    route: '/books',
    enabled: true
  }
];

export function getEnabledPrimaryMenus(): MenuItem[] {
  return menuList.filter(item => item.enabled);
}

export const primaryMenus = menuList;
export const primaryMenu = menuList;
