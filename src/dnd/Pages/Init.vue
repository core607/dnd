<template>
  <div class="init-page" ref="wrap">
    <h2>创建角色</h2>

    <div class="section">
      <h3>基础信息</h3>

      <div class="row">
        <label>种族</label>
        <select v-model="race">
          <option v-for="r in races" :key="r" :value="r">{{ r }}</option>
        </select>
        <label>背景</label>
        <select v-model="background">
          <option v-for="b in backgrounds" :key="b" :value="b">{{ b }}</option>
        </select>
        <label>初始职业</label>
        <select v-model="cls">
          <option v-for="c in classes" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <!-- 某些职业 1 级必须选择子职业：联动显示选择框 -->
      <div class="row" v-if="needSubclassAtInit">
        <label>子职业</label>
        <select v-model="subclass">
          <option v-for="s in subclassOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="bg-info">
        <h4>种族特性</h4>
        <p class="desc">{{ raceInfo.description }}</p>
        <div class="chips" v-if="raceInfo.features && raceInfo.features.length">
          <span class="chip" v-for="f in raceInfo.features" :key="f">{{ f }}</span>
        </div>
      </div>
      <div class="bg-info">
        <p class="desc">{{ bgInfo.description }}</p>
        <div class="chips" v-if="bgInfo.skills && bgInfo.skills.length">
          <span class="chip" v-for="s in bgInfo.skills" :key="s">背景熟练：{{ s }}</span>
        </div>
        <div class="note" v-if="bgInfo.feature">特性：{{ bgInfo.feature }}</div>
      </div>
    </div>

    <div class="section">
      <h3>属性（点数分配：27 点，从 8 开始，最高 15）</h3>
      <div class="points">
        剩余点数：<b>{{ remainingPoints }}</b>
      </div>
      <div class="attr-rows">
        <div class="attr-row" v-for="k in sixAttrs" :key="k">
          <div class="k">{{ k }}</div>
          <button class="step" :disabled="!canDec(k)" @click="decAttr(k)">−</button>
          <div class="v">{{ attrs[k] }}</div>
          <button class="step" :disabled="!canInc(k)" @click="incAttr(k)">＋</button>
          <div class="cost" :class="{ disabled: !canInc(k) }">下一级花费：{{ nextCost(k) }}</div>
        </div>
      </div>
      <div class="row">
        <button @click="resetPointBuy">重置</button>
        <button @click="randomPointBuy">随机分配</button>
      </div>
    </div>

    <div class="section">
      <h3>熟练项（最多 2）</h3>
      <div class="skills">
        <label v-for="s in skills" :key="s">
          <input type="checkbox" :value="s" v-model="selectedSkills" :disabled="isSkillDisabled(s)" />
          {{ s }}
        </label>
      </div>
    </div>

    <div class="actions">
      <button @click="randomPointBuy">随机分配属性</button>
      <button class="primary" @click="save">保存并开始</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '../stores/chat';
import { useUiStore } from '../stores/ui';
import { storeToRefs } from 'pinia';
import { SUBCLASS_LEVEL, SUBCLASS_OPTIONS } from '../shared/classes';

declare const Mvu: any;

const router = useRouter();
const chat = useChatStore();
const ui = useUiStore();
const { stream } = storeToRefs(ui);

const races = ['人类', '精灵', '矮人', '半身人', '半精灵', '半兽人', '提夫林', '龙裔', '侏儒'];
const backgrounds = ['贵族', '士兵', '学者', '罪犯', '工匠', '水手', '侍僧', '流浪儿', '隐士', '猎人'];
const classes = [
  '战士',
  '法师',
  '盗贼',
  '牧师',
  '吟游诗人',
  '圣武士',
  '游侠',
  '武僧',
  '术士',
  '邪术师',
  '德鲁伊',
  '野蛮人',
];
const skills = [
  '运动',
  '体操',
  '巧手',
  '隐匿',
  '奥秘',
  '历史',
  '调查',
  '自然',
  '宗教',
  '驯兽',
  '洞悉',
  '医药',
  '察觉',
  '求生',
  '欺瞒',
  '威吓',
  '表演',
  '游说',
];

const race = ref(races[0]);
const background = ref(backgrounds[0]);
const cls = ref(classes[0]);
const sixAttrs = ['力量', '敏捷', '体质', '智力', '感知', '魅力'];

