import type { FeatureMeta } from '@/types/feature'

export const featureList: FeatureMeta[] = [
  {
    featureId: 'home',
    menuKey: 'home',
    label: '首頁',
    enabledByDefault: true,
    routePath: '/'
  },
  {
    featureId: 'sports',
    menuKey: 'sports',
    label: '體育',
    enabledByDefault: true,
    routePath: '/sports'
  },
  {
    featureId: 'chinese',
    menuKey: 'chinese',
    label: '中文',
    enabledByDefault: true,
    routePath: '/chinese'
  },
  {
    featureId: 'english',
    menuKey: 'english',
    label: '英文',
    enabledByDefault: true,
    routePath: '/english',
    children: [
      {
        featureId: 'english.spelling-quiz',
        label: '詞彙拼寫測驗',
        enabledByDefault: true
      },
      {
        featureId: 'english.audio-lesson',
        label: '音頻課程',
        enabledByDefault: true
      }
    ]
  },
  {
    featureId: 'science',
    menuKey: 'science',
    label: '科學',
    enabledByDefault: true,
    routePath: '/science'
  },
  {
    featureId: 'music',
    menuKey: 'music',
    label: '音樂',
    enabledByDefault: true,
    routePath: '/music'
  },
  {
    featureId: 'games',
    menuKey: 'games',
    label: '遊戲',
    enabledByDefault: true,
    routePath: '/games',
    children: [
      {
        featureId: 'games.xiangqi',
        label: '中國象棋',
        enabledByDefault: true
      },
      {
        featureId: 'games.jungle',
        label: '鬥獸棋',
        enabledByDefault: true
      }
    ]
  },
  {
    featureId: 'books',
    menuKey: 'books',
    label: '書籍',
    enabledByDefault: true,
    routePath: '/books'
  },
  {
    featureId: 'settings',
    menuKey: 'settings',
    label: '設定',
    enabledByDefault: true,
    routePath: '/settings'
  }
]
