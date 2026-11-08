// src/config/primaryMenu.ts
type SubModule = {
  featureId: string;
  i18nPrefix: string;
  icon: string;
  cardGradient: string;
  route: string;
};

type MenuItem = {
  featureId: string;
  i18nPrefix: string;
  icon: string;
  cardGradient: string;
  route: string;
  enabled: boolean;
  children: SubModule[];
};

const menuList: MenuItem[] = [
  {
    featureId: 'dashboard',
    i18nPrefix: 'card.dashboard',
    icon: '📊',
    cardGradient: 'linear-gradient(135deg, #2ee6c8, #1cd0b0)',
    route: '/dashboard',
    enabled: true,
    children: []
  },
  {
    featureId: 'sports',
    i18nPrefix: 'card.sports',
    icon: '🏆',
    cardGradient: 'linear-gradient(135deg, #62d857, #28a745)',
    route: '/sports',
    enabled: true,
    children: [
      {
        featureId: 'sports-video',
        i18nPrefix: 'sub.sports.video',
        icon: '🏅',
        cardGradient: 'linear-gradient(135deg,#62d857,#28a745)',
        route: '/sports/video'
      }
    ]
  },
  {
    featureId: 'chinese',
    i18nPrefix: 'card.chinese',
    icon: '✍️',
    cardGradient: 'linear-gradient(135deg, #ed4337, #c62828)',
    route: '/chinese',
    enabled: true,
    children: [
      {
        featureId: 'chinese-writing',
        i18nPrefix: 'sub.chinese.writing',
        icon: '✏️',
        cardGradient: 'linear-gradient(135deg,#ed4337,#c62828)',
        route: '/chinese/writing'
      }
    ]
  },
  {
    featureId: 'english',
    i18nPrefix: 'card.english',
    icon: '🔤',
    cardGradient: 'linear-gradient(135deg, #364e86, #203864)',
    route: '/english',
    enabled: true,
    children: [
      {
        featureId: 'english-wordbank',
        i18nPrefix: 'sub.english.wordbank',
        icon: '🔤',
        cardGradient: 'linear-gradient(135deg, #3b5998, #274072)',
        route: '/english/wordbank'
      },
      {
        featureId: 'english-300',
        i18nPrefix: 'sub.english.300',
        icon: '📖',
        cardGradient: 'linear-gradient(135deg, #4267b2, #2f4b85)',
        route: '/english/300'
      },
      {
        featureId: 'english-video',
        i18nPrefix: 'sub.english.video',
        icon: '🎬',
        cardGradient: 'linear-gradient(135deg, #486fbb, #32518c)',
        route: '/english/video'
      },
      {
        featureId: 'english-short',
        i18nPrefix: 'sub.english.short',
        icon: '💬',
        cardGradient: 'linear-gradient(135deg, #5078c4, #385996)',
        route: '/english/short'
      }
    ]
  },
  {
    featureId: 'science',
    i18nPrefix: 'card.science',
    icon: '🔬',
    cardGradient: 'linear-gradient(135deg, #ffb726, #ff8800)',
    route: '/science',
    enabled: true,
    children: [
      {
        featureId: 'science-knowledge',
        i18nPrefix: 'sub.science.knowledge',
        icon: '📚',
        cardGradient: 'linear-gradient(135deg,#ffb726,#ff9500)',
        route: '/science/knowledge'
      },
      {
        featureId: 'science-encyclopedia',
        i18nPrefix: 'sub.science.encyclopedia',
        icon: '🌍',
        cardGradient: 'linear-gradient(135deg,#ffc033,#ff9f1a)',
        route: '/science/encyclopedia'
      }
    ]
  },
  {
    featureId: 'music',
    i18nPrefix: 'card.music',
    icon: '🎵',
    cardGradient: 'linear-gradient(135deg, #f062b8, #d82b7e)',
    route: '/music',
    enabled: true,
    children: [
      {
        featureId: 'music-cn-nursery',
        i18nPrefix: 'sub.music.cnNursery',
        icon: '🧸',
        cardGradient: 'linear-gradient(135deg,#b778d3,#d87ed0)',
        route: '/music/cn-nursery'
      },
      {
        featureId: 'music-cn-pop',
        i18nPrefix: 'sub.music.cnPop',
        icon: '🎤',
        cardGradient: 'linear-gradient(135deg,#b97cd6,#da80d3)',
        route: '/music/cn-pop'
      },
      {
        featureId: 'music-en-nursery',
        i18nPrefix: 'sub.music.enNursery',
        icon: '🐥',
        cardGradient: 'linear-gradient(135deg,#bc80d9,#dc83d6)',
        route: '/music/en-nursery'
      },
      {
        featureId: 'music-en-pop',
        i18nPrefix: 'sub.music.enPop',
        icon: '🎧',
        cardGradient: 'linear-gradient(135deg,#bf84dc,#de87d9)',
        route: '/music/en-pop'
      }
    ]
  },
  {
    featureId: 'games',
    i18nPrefix: 'card.games',
    icon: '🎮',
    cardGradient: 'linear-gradient(135deg, #34b8eb, #0288d1)',
    route: '/games',
    enabled: true,
    children: [
      {
        featureId: 'checkers',
        i18nPrefix: 'sub.games.checkers',
        icon: '♟️',
        cardGradient: 'linear-gradient(135deg,#6366f1,#4f46e5)',
        route: '/games/checkers'
      },
      {
        featureId: 'color-match',
        i18nPrefix: 'sub.games.colorMatch',
        icon: '🎨',
        cardGradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
        route: '/games/color-match'
      },
      {
        featureId: 'doushouqi',
        i18nPrefix: 'sub.games.doushouqi',
        icon: '🐯',
        cardGradient: 'linear-gradient(135deg,#a855f7,#9333ea)',
        route: '/games/doushouqi'
      },
      {
        featureId: 'tictactoe',
        i18nPrefix: 'sub.games.tictactoe',
        icon: '⭕',
        cardGradient: 'linear-gradient(135deg,#c084fc,#a855f7)',
        route: '/games/tic-tac-toe'
      },
      {
        featureId: 'mahjong-pair',
        i18nPrefix: 'sub.games.mahjong',
        icon: '🀄',
        cardGradient: 'linear-gradient(135deg,#d8b4fe,#c084fc)',
        route: '/games/mahjong-pair'
      },
      {
        featureId: 'xiangqi',
        i18nPrefix: 'sub.games.xiangqi',
        icon: '♞',
        cardGradient: 'linear-gradient(135deg,#ddd6fe,#c4b5fd)',
        route: '/games/xiangqi'
      }
    ]
  },
  {
    featureId: 'books',
    i18nPrefix: 'card.books',
    icon: '📚',
    cardGradient: 'linear-gradient(135deg, #7b61ff, #512da8)',
    route: '/books',
    enabled: true,
    children: []
  }
];

export function getEnabledPrimaryMenus(): MenuItem[] {
  return menuList.filter(item => item.enabled);
}
export const primaryMenu = menuList;