// 当选择需要 1 级即确立子职业的主职业时，展示子职业选择
const needSubclassAtInit = computed(() => SUBCLASS_LEVEL[cls.value] === 1);
const subclassOptions = computed<string[]>(() => (SUBCLASS_OPTIONS[cls.value] || []) as string[]);
const subclass = ref('');

// BG3 point-buy: base 8, cap 15, total 27 pts. Cost curve: to 9..13 cost 1/step; 14 cost 2; 15 cost 2
const base = 8;
const max = 15;
const attrs = ref<Record<string, number>>({ 力量: base, 敏捷: base, 体质: base, 智力: base, 感知: base, 魅力: base });
function stepCost(from: number, to: number) {
  let cost = 0;
  for (let v = from; v < to; v++) cost += v >= 13 ? 2 : 1; // 13->14:2, 14->15:2
  return cost;
}
const usedPoints = computed(() => {
  const sum = sixAttrs.reduce((acc, k) => acc + stepCost(base, attrs.value[k]), 0);
  return sum;
});
const remainingPoints = computed(() => 27 - usedPoints.value);
function canInc(k: string) {
  const v = attrs.value[k];
  if (v >= max) return false;
  const c = stepCost(v, v + 1);
  return remainingPoints.value >= c;
}
function canDec(k: string) {
  return attrs.value[k] > base;
}
function incAttr(k: string) {
  if (!canInc(k)) return;
  attrs.value[k] += 1;
}
function decAttr(k: string) {
  if (!canDec(k)) return;
  attrs.value[k] -= 1;
}
function nextCost(k: string) {
  const v = attrs.value[k];
  if (v >= max) return '-';
  return stepCost(v, v + 1);
}
function resetPointBuy() {
  sixAttrs.forEach(k => (attrs.value[k] = base));
}
function randomPointBuy() {
  resetPointBuy();
  // simple random fill respecting costs
  const order = sixAttrs.slice().sort(() => Math.random() - 0.5);
  let safety = 200;
  while (remainingPoints.value > 0 && safety-- > 0) {
    const k = order[Math.floor(Math.random() * order.length)];
    if (canInc(k)) attrs.value[k] += 1;
    else if (order.every(x => !canInc(x))) break;
  }
}

function abilityMod(score: number) {
  return Math.floor((score - 10) / 2);
}
function computeMaxHpByClass(clsName: string, con: number) {
  // DnD5e: 1级最大生命值 = 职业生命骰最大值 + 体质调整值
  const conMod = abilityMod(con);
  const hitDieMax: Record<string, number> = {
    野蛮人: 12,
    战士: 10,
    圣武士: 10,
    游侠: 10,
    武僧: 8,
    盗贼: 8,
    吟游诗人: 8,
    牧师: 8,
    德鲁伊: 8,
    法师: 6,
    术士: 6,
    邪术师: 8,
  };
  const die = hitDieMax[clsName] ?? 8;
  return Math.max(1, die + conMod);
}
function computeBaseAcByClass(clsName: string, dex: number) {
  // 简化：大多数1级基础 AC 按轻甲/中甲/无甲推导，仅作初始化用途
  const dexMod = abilityMod(dex);
  const table: Record<string, number | ((d: number) => number)> = {
    野蛮人: (d: number) => 10 + d + 2, // 无甲防御：10 + DEX + CON(≈+2 简化)
    武僧: (d: number) => 10 + d + 2, // 简化
    盗贼: (d: number) => 11 + d, // 皮甲
    游侠: (d: number) => 12 + Math.min(2, d), // 鳞甲
    战士: 16, // 链甲
    圣武士: 16, // 链甲
    牧师: 16, // 链甲（简化）
    德鲁伊: (d: number) => 12 + Math.min(2, d), // 鳞甲
    吟游诗人: (d: number) => 11 + d, // 皮甲
    法师: (d: number) => 10 + d,
    术士: (d: number) => 10 + d,
    邪术师: (d: number) => 11 + d, // 皮甲
  };
  const v = table[clsName];
  if (typeof v === 'function') return v(dexMod);
  if (typeof v === 'number') return v;
  return 11 + dexMod;
}

