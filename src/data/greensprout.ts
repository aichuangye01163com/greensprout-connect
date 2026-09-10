import coverRun from "@/assets/cover-run.jpg";
import coverCoffee from "@/assets/cover-coffee.jpg";
import coverBadminton from "@/assets/cover-badminton.jpg";
import coverMusic from "@/assets/cover-music.jpg";
import coverDinner from "@/assets/cover-dinner.jpg";
import coverWomen from "@/assets/cover-women.jpg";

/* ---------------- 配置化数据结构 ---------------- */

export type CategoryId =
  | "run"
  | "badminton"
  | "coffee"
  | "dinner"
  | "concert"
  | "women"
  | "boardgame"
  | "hiking";

export interface CategoryConfig {
  id: CategoryId;
  label: string;
  emoji: string;
  cover: string;
  defaultDurationHours: number;
  defaultLimit: number;
  defaultAgenda: string[];
  defaultTags: string[];
  defaultFee: number;
  defaultDeposit: number;
}

export const CATEGORIES: CategoryConfig[] = [
  {
    id: "run",
    label: "跑圈",
    emoji: "🏃",
    cover: coverRun,
    defaultDurationHours: 1.5,
    defaultLimit: 8,
    defaultAgenda: ["集合热身 15 分钟", "5 公里配速跑", "拉伸 + 自由交流"],
    defaultTags: ["晨跑", "轻社交", "户外"],
    defaultFee: 0,
    defaultDeposit: 0,
  },
  {
    id: "badminton",
    label: "羽毛球",
    emoji: "🏸",
    cover: coverBadminton,
    defaultDurationHours: 2,
    defaultLimit: 6,
    defaultAgenda: ["场地热身", "双打轮转", "结算场地费"],
    defaultTags: ["运动", "AA制", "室内"],
    defaultFee: 35,
    defaultDeposit: 20,
  },
  {
    id: "coffee",
    label: "咖啡",
    emoji: "☕",
    cover: coverCoffee,
    defaultDurationHours: 2,
    defaultLimit: 4,
    defaultAgenda: ["自我介绍一句话", "自由话题", "各自买单"],
    defaultTags: ["安静", "深聊", "工作日"],
    defaultFee: 0,
    defaultDeposit: 0,
  },
  {
    id: "dinner",
    label: "晚餐",
    emoji: "🍲",
    cover: coverDinner,
    defaultDurationHours: 2.5,
    defaultLimit: 6,
    defaultAgenda: ["点菜与破冰", "正餐时间", "散步消食"],
    defaultTags: ["AA制", "美食", "周末"],
    defaultFee: 120,
    defaultDeposit: 50,
  },
  {
    id: "concert",
    label: "音乐会",
    emoji: "🎻",
    cover: coverMusic,
    defaultDurationHours: 3,
    defaultLimit: 5,
    defaultAgenda: ["提前 30 分钟检票集合", "演出", "散场小酌"],
    defaultTags: ["现场", "需购票", "夜场"],
    defaultFee: 180,
    defaultDeposit: 180,
  },
  {
    id: "women",
    label: "女性专属",
    emoji: "🌿",
    cover: coverWomen,
    defaultDurationHours: 2.5,
    defaultLimit: 6,
    defaultAgenda: ["茶歇introduce", "手作体验", "合影留念"],
    defaultTags: ["仅限女生", "手作", "安全"],
    defaultFee: 88,
    defaultDeposit: 30,
  },
  {
    id: "boardgame",
    label: "桌游",
    emoji: "🎲",
    cover: coverCoffee,
    defaultDurationHours: 3,
    defaultLimit: 8,
    defaultAgenda: ["规则讲解", "开局", "复盘"],
    defaultTags: ["室内", "新手友好"],
    defaultFee: 40,
    defaultDeposit: 0,
  },
  {
    id: "hiking",
    label: "徒步",
    emoji: "🥾",
    cover: coverRun,
    defaultDurationHours: 5,
    defaultLimit: 10,
    defaultAgenda: ["地铁口集合", "登山", "山顶野餐"],
    defaultTags: ["户外", "全天", "体力要求"],
    defaultFee: 0,
    defaultDeposit: 0,
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryConfig>;

export type TimeRangeId = "week" | "1week" | "2weeks" | "1month";

export const TIME_RANGES: { id: TimeRangeId; label: string; maxDays: number }[] = [
  { id: "week", label: "本周", maxDays: 7 },
  { id: "1week", label: "一周后", maxDays: 14 },
  { id: "2weeks", label: "两周后", maxDays: 21 },
  { id: "1month", label: "一个月后", maxDays: 31 },
];

export const INCOME_TIERS = [
  "0-10万",
  "10-20万",
  "20-30万",
  "30-50万",
  "50-100万",
  "100万+",
  "不愿透露",
];

export const EDUCATION_LEVELS = ["高中及以下", "大专", "本科", "硕士", "博士"];
export const GENDERS = ["女", "男", "不愿透露"];

export interface EligibilityFilter {
  ageRange: [number, number];
  gender: "不限" | "仅限女生" | "仅限男生";
  education: string;
  income: string;
  note?: string;
}

export interface Host {
  name: string;
  avatar: string;
  city: string;
  hosted: number;
  rating: number;
  bio: string;
}

export interface GSEvent {
  id: string;
  title: string;
  category: CategoryId;
  cover: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  location: string;
  district: string;
  limit: number;
  joined: number;
  tags: string[];
  fee: number;
  deposit: number;
  host: Host;
  agenda: { time: string; text: string }[];
  eligibility: EligibilityFilter;
  description: string;
  status: "open" | "ended";
  attendees: { name: string; avatar: string; note: string }[];
  messages: { name: string; avatar: string; text: string; time: string }[];
  /** 私密活动室：需凭密码报名 */
  isPrivate?: boolean;
  /** 活动室密码（原型阶段仅本地校验） */
  roomPassword?: string;
  /** 定向邀请令牌，用于生成邀请链接 */
  inviteToken?: string;
}

/** 生成定向邀请令牌（无第三方依赖） */
export function makeInviteToken(seed = "") {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${seed.slice(0, 4) || "gs"}${rand}`;
}

/* ---------------- 时间工具 ---------------- */

const DAY = 86400000;

function baseDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function at(dayOffset: number, hour: number, minute = 0) {
  return new Date(baseDay() + dayOffset * DAY + hour * 3600000 + minute * 60000).toISOString();
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  const w = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${w}`;
}

export function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function daysFromNow(iso: string) {
  return Math.floor((new Date(iso).getTime() - baseDay()) / DAY);
}

/* ---------------- Mock 数据 ---------------- */

const hosts = {
  lin: {
    name: "林小满",
    avatar: "🌱",
    city: "上海 · 徐汇",
    hosted: 23,
    rating: 4.9,
    bio: "五年跑龄，配速 5'30。喜欢清晨的江边，讨厌迟到。",
  },
  zhou: {
    name: "周野",
    avatar: "🍃",
    city: "上海 · 静安",
    hosted: 11,
    rating: 4.7,
    bio: "程序员 / 业余羽毛球двойка。球场上认真，场下随和。",
  },
  chen: {
    name: "陈知遥",
    avatar: "☁️",
    city: "上海 · 黄浦",
    hosted: 38,
    rating: 5.0,
    bio: "独立书店主理人。聊书、聊城市、不聊八卦。",
  },
  su: {
    name: "苏念",
    avatar: "🌾",
    city: "上海 · 长宁",
    hosted: 16,
    rating: 4.8,
    bio: "陶艺工作室老师，只组织女生局，安全第一。",
  },
  he: {
    name: "何屿",
    avatar: "🎐",
    city: "上海 · 浦东",
    hosted: 7,
    rating: 4.6,
    bio: "古典乐爱好者，一年看 40 场现场。",
  },
} satisfies Record<string, Host>;

function mkAgenda(items: string[], startHour: number) {
  return items.map((text, i) => ({
    time: `${String(startHour + i).padStart(2, "0")}:00`,
    text,
  }));
}

export const EVENTS: GSEvent[] = [
  {
    id: "e1",
    title: "滨江晨跑 5 公里 · 配速 6'00 友好局",
    category: "run",
    cover: coverRun,
    startsAt: at(1, 7, 0),
    endsAt: at(1, 8, 30),
    location: "徐汇滨江跑道 · 龙腾大道入口",
    district: "徐汇",
    limit: 8,
    joined: 5,
    tags: ["晨跑", "轻社交", "新手友好"],
    fee: 0,
    deposit: 0,
    host: hosts.lin,
    agenda: mkAgenda(["集合打卡 + 热身", "5 公里慢跑", "拉伸与咖啡"], 7),
    eligibility: {
      ageRange: [20, 38],
      gender: "不限",
      education: "不限",
      income: "不限",
      note: "能连续慢跑 3 公里即可",
    },
    description:
      "不追配速，只求把早晨还给自己。跑完可以顺路在龙美术馆旁边喝杯手冲，散场随意。",
    status: "open",
    attendees: [
      { name: "阿萤", avatar: "🌼", note: "第一次参加，请多关照" },
      { name: "老K", avatar: "🌊", note: "常年 5'40 配速" },
      { name: "Mia", avatar: "🍋", note: "带了两瓶电解质水" },
      { name: "杨帆", avatar: "🪵", note: "住附近，可以带路" },
      { name: "南南", avatar: "🌙", note: "跑完想吃早饭" },
    ],
    messages: [
      { name: "林小满", avatar: "🌱", text: "明早 6:50 龙腾大道入口的银杏树下集合～", time: "昨天 21:12" },
      { name: "阿萤", avatar: "🌼", text: "收到！下雨的话还跑吗？", time: "昨天 21:20" },
      { name: "林小满", avatar: "🌱", text: "小雨照跑，大雨群里通知改期。", time: "昨天 21:22" },
    ],
  },
  {
    id: "e2",
    title: "工作日夜场羽毛球 · 双打轮转",
    category: "badminton",
    cover: coverBadminton,
    startsAt: at(2, 19, 30),
    endsAt: at(2, 21, 30),
    location: "静安体育中心 3 号馆 · 5/6 号场",
    district: "静安",
    limit: 6,
    joined: 6,
    tags: ["运动", "AA制", "有球拍优先"],
    fee: 35,
    deposit: 20,
    host: hosts.zhou,
    agenda: mkAgenda(["签到热身", "双打轮转赛", "收拍结算"], 19),
    eligibility: {
      ageRange: [22, 40],
      gender: "不限",
      education: "不限",
      income: "不限",
      note: "会发高远球即可",
    },
    description: "两片场地两小时，六人轮转不休息太久。场地费 AA，定金用于占场，不可退。",
    status: "open",
    attendees: [
      { name: "周野", avatar: "🍃", note: "组织者" },
      { name: "大鹏", avatar: "🪁", note: "自带 3 个球" },
      { name: "圆圆", avatar: "🫧", note: "新手，求带" },
      { name: "Kenji", avatar: "🍁", note: "打了十年" },
      { name: "小雨", avatar: "☂️", note: "下班直接过去" },
      { name: "阿泽", avatar: "🌵", note: "迟到十分钟" },
    ],
    messages: [
      { name: "周野", avatar: "🍃", text: "人满啦，场地已定 5/6 号。", time: "今天 10:05" },
    ],
  },
  {
    id: "e3",
    title: "安静咖啡局 · 一人一本书，不聊工作",
    category: "coffee",
    cover: coverCoffee,
    startsAt: at(3, 14, 0),
    endsAt: at(3, 16, 0),
    location: "永康路 · 拾光咖啡二楼",
    district: "黄浦",
    limit: 4,
    joined: 2,
    tags: ["安静", "深聊", "不社恐"],
    fee: 0,
    deposit: 0,
    host: hosts.chen,
    agenda: mkAgenda(["各自点单落座", "自由阅读与交谈", "换书环节"], 14),
    eligibility: {
      ageRange: [24, 45],
      gender: "不限",
      education: "本科及以上",
      income: "不限",
      note: "请带一本你读完的书",
    },
    description: "四个人，两小时，一张长桌。不做自我介绍轮，聊到哪儿算哪儿。",
    status: "open",
    attendees: [
      { name: "陈知遥", avatar: "☁️", note: "组织者" },
      { name: "禾一", avatar: "🌾", note: "带《置身事内》" },
    ],
    messages: [],
  },
  {
    id: "e4",
    title: "六人家常晚餐 · 弄堂本帮菜",
    category: "dinner",
    cover: coverDinner,
    startsAt: at(6, 18, 30),
    endsAt: at(6, 21, 0),
    location: "进贤路 · 兰心餐厅",
    district: "黄浦",
    limit: 6,
    joined: 3,
    tags: ["AA制", "本帮菜", "周末"],
    fee: 120,
    deposit: 50,
    host: hosts.chen,
    agenda: mkAgenda(["集合点菜", "正餐", "散步到复兴公园"], 18),
    eligibility: {
      ageRange: [25, 40],
      gender: "不限",
      education: "不限",
      income: "20-30万",
      note: "人均 120 左右，不喝酒也欢迎",
    },
    description: "老店位子小，六人刚好一桌。定金 50 用于占位，爽约不退。",
    status: "open",
    attendees: [
      { name: "陈知遥", avatar: "☁️", note: "组织者" },
      { name: "林深", avatar: "🌲", note: "本地人，推荐红烧肉" },
      { name: "Ada", avatar: "🍒", note: "不吃辣" },
    ],
    messages: [{ name: "陈知遥", avatar: "☁️", text: "已订 18:30 的桌，迟到请提前说。", time: "今天 09:41" }],
  },
  {
    id: "e5",
    title: "小型室内乐现场 · 勃拉姆斯之夜",
    category: "concert",
    cover: coverMusic,
    startsAt: at(12, 19, 30),
    endsAt: at(12, 22, 0),
    location: "复兴中路 · 上音歌剧院小厅",
    district: "黄浦",
    limit: 5,
    joined: 4,
    tags: ["现场", "需自购票", "夜场"],
    fee: 180,
    deposit: 180,
    host: hosts.he,
    agenda: mkAgenda(["剧院门口集合", "上半场", "中场与下半场"], 19),
    eligibility: {
      ageRange: [22, 50],
      gender: "不限",
      education: "不限",
      income: "不限",
      note: "演出中请勿交谈",
    },
    description: "我已提前锁了连座五张，费用即票价，定金等于票价、不可退。",
    status: "open",
    attendees: [
      { name: "何屿", avatar: "🎐", note: "组织者" },
      { name: "岑岑", avatar: "🕯️", note: "第一次听现场" },
      { name: "Leo", avatar: "🎩", note: "乐迷十年" },
      { name: "小满", avatar: "🌱", note: "散场想聊两句" },
    ],
    messages: [{ name: "何屿", avatar: "🎐", text: "票已出，入场券当天群里发。", time: "3 天前" }],
  },
  {
    id: "e6",
    title: "女性专属 · 陶艺手作与下午茶",
    category: "women",
    cover: coverWomen,
    startsAt: at(9, 14, 0),
    endsAt: at(9, 16, 30),
    location: "长宁 · 素隐陶艺工作室",
    district: "长宁",
    limit: 6,
    joined: 4,
    tags: ["仅限女生", "手作", "新手友好"],
    fee: 88,
    deposit: 30,
    host: hosts.su,
    agenda: mkAgenda(["茶歇与介绍", "拉坯体验", "上釉与合影"], 14),
    eligibility: {
      ageRange: [20, 45],
      gender: "仅限女生",
      education: "不限",
      income: "不限",
      note: "作品两周后可取",
    },
    description: "只招女生，工作室有独立卫生间与储物柜。材料费 88 含一件成品烧制。",
    status: "open",
    attendees: [
      { name: "苏念", avatar: "🌾", note: "组织者" },
      { name: "元宝", avatar: "🍑", note: "想做个杯子" },
      { name: "Nana", avatar: "🌷", note: "带朋友一起" },
      { name: "小鹿", avatar: "🦌", note: "第一次玩泥巴" },
    ],
    messages: [{ name: "苏念", avatar: "🌾", text: "记得穿深色旧衣服～", time: "昨天 18:03" }],
  },
  {
    id: "e7",
    title: "环世纪公园骑行 + 野餐（已结束）",
    category: "hiking",
    cover: coverRun,
    startsAt: at(-2, 9, 0),
    endsAt: at(-2, 13, 0),
    location: "浦东 · 世纪公园 2 号门",
    district: "浦东",
    limit: 10,
    joined: 10,
    tags: ["户外", "已结束"],
    fee: 0,
    deposit: 0,
    host: hosts.lin,
    agenda: mkAgenda(["集合租车", "环湖骑行", "草坪野餐"], 9),
    eligibility: { ageRange: [18, 45], gender: "不限", education: "不限", income: "不限" },
    description: "本场已顺利结束，临时群将在活动结束 12 小时后自动解散。",
    status: "ended",
    attendees: [
      { name: "林小满", avatar: "🌱", note: "组织者" },
      { name: "阿萤", avatar: "🌼", note: "拍了很多照片" },
    ],
    messages: [{ name: "林小满", avatar: "🌱", text: "今天辛苦啦，照片稍后发。", time: "2 天前" }],
  },
  {
    id: "e8",
    title: "周中桌游夜 · 阿瓦隆与狼人",
    category: "boardgame",
    cover: coverCoffee,
    startsAt: at(18, 19, 0),
    endsAt: at(18, 22, 0),
    location: "五角场 · 骰子桌游吧",
    district: "杨浦",
    limit: 8,
    joined: 3,
    tags: ["室内", "新手友好", "AA制"],
    fee: 40,
    deposit: 0,
    host: hosts.zhou,
    agenda: mkAgenda(["规则讲解", "阿瓦隆三局", "自由局"], 19),
    eligibility: { ageRange: [20, 35], gender: "不限", education: "不限", income: "不限" },
    description: "包厢费 AA，大约每人 40。新手我会单独讲一遍规则。",
    status: "open",
    attendees: [
      { name: "周野", avatar: "🍃", note: "组织者" },
      { name: "豆豆", avatar: "🫘", note: "老玩家" },
      { name: "Ray", avatar: "⛅", note: "只玩阿瓦隆" },
    ],
    messages: [],
  },
  {
    id: "e9",
    title: "私密活动室 · 老友慢食晚餐（凭密码入场）",
    category: "dinner",
    cover: coverDinner,
    startsAt: at(4, 18, 30),
    endsAt: at(4, 21, 0),
    location: "武康路 · 巷口小馆（报名后告知门牌）",
    district: "徐汇",
    limit: 6,
    joined: 2,
    tags: ["私密活动室", "定向邀请", "AA制"],
    fee: 150,
    deposit: 50,
    host: hosts.chen,
    agenda: mkAgenda(["到店落座", "慢食与闲聊", "散步回家"], 18),
    eligibility: {
      ageRange: [26, 42],
      gender: "不限",
      education: "不限",
      income: "不限",
      note: "仅接受收到邀请链接的朋友",
    },
    description: "这是一场只对收到邀请的人开放的小桌。输入活动室密码即可报名并进入临时群。",
    status: "open",
    isPrivate: true,
    roomPassword: "9527",
    inviteToken: "wkl9527",
    attendees: [
      { name: "陈知遥", avatar: "☁️", note: "组织者" },
      { name: "禾一", avatar: "🌾", note: "被邀请入场" },
    ],
    messages: [
      { name: "陈知遥", avatar: "☁️", text: "密码只发给了名单上的朋友，请勿外传。", time: "今天 08:30" },
    ],
  },
];

/* ---------------- 个人资料配置 ---------------- */

export const HOBBY_TAGS = [
  "跑步","羽毛球","网球","游泳","健身","瑜伽","攀岩","滑板","骑行","徒步",
  "露营","滑雪","潜水","足球","篮球","乒乓球","桌游","剧本杀","围棋","飞盘",
  "咖啡","品茶","烘焙","做饭","红酒","精酿","美食探店","甜品","素食","夜宵",
  "看展","话剧","古典乐","livehouse","民谣","摄影","绘画","陶艺","手工","书法",
  "读书","写作","播客","电影","动漫","编程","创业","理财","语言学习","心理学",
];

export const DEFAULT_PROFILE = {
  nickname: "林小满",
  email: "linxiaoman@example.com",
  emailVerified: false,
  gender: "女",
  age: 28,
  avatar: "🌱",
  city: "上海 · 徐汇",
  education: "硕士",
  university: "同济大学",
  career: "产品设计师",
  income: "30-50万",
  hobbies: ["跑步", "咖啡", "看展", "陶艺", "读书"],
  landmines: "不喜欢临时放鸽子、活动中推销课程、过度打听收入。",
  showLiked: true,
  showHosted: true,
  createdEventIds: [] as string[],
  joinedEventIds: [] as string[],
};

export const AVATAR_CHOICES = ["🌱", "🍃", "☁️", "🌾", "🎐", "🌼", "🫧", "🌙", "🍋", "🪵"];
