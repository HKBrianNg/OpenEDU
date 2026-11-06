export interface SubModule {
  featureId: string;
  route: string;
  label: string;
  description: string;
  icon: string;
}

export interface PrimaryMenuItem {
  featureId: string;
  route: string;
  label: string;
  description: string;
  icon: string;
  cardGradient: string;
  children: SubModule[];
}

export const primaryMenu: PrimaryMenuItem[] = [
  {
    featureId: "dashboard",
    route: "/dashboard",
    label: "仪表板",
    description: "歌曲与内容管理后台，用于维护平台资源",
    icon: "DatabaseOutlined",
    cardGradient: "linear-gradient(135deg,#34f0c0,#20e8b8)",
    children: []
  },
  {
    featureId: "sport",
    route: "/sport",
    label: "体育",
    description: "体育项目、运动常识与趣味运动学习",
    icon: "TrophyOutlined",
    cardGradient: "linear-gradient(135deg,#76d848,#28a860)",
    children: []
  },
  {
    featureId: "chinese",
    route: "/chinese",
    label: "中文",
    description: "识字、诗词、看图学中文等语文学习内容",
    icon: "EditOutlined",
    cardGradient: "linear-gradient(135deg,#f04038,#c82820)",
    children: []
  },
  {
    featureId: "english",
    route: "/english",
    label: "英文",
    description: "单词、句子、听力、拼写等英语启蒙学习",
    icon: "ReadOutlined",
    cardGradient: "linear-gradient(135deg,#3658a0,#243860)",
    children: [
      {
        featureId: "english.wordlib",
        route: "/english/wordlib",
        label: "英文字库",
        description: "配图单词认读，积累基础词汇",
        icon: "BookOutlined"
      },
      {
        featureId: "english.300sentence",
        route: "/english/300sentence",
        label: "基础英文300句",
        description: "跟读、听写、拼写练习常用短句",
        icon: "VolumeUpOutlined"
      },
      {
        featureId: "english.shortvideo",
        route: "/english/shortvideo",
        label: "短片学英语",
        description: "趣味短片，练习听力口语",
        icon: "VideoCameraOutlined"
      },
      {
        featureId: "english.phrase",
        route: "/english/phrase",
        label: "日常短句",
        description: "地道口语短句，日常脱口练习",
        icon: "MessageOutlined"
      }
    ]
  },
  {
    featureId: "science",
    route: "/science",
    label: "科学",
    description: "自然、生物、天文等少儿科学科普",
    icon: "FlaskOutlined",
    cardGradient: "linear-gradient(135deg,#ffc020,#ff8800)",
    children: []
  },
  {
    featureId: "music",
    route: "/music",
    label: "音乐",
    description: "儿歌、英文歌曲，律动与听觉启蒙",
    icon: "MusicOutlined",
    cardGradient: "linear-gradient(135deg,#f070d0,#e83878)",
    children: []
  },
  {
    featureId: "games",
    route: "/games",
    label: "游戏",
    description: "棋类、益智小游戏，锻炼思维能力",
    icon: "GamepadOutlined",
    cardGradient: "linear-gradient(135deg,#38c8ff,#1888d0)",
    children: [
      {
        featureId: "game.xiangqi",
        route: "/games/xiangqi",
        label: "中国象棋",
        description: "和AI对弈象棋",
        icon: "TrophyOutlined"
      },
      {
        featureId: "game.jungle",
        route: "/games/jungle",
        label: "斗兽棋",
        description: "趣味斗兽棋对战",
        icon: "BlockOutlined",
      },
      {
        featureId: "game.checkers",
        route: "/games/checkers",
        label: "跳棋",
        description: "经典波子跳棋",
        icon: "CircleOutlined"
      }
    ]
  },
  {
    featureId: "books",
    route: "/books",
    label: "读物",
    description: "绘本与短篇阅读材料",
    icon: "BookOutlined",
    cardGradient: "linear-gradient(135deg,#7860d8,#5038a0)",
    children: []
  }
];