const equipmentByClass: Record<string, Record<string, any>> = {
  战士: {
    主手武器: { 名称: '长剑', 伤害: '1d8 斩击' },
    副手武器: { 名称: '盾牌', AC: 2 },
    护甲: { 名称: '链甲', AC: 16 },
  },
  野蛮人: {
    主手武器: { 名称: '巨斧', 伤害: '1d12 斩击' },
    副手武器: null,
    护甲: { 名称: '无甲', AC: null },
  },
  圣武士: {
    主手武器: { 名称: '长剑', 伤害: '1d8 斩击' },
    副手武器: { 名称: '盾牌', AC: 2 },
    护甲: { 名称: '链甲', AC: 16 },
  },
  游侠: {
    主手武器: { 名称: '长弓', 伤害: '1d8 穿刺' },
    副手武器: { 名称: '短剑', 伤害: '1d6 斩击' },
    护甲: { 名称: '鳞甲', AC: 14 },
  },
  盗贼: {
    主手武器: { 名称: '短剑', 伤害: '1d6 斩击' },
    副手武器: { 名称: '匕首', 伤害: '1d4 穿刺' },
    护甲: { 名称: '皮甲', AC: 11 },
  },
  武僧: {
    主手武器: { 名称: '短棍', 伤害: '1d6 钝击' },
    副手武器: null,
    护甲: { 名称: '无甲', AC: null },
  },
  牧师: {
    主手武器: { 名称: '战锤', 伤害: '1d8 钝击' },
    副手武器: { 名称: '盾牌', AC: 2 },
    护甲: { 名称: '链甲', AC: 16 },
  },
  德鲁伊: {
    主手武器: { 名称: '弯刀', 伤害: '1d6 斩击' },
    副手武器: null,
    护甲: { 名称: '鳞甲', AC: 14 },
  },
  法师: {
    主手武器: { 名称: '法杖', 伤害: '1d6 钝击' },
    副手武器: null,
    护甲: { 名称: '无甲', AC: null },
  },
  术士: {
    主手武器: { 名称: '匕首', 伤害: '1d4 穿刺' },
    副手武器: null,
    护甲: { 名称: '皮甲', AC: 11 },
  },
  邪术师: {
    主手武器: { 名称: '弯刀', 伤害: '1d6 斩击' },
    副手武器: null,
    护甲: { 名称: '皮甲', AC: 11 },
  },
  吟游诗人: {
    主手武器: { 名称: '细剑', 伤害: '1d8 穿刺' },
    副手武器: { 名称: '鲁特琴', 描述: '演奏用' },
    护甲: { 名称: '皮甲', AC: 11 },
  },
};

// 深覆盖：对象按键覆盖，数组替换，基本类型覆盖；未在 patch 出现的键保留
function deepOverlay(base: any, patch: any): any {
  if (patch === undefined) return base;
  if (Array.isArray(patch)) return patch.slice();
  if (patch && typeof patch === 'object') {
    const out: any = base && typeof base === 'object' && !Array.isArray(base) ? { ...base } : {};
    for (const k of Object.keys(patch)) out[k] = deepOverlay(base ? base[k] : undefined, patch[k]);
    return out;
  }
  return patch;
}

function buildInitialData() {
  const ch: any = {};
  ch['身份'] = { 姓名: '冒险者', 种族: race.value, 背景: background.value, 总等级: 1, 经验值: 0 };
  ch['属性'] = { ...attrs.value };
  ch['熟练'] = {
    熟练加值: 2,
    技能熟练: Array.from(new Set([...(bgInfo.value.skills || []), ...selectedSkills.value])),
  };
  const con = attrs.value['体质'] || 10;
  const dex = attrs.value['敏捷'] || 10;
  const clsName = cls.value;
  const maxHp = computeMaxHpByClass(clsName, con);
  const ac = computeBaseAcByClass(clsName, dex);
  ch['战斗'] = {
    生命值: { 最大生命值: maxHp, 当前生命值: maxHp, 临时生命值: 0 },
    护甲等级: ac,
  };
  const eq = equipmentByClass[clsName] || {};
  ch['装备栏'] = {};
  ['主手武器', '副手武器', '护甲'].forEach(slot => {
    if (eq && (eq as any)[slot]) ch['装备栏'][slot] = (eq as any)[slot];
  });
  // 初始化加入职业列表；若该职业 1 级就需要子职业且已选择，则写入职业详情的子职业
  ch['职业列表'] = [clsName];
  if (SUBCLASS_LEVEL[clsName] === 1 && subclass.value) {
    ch['职业详情'] = ch['职业详情'] || {};
    ch['职业详情'][clsName] = { ...(ch['职业详情'][clsName] || {}), 子职业: subclass.value };
  }
  return ch;
}

