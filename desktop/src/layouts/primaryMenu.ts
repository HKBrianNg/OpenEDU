// desktop/src/layouts/primaryMenu.ts

export type SubModule = {
  i18nPrefix: string;
  icon: string;
  cardGradient: string;
  route: string;
};

export type MenuItem = {
  i18nPrefix: string;
  icon: string;
  cardGradient: string;
  route: string;
  children: SubModule[];
};

const menuList: MenuItem[] = [
  {
    i18nPrefix: 'card.home',
    icon: '🏠',
    cardGradient: 'linear-gradient(135deg, #6ea8fe, #3d7fdf)',
    route: '/',
    children: []
  },
  {
    i18nPrefix: 'card.dashboard',
    icon: '📊',
    cardGradient: 'linear-gradient(135deg, #2ee6c8, #1cd0b0)',
    route: '/dashboard',
    children: [
      {
        i18nPrefix: 'sub.dashboard.learningResults',
        icon: '📈',
        cardGradient: 'linear-gradient(135deg, #2ee6c8, #1cd0b0)',
        route: '/dashboard/learning-results'
      },
      {
        i18nPrefix: 'sub.dashboard.myCalendar',
        icon: '📅',
        cardGradient: 'linear-gradient(135deg, #2ee6c8, #1cd0b0)',
        route: '/dashboard/my-calendar'
      },
      {
        i18nPrefix: 'sub.dashboard.adminConsole',
        icon: '🛠️',
        cardGradient: 'linear-gradient(135deg, #2ee6c8, #1cd0b0)',
        route: '/dashboard/admin-console'
      }
    ]
  },
  {
    i18nPrefix: 'card.sports',
    icon: '🏆',
    cardGradient: 'linear-gradient(135deg, #62d857, #28a745)',
    route: '/sports',
    children: [
      {
        i18nPrefix: 'sub.sports.video',
        icon: '🏅',
        cardGradient: 'linear-gradient(135deg,#62d857,#28a745)',
        route: '/sports/video'
      }
    ]
  },
  {
    i18nPrefix: 'card.chinese',
    icon: '✍️',
    cardGradient: 'linear-gradient(135deg, #ed4337, #c62828)',
    route: '/chinese',
    children: [
      {
        i18nPrefix: 'sub.chinese.writing',
        icon: '✏️',
        cardGradient: 'linear-gradient(135deg,#ed4337,#c62828)',
        route: '/chinese/writing'
      }
    ]
  },
  {
    i18nPrefix: 'card.english',
    icon: '🔤',
    cardGradient: 'linear-gradient(135deg, #364e86, #203864)',
    route: '/english',
    children: [
      {
        i18nPrefix: 'sub.english.wordbank',
        icon: '🔤',
        cardGradient: 'linear-gradient(135deg, #3b5998, #274072)',
        route: '/english/englishword'
      },
      {
        i18nPrefix: 'sub.english.300',
        icon: '📖',
        cardGradient: 'linear-gradient(135deg, #4267b2, #2f4b85)',
        route: '/english/basic300'
      },
      {
        i18nPrefix: 'sub.english.video',
        icon: '🎬',
        cardGradient: 'linear-gradient(135deg, #486fbb, #32518c)',
        route: '/english/video'
      },
      {
        i18nPrefix: 'sub.english.short',
        icon: '💬',
        cardGradient: 'linear-gradient(135deg, #5078c4, #385996)',
        route: '/english/englishshorts'
      }
    ]
  },
  {
    i18nPrefix: 'card.science',
    icon: '🔬',
    cardGradient: 'linear-gradient(135deg, #ffb726, #ff8800)',
    route: '/science',
    children: [
      {
        i18nPrefix: 'sub.science.knowledge',
        icon: '📚',
        cardGradient: 'linear-gradient(135deg,#ffb726,#ff9500)',
        route: '/science/knowledge'
      },
      {
        i18nPrefix: 'sub.science.encyclopedia',
        icon: '🌍',
        cardGradient: 'linear-gradient(135deg,#ffc033,#ff9f1a)',
        route: '/science/encyclopedia'
      }
    ]
  },
  {
    i18nPrefix: 'card.music',
    icon: '🎵',
    cardGradient: 'linear-gradient(135deg, #f062b8, #d82b7e)',
    route: '/music',
    children: [
      {
        i18nPrefix: 'sub.music.cnNursery',
        icon: '🧸',
        cardGradient: 'linear-gradient(135deg,#b778d3,#d87ed0)',
        route: '/music/cn-nursery'
      },
      {
        i18nPrefix: 'sub.music.cnPop',
        icon: '🎤',
        cardGradient: 'linear-gradient(135deg,#b97cd6,#da80d3)',
        route: '/music/cn-pop'
      },
      {
        i18nPrefix: 'sub.music.enNursery',
        icon: '🐥',
        cardGradient: 'linear-gradient(135deg,#bc80d9,#dc83d6)',
        route: '/music/en-nursery'
      },
      {
        i18nPrefix: 'sub.music.enPop',
        icon: '🎧',
        cardGradient: 'linear-gradient(135deg,#bf84dc,#de87d9)',
        route: '/music/en-pop'
      }
    ]
  },
  {
    i18nPrefix: 'card.games',
    icon: '🎮',
    cardGradient: 'linear-gradient(135deg, #34b8eb, #0288d1)',
    route: '/games',
    children: [
      {
        i18nPrefix: 'sub.games.checkers',
        icon: '♟️',
        cardGradient: 'linear-gradient(135deg,#6366f1,#4f46e5)',
        route: '/games/checkers'
      },
      {
        i18nPrefix: 'sub.games.doushouqi',
        icon: '🐯',
        cardGradient: 'linear-gradient(135deg,#a855f7,#9333ea)',
        route: '/games/jungle'
      },
      {
        i18nPrefix: 'sub.games.tictactoe',
        icon: '⭕',
        cardGradient: 'linear-gradient(135deg,#c084fc,#a855f7)',
        route: '/games/tictactoe'
      },
      {
        i18nPrefix: 'sub.games.mahjong',
        icon: '🀄',
        cardGradient: 'linear-gradient(135deg,#d8b4fe,#c084fc)',
        route: '/games/tilematching'
      },
      {
        i18nPrefix: 'sub.games.xiangqi',
        icon: '♞',
        cardGradient: 'linear-gradient(135deg,#ddd6fe,#c4b5fd)',
        route: '/games/xiangqi'
      }
    ]
  },
  {
    i18nPrefix: 'card.books',
    icon: '📚',
    cardGradient: 'linear-gradient(135deg, #7b61ff, #512da8)',
    route: '/books',
    children: []
  }
];

export const primaryMenu = menuList;