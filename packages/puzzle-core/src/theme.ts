/**
 * 主题词库：决定每个类别的名称与选项名词，以及文案语气。
 * 每个主题提供 4 个类别（前 3 个为标配，第 4 个「作案时段」在 K=4 时启用）。
 * 每个类别提供 6 个选项，支持 N 最大为 6。
 */

export interface CategoryTheme {
  id: string;
  name: string;
  options: string[];
}

export interface Theme {
  id: string;
  name: string;
  /** 受害者姓名（故事用） */
  victim: string;
  /** 案发场合（故事用） */
  occasion: string;
  /** 固定 4 个类别；使用前 K 个 */
  categories: CategoryTheme[];
}

export const THEMES: Theme[] = [
  {
    id: 'manor',
    name: '雾岭庄园',
    victim: '庄园主人沈万山',
    occasion: '六十寿宴',
    categories: [
      {
        id: 'suspect',
        name: '嫌疑人',
        options: ['白教授', '管家老陈', '歌手苏曼', '画家顾远', '医生林岚', '厨师阿福'],
      },
      {
        id: 'weapon',
        name: '凶器',
        options: ['黄铜烛台', '氰化物', '象牙匕首', '尼龙绳索', '铁扳手', '双管猎枪'],
      },
      {
        id: 'location',
        name: '地点',
        options: ['书房', '温室', '餐厅', '画廊', '酒窖', '琴房'],
      },
      {
        id: 'time',
        name: '作案时段',
        options: ['清晨', '上午', '正午', '午后', '黄昏', '午夜'],
      },
    ],
  },
  {
    id: 'station',
    name: '环轨空间站',
    victim: '货运船长罗格',
    occasion: '轨道交接班',
    categories: [
      {
        id: 'suspect',
        name: '船员',
        options: '指令长何舟 工程师麦琪 医生艾琳 科学家秦博士 通讯员小满 见习员阿凯'.split(' '),
      },
      {
        id: 'weapon',
        name: '关键物品',
        options: '氧气扳手 激光切割器 高压电缆 冷冻剂罐 冲击钻 磁力靴'.split(' '),
      },
      {
        id: 'location',
        name: '舱室',
        options: '指挥舱 实验舱 种植舱 居住舱 气闸舱 观景舱'.split(' '),
      },
      {
        id: 'time',
        name: '时刻',
        options: ['02:00', '06:00', '10:00', '14:00', '18:00', '22:00'],
      },
    ],
  },
  {
    id: 'palace',
    name: '宫廷晚宴',
    victim: '摄政老王爷',
    occasion: '中秋夜宴',
    categories: [
      {
        id: 'suspect',
        name: '宾客',
        options: '贵妃娘娘 首辅大人 御前侍卫 乐师倾城 太医令 内务总管'.split(' '),
      },
      {
        id: 'weapon',
        name: '信物',
        options: '金凤钗 鹤顶红 玉带钩 琵琶弦 银针 蜡丸'.split(' '),
      },
      {
        id: 'location',
        name: '宫殿',
        options: '养心殿 御花园 太和殿 偏殿 藏书阁 戏台'.split(' '),
      },
      {
        id: 'time',
        name: '时辰',
        options: '酉时 戌时 亥时 子时 丑时 寅时'.split(' '),
      },
    ],
  },
  {
    id: 'festival',
    name: '校园祭',
    victim: '学生会主席唐晓',
    occasion: '校园祭闭幕式',
    categories: [
      {
        id: 'suspect',
        name: '嫌疑人',
        options: '学生会会长 话剧社长 科学怪才 篮球队长 美术委员 广播站长'.split(' '),
      },
      {
        id: 'weapon',
        name: '物品',
        options: '奖杯 荧光试剂 绳结 图钉包 扩音器 烟雾饼'.split(' '),
      },
      {
        id: 'location',
        name: '地点',
        options: '礼堂 实验室 操场 美术室 广播室 仓库'.split(' '),
      },
      {
        id: 'time',
        name: '时段',
        options: '开幕前 午间 午后 黄昏 晚会时 闭幕后'.split(' '),
      },
    ],
  },
];

export function getTheme(id: string): Theme {
  const t = THEMES.find((t) => t.id === id);
  if (!t) throw new Error(`未知主题: ${id}`);
  return t;
}