const backgroundMap: Record<string, { description: string; skills: string[]; feature?: string }> = {
  贵族: { description: '出身显贵，受良好教育与礼仪训练。', skills: ['游说', '历史'], feature: '特权地位' },
  士兵: { description: '历经战阵，纪律严明，熟悉军中生活。', skills: ['运动', '威吓'], feature: '军旅人脉' },
  学者: { description: '钻研学识，热衷于典籍与研究。', skills: ['奥秘', '历史'], feature: '学术人脉' },
  罪犯: { description: '在阴影中求生，擅长潜行与欺瞒。', skills: ['隐匿', '欺瞒'], feature: '地下关系' },
  工匠: { description: '手艺精湛，注重专注与创造。', skills: ['调查', '洞悉'] },
  水手: { description: '熟悉海上航行与水手技巧。', skills: ['运动', '求生'], feature: '船员通行' },
  侍僧: { description: '信仰虔诚，掌握宗教礼仪与经典。', skills: ['宗教', '洞悉'] },
  流浪儿: { description: '街头长大，机敏与生存本能出众。', skills: ['隐匿', '巧手'] },
  隐士: {
    description: '远离尘嚣，沉思冥想，洞察本心。',
    skills: ['医疗', '自然'].map(s => (s === '医疗' ? '医药' : s)),
  },
  猎人: { description: '荒野追踪者，精通求生与察觉。', skills: ['求生', '察觉'] },
};
const bgInfo = computed(
  () => backgroundMap[background.value] || { description: '选择一个背景以获得额外熟练与特色。', skills: [] },
);

const raceMap: Record<string, { description: string; features: string[] }> = {
  人类: { description: '通用而多才，适应力强。', features: ['通用适应'] },
  精灵: { description: '敏捷、感知敏锐，擅弓与感知魔法。', features: ['黑暗视觉', '敏锐感官'] },
  矮人: { description: '结实耐久，抗性与工艺著称。', features: ['毒素抗性', '黑暗视觉'] },
  半身人: { description: '幸运与灵巧，小巧而难以被察觉。', features: ['幸运', '勇敢'] },
  半精灵: { description: '兼具人类与精灵特质。', features: ['黑暗视觉', '多才多艺'] },
  半兽人: { description: '强韧而好战。', features: ['顽强耐力', '威吓气场'] },
  提夫林: { description: '地狱之血，具火焰抗性与秘法感。', features: ['火焰抗性', '地狱遗泽'] },
  龙裔: { description: '龙裔之息，具吐息武器与抗性。', features: ['龙息', '元素抗性'] },
  侏儒: { description: '灵巧聪慧，天生对魔法有抵抗。', features: ['侏儒狡黠'] },
};
const raceInfo = computed(() => raceMap[race.value] || { description: '选择一个种族以查看特性。', features: [] });

const classPresetMap: Record<string, { description: string; preset: Record<string, number> }> = {
  战士: {
    description: '力量与体质优先，兼顾敏捷。',
    preset: { 力量: 15, 体质: 15, 敏捷: 14, 智力: 8, 感知: 10, 魅力: 8 },
  },
  野蛮人: {
    description: '力量/体质极高，重装或双手武器。',
    preset: { 力量: 15, 体质: 15, 敏捷: 14, 智力: 8, 感知: 10, 魅力: 8 },
  },
  圣武士: {
    description: '力量与魅力优先，体质次之。',
    preset: { 力量: 15, 魅力: 15, 体质: 14, 敏捷: 10, 感知: 8, 智力: 8 },
  },
  游侠: {
    description: '敏捷与感知优先，体质次之。',
    preset: { 敏捷: 15, 感知: 15, 体质: 14, 力量: 8, 智力: 10, 魅力: 8 },
  },
  盗贼: {
    description: '敏捷极高，体质/感知辅助。',
    preset: { 敏捷: 15, 体质: 14, 感知: 14, 力量: 8, 智力: 10, 魅力: 8 },
  },
  武僧: { description: '敏捷与感知双修。', preset: { 敏捷: 15, 感知: 15, 体质: 14, 力量: 8, 智力: 10, 魅力: 8 } },
  牧师: {
    description: '感知为主，体质/力量或敏捷视分支。',
    preset: { 感知: 15, 体质: 14, 力量: 12, 敏捷: 12, 智力: 8, 魅力: 8 },
  },
  德鲁伊: { description: '感知与体质优先。', preset: { 感知: 15, 体质: 14, 敏捷: 12, 智力: 10, 力量: 8, 魅力: 8 } },
  法师: {
    description: '智力极高，体质/敏捷辅助。',
    preset: { 智力: 15, 体质: 14, 敏捷: 14, 感知: 10, 力量: 8, 魅力: 8 },
  },
  术士: {
    description: '魅力极高，体质/敏捷辅助。',
    preset: { 魅力: 15, 体质: 14, 敏捷: 14, 智力: 10, 力量: 8, 感知: 8 },
  },
  邪术师: { description: '魅力为主，体质其次。', preset: { 魅力: 15, 体质: 14, 敏捷: 12, 智力: 10, 力量: 8, 感知: 8 } },
  吟游诗人: {
    description: '魅力极高，敏捷/体质辅助。',
    preset: { 魅力: 15, 敏捷: 14, 体质: 14, 智力: 10, 力量: 8, 感知: 8 },
  },
};
const classInfo = computed(
  () => classPresetMap[cls.value] || { description: '选择职业以查看推荐加点。', preset: {} as Record<string, number> },
);
const classPresetDisplay = computed(() => {
  const p = classInfo.value.preset || ({} as Record<string, number>);
  const merged: Record<string, number> = { ...attrs.value };
  Object.keys(p).forEach(k => (merged[k] = p[k]));
  return merged;
});
function applyClassPreset() {
  const p = classInfo.value.preset || ({} as Record<string, number>);
  // 将预设转换成从 base=8 的点投入并尽量贴近
  resetPointBuy();
  // 简化：按优先级从高到低尝试把当前值拉到预设，尊重点数与上限
  const order = sixAttrs.slice().sort((a, b) => (p[b] || base) - (p[a] || base));
  let safety = 400;
  for (const k of order) {
    while (attrs.value[k] < (p[k] || base) && safety-- > 0) {
      if (!canInc(k)) break;
      attrs.value[k] += 1;
    }
  }
}

const selectedSkills = ref<string[]>([]);
function isSkillDisabled(s: string) {
  const maxPick = 2;
  const baseSkills = new Set((bgInfo.value.skills || []).filter(Boolean));
  const picked = selectedSkills.value.filter(x => !baseSkills.has(x));
  return picked.length >= maxPick && !selectedSkills.value.includes(s);
}

function buildOpeningPrompt(ch: any) {
  const id = ch['身份'] || {};
  const raceName = id['种族'] || '旅人';
  const clsName = cls.value;
  const bgName = id['背景'] || '无名';
  return [
    `清晨微光洒在街石上，我这位来自「${bgName}」的${raceName}${clsName}推门走出酒馆。`,
    '空气里有麦香与铁腥的混杂，我系紧披风，平复心跳，任靴跟踏过水渍，迎向未知的道路。',
  ].join('\n');
}

function save() {
  const character = buildInitialData();
  (async () => {
    try {
      // 0) 先把开场白写入 chat.input
      (chat as any).input = buildOpeningPrompt(character);
    } catch {}
    try {
      // 1) 先将 MVU 写入到 chat 级（初始化数据，增量合并到主角）
      let chatData: any;
      try {
        chatData = Mvu.getMvuData({ type: 'chat' }) || {};
      } catch {
        chatData = {};
      }
      chatData.stat_data = chatData.stat_data || {};
      const prevHero = (chatData.stat_data['主角'] || {}) as any;
      const mergedHero: any = deepOverlay(prevHero, character);
      // 合并职业列表与初始化子职业
      const clsName = cls.value;
      const list = Array.isArray(mergedHero['职业列表']) ? mergedHero['职业列表'].slice() : [];
      if (!list.includes(clsName)) list.push(clsName);
      mergedHero['职业列表'] = list;
      if (needSubclassAtInit.value && subclass.value) {
        mergedHero['职业详情'] = mergedHero['职业详情'] || {};
        mergedHero['职业详情'][clsName] = {
          ...(mergedHero['职业详情'][clsName] || {}),
          子职业: subclass.value,
        };
      }
      chatData.stat_data['主角'] = mergedHero;
      await Mvu.replaceMvuData(chatData, { type: 'chat' });

      // 同步到 message 级：同样合并
      let msgData: any;
      try {
        msgData = Mvu.getMvuData({ type: 'message' }) || {};
      } catch {
        msgData = {};
      }
      msgData.stat_data = msgData.stat_data || {};
      const prevHeroMsg = (msgData.stat_data['主角'] || {}) as any;
      const mergedHeroMsg: any = deepOverlay(prevHeroMsg, mergedHero);
      msgData.stat_data['主角'] = mergedHeroMsg;
      await Mvu.replaceMvuData(msgData, { type: 'message' });
    } catch {}

    try {
      // 2) 通过既有发送入口发送（使用 chat.input 的内容），不等待生成
      void (chat as any).onSend(!!stream.value);
    } catch {}

    try {
      // 3) 创建后跳转至主界面
      router.replace('/');
    } catch {}
  })();
}

watch(cls, () => applyClassPreset(), { immediate: true });

// 使 Init 页自身成为可滚动容器（与 Stage 一致的高度计算逻辑）
const wrap = ref<HTMLElement | null>(null);
function layoutHeight() {
  const el = wrap.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const viewport = window.innerHeight || document.documentElement.clientHeight || 800;
  const bottomGap = 16; // 预留底部空间
  const h = Math.max(520, Math.floor(viewport - rect.top - bottomGap));
  el.style.height = h + 'px';
  el.style.overflow = 'auto';
}
function bindResize() {
  window.addEventListener('resize', layoutHeight);
  window.addEventListener('orientationchange', layoutHeight);
}
function unbindResize() {
  window.removeEventListener('resize', layoutHeight);
  window.removeEventListener('orientationchange', layoutHeight);
}
onMounted(() => {
  requestAnimationFrame(layoutHeight);
  bindResize();
});
onBeforeUnmount(() => {
  unbindResize();
});
</script>

<style scoped>
.init-page {
  max-width: 980px;
  padding: 16px;
  background: #15151a;
  color: #e8e2d4;
  border: 1px solid #3a3a3c;
  border-radius: 10px;
  /* 占满父容器高度，由本容器滚动，避免看起来“半屏” */
  height: 100%;
  max-height: none;
  box-sizing: border-box;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}
.init-page::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.init-page::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.22);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.init-page::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
}
.section::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.section {
  max-height: unset;
  overflow: visible;
}
h2 {
  margin: 0 0 12px;
  color: #ffd700;
}
.section {
  margin: 14px 0;
  padding: 10px;
  border: 1px solid #2a2a2f;
  border-radius: 8px;
}
.row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin: 6px 0;
}
label {
  opacity: 0.9;
  margin-right: 4px;
}
input,
select {
  background: #0f1216;
  color: #e8e2d4;
  border: 1px solid #3a3a3c;
  border-radius: 6px;
  padding: 6px 8px;
}
.attrs {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}
.attr {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.skills {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
}
.grid .wide {
  grid-column: span 3;
}
.mini {
  padding: 4px 8px;
  background: #2a2a2f;
  border: 1px solid #47474a;
  border-radius: 6px;
  color: #e8e2d4;
  cursor: pointer;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}
button {
  padding: 8px 12px;
  background: #2a2a2f;
  border: 1px solid #47474a;
  color: #e8e2d4;
  border-radius: 6px;
  cursor: pointer;
}
.primary {
  background: #0f1f3a;
  color: #93c5fd;
}
.multi .list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pill {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.points {
  margin: 6px 0;
}
.attr-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.attr-row {
  display: grid;
  grid-template-columns: 80px 36px 48px 36px 1fr;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border: 1px solid #2a2a2f;
  border-radius: 6px;
}
.step {
  padding: 4px 8px;
  background: #2a2a2f;
  border: 1px solid #47474a;
  border-radius: 6px;
  color: #e8e2d4;
  cursor: pointer;
}
.v {
  font-weight: 700;
  text-align: center;
}
.cost {
  opacity: 0.8;
  font-size: 12px;
}
.cost.disabled {
  opacity: 0.4;
}
.bg-info {
  margin-top: 8px;
  padding: 8px;
  border: 1px dashed #3a3a3c;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
}
.bg-info .desc {
  margin: 0 0 6px;
}
.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
}
.note {
  opacity: 0.85;
  margin-top: 4px;
}
@media (max-width: 900px) {
  .attrs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .skills {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid .wide {
    grid-column: span 2;
  }
}

/* 进一步适配中小屏 */
@media (max-width: 600px) {
  .init-page {
    max-width: 100%;
    padding: 12px;
  }
  .row {
    gap: 6px;
    flex-direction: column;
    align-items: stretch;
  }
  button,
  .step {
    min-height: 40px;
  }
  .skills {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
  .attr-row {
    grid-template-columns: 72px 32px 44px 32px 1fr;
  }
  .actions {
    justify-content: stretch;
  }
  .actions button {
    flex: 1 1 48%;
  }
}

@media (max-width: 480px) {
  .init-page {
    padding: 10px;
  }
  .row {
    gap: 4px;
  }
  button,
  .step {
    min-height: 44px;
  }
  .points {
    margin: 8px 0;
  }
}
</style>
