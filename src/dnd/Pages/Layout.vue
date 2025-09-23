<template>
  <div class="dnd-layout" :class="{ fs: isFs, 'dark-mode': isDarkMode }" :key="appKey">
    <header class="topbar">
      <div class="brand">DnD</div>
      <div class="right-actions">
        <button class="menu-btn" title="侧边栏" @click.stop.prevent="onToggleMenu">
          <span class="hamburger"><span></span><span></span><span></span></span>
        </button>
        <button class="menu-btn" title="夜间模式" @click.stop.prevent="toggleDarkMode">
          {{ isDarkMode ? '☀️' : '🌙' }}
        </button>
        <button class="menu-btn" :disabled="isFsBtnDisabled" title="全屏" @click.stop.prevent="toggleFullscreen">
          ⛶
        </button>
      </div>
    </header>
    <!-- 全屏平铺布局 -->
    <div class="desktop-layout">
      <!-- 主内容区 -->
      <main class="main-content" @click="onMainClick">
        <RouterView />
        <div v-if="ui.showSkill" class="skill-modal" @click.self="ui.closeSkill()">
          <div class="skill-panel">
            <header>
              <h3>技能</h3>
              <button class="close" @click="ui.closeSkill()">×</button>
            </header>
            <div class="body">
              <p>这里展示角色技能、检定与投骰入口（预留）。</p>
            </div>
          </div>
        </div>
      </main>

      <!-- 右侧HUD（按钮式导航，点击弹窗展示组件） -->
      <aside ref="sidebarEl" class="sidebar-panel" :class="{ open: ui.showInfo }">
        <div class="side-buttons">
          <button class="side-btn" @click="openComponent('profile')">⚔️ 角色</button>
          <button class="side-btn" @click="openComponent('classes')">🏆 职业</button>
          <button class="side-btn" @click="openComponent('items')">🎒 物品</button>
          <button class="side-btn" @click="openComponent('equip')">🛡️ 装备</button>
          <button class="side-btn" @click="openComponent('features')">🌟 特性</button>
          <button class="side-btn" @click="openComponent('magic')">🔮 法术</button>
          <button class="side-btn" @click="openComponent('state')">✨ 状态</button>
          <button class="side-btn" @click="openComponent('tasks')">📜 任务</button>
          <button class="side-btn" @click="openComponent('others')">👥 队友</button>
          <button class="side-btn" @click="openComponent('nearby')">💀 敌人</button>
          <button class="side-btn" @click="openComponent('system')">⚙️ 设置</button>
        </div>
      </aside>
    </div>

    <!-- 升级选择职业弹窗 -->
    <div v-if="showLevelUp" class="skill-modal" @click.self="cancelLevelUp()">
      <div class="lv-panel">
        <header>
          <h3>选择要升级的职业</h3>
        </header>
        <div class="lv-body">
          <div class="class-list">
            <button
              v-for="c in baseClasses"
              :key="c"
              class="class-btn"
              :class="{ active: chosenClass === c }"
              @click="chosenClass = c"
            >
              <span>{{ c }}</span>
              <span v-if="classLevel(c)" class="badge">Lv. {{ classLevel(c) }}</span>
            </button>
          </div>
        </div>
        <footer class="lv-footer">
          <button class="btn-alt" @click="cancelLevelUp()">取消</button>
          <button class="btn-primary" :disabled="!chosenClass || isLeveling" @click="confirmLevelUp()">确认升级</button>
        </footer>
      </div>
    </div>

    <!-- 自由加点弹窗（2点，需确认） -->
    <div v-if="showAsi" class="skill-modal" @click.self="cancelAsi()">
      <div class="lv-panel">
        <header>
          <h3>自由属性加点（剩余：{{ asiRemain }}）</h3>
        </header>
        <div class="lv-body">
          <div class="asi-grid">
            <div class="asi-row" v-for="k in sixAttrs" :key="k">
              <span class="k">{{ k }}</span>
              <div class="asi-ctrl">
                <button class="asi-btn" @click="decAsi(k)" :disabled="asiDraft[k] <= 0">-</button>
                <span class="v">{{ (ch['属性']?.[k] ?? 0) + (asiDraft[k] ?? 0) }}</span>
                <button
                  class="asi-btn"
                  @click="incAsi(k)"
                  :disabled="asiRemain <= 0 || (ch['属性']?.[k] ?? 0) + (asiDraft[k] ?? 0) >= 20"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
        <footer class="lv-footer">
          <button class="btn-alt" @click="cancelAsi()">撤销</button>
          <button class="btn-primary" :disabled="asiRemain !== 0" @click="confirmAsi()">确认加点</button>
        </footer>
      </div>
    </div>

    <!-- 子职业选择弹窗 -->
    <div v-if="showSubclass" class="skill-modal" @click.self="/* 必选流程：不允许点击遮罩关闭 */ null">
      <div class="lv-panel">
        <header>
          <h3>选择子职业（{{ subclassClass }}）</h3>
        </header>
        <div class="lv-body">
          <div class="class-list">
            <button
              v-for="opt in subclassOptions"
              :key="opt"
              class="class-btn"
              :class="{ active: chosenSubclass === opt }"
              @click="chosenSubclass = opt"
            >
              <span>{{ opt }}</span>
            </button>
          </div>
        </div>
        <footer class="lv-footer">
          <button class="btn-alt" @click="cancelSubclass()">稍后</button>
          <button class="btn-primary" :disabled="!chosenSubclass" @click="confirmSubclass()">确认子职业</button>
        </footer>
      </div>
    </div>

    <!-- 通用弹窗容器：根据 currentPanel 渲染对应内容 -->
    <div v-if="currentPanel" class="skill-modal" @click.self="closePanel">
      <div class="skill-panel" :class="currentPanel">
        <header>
          <h3>{{ panelTitle }}</h3>
          <button class="close" @click="closePanel">×</button>
        </header>
        <div class="body">
          <!-- 角色（分组卡片） -->
          <template v-if="currentPanel === 'profile'">
            <div class="card-grid">
              <details class="card details-card" open>
                <summary class="card-title">{{ emojiForSection('基础') }} 基础</summary>
                <KvTree2 :data="ch['身份'] || {}" />
              </details>
              <details class="card details-card" v-if="isObj((mvu || {})['世界信息'])" open>
                <summary class="card-title">📅 世界信息</summary>
                <KvTree2 :data="(mvu || {})['世界信息'] || {}" />
              </details>
              <details class="card details-card" open>
                <summary class="card-title">{{ emojiForSection('属性') }} 属性</summary>
                <div class="kv-row" v-for="k in sixAttrs" :key="k">
                  <span class="k">{{ k }}</span
                  ><span class="v">{{ ch['属性']?.[k] ?? '-' }}</span>
                </div>
              </details>
              <details class="card details-card" open>
                <summary class="card-title">{{ emojiForSection('战斗') }} 战斗</summary>
                <div class="kv-row">
                  <span class="k">HP</span
                  ><span class="v"
                    >{{ ch['战斗']?.['生命值']?.['当前生命值'] ?? '-' }}/{{
                      ch['战斗']?.['生命值']?.['最大生命值'] ?? '-'
                    }}</span
                  >
                </div>
                <div class="kv-row">
                  <span class="k">临时HP</span><span class="v">{{ ch['战斗']?.['生命值']?.['临时生命值'] ?? 0 }}</span>
                </div>
                <div class="kv-row">
                  <span class="k">AC</span><span class="v">{{ ch['战斗']?.['护甲等级'] ?? '-' }}</span>
                </div>
                <div class="sub-title" v-if="isObj(ch['战斗']?.['资源'])">资源</div>
                <div class="chips" v-if="isObj(ch['战斗']?.['资源'])">
                  <span v-for="(v, k) in safeObj(ch['战斗']?.['资源'])" :key="k" class="chip" v-if="k !== '$meta'"
                    >{{ k }}: {{ v }}</span
                  >
                </div>
                <div class="sub-title" v-if="isObj((mvu || {})['主角']?.['临时状态'])">临时状态</div>
                <div class="chips" v-if="isObj((mvu || {})['主角']?.['临时状态'])">
                  <span
                    v-for="(v, k) in safeObj((mvu || {})['主角']?.['临时状态'])"
                    :key="k"
                    class="chip"
                    v-if="k !== '$meta'"
                    >{{ k }}</span
                  >
                </div>
              </details>
              <details class="card details-card" open>
                <summary class="card-title">{{ emojiForSection('熟练') }} 熟练</summary>
                <div class="kv-row">
                  <span class="k">熟练加值</span><span class="v">+{{ ch['熟练']?.['熟练加值'] ?? '-' }}</span>
                </div>
                <div class="sub-title">技能</div>
                <div class="chips">
                  <span v-for="s in toArr(ch['熟练']?.['技能熟练'])" :key="s" class="chip">{{ s }}</span>
                </div>
                <KvTree
                  v-if="isObj(ch['熟练']) && hasExtra(rest(ch['熟练'], ['熟练加值', '技能熟练']))"
                  :data="rest(ch['熟练'], ['熟练加值', '技能熟练'])"
                />
              </details>

              <details class="card details-card" v-if="isObj((mvu || {})['主角']?.['声望'])" open>
                <summary class="card-title">{{ emojiForSection('声望') }} 声望</summary>
                <KvTree2 :data="(mvu || {})['主角']?.['声望']" />
              </details>
            </div>
          </template>

          <!-- 职业（统一：details-card + KvTree2） -->
          <template v-else-if="currentPanel === 'classes'">
            <div class="card-grid">
              <details v-for="c in toArr(ch['职业列表'])" :key="String(c)" class="card details-card" open>
                <summary class="card-title">
                  📘 {{ c }}<span class="badge">Lv. {{ classLevel(String(c)) }}</span>
                </summary>
                <KvTree2 :data="ch['职业详情']?.[c] || {}" />
              </details>
            </div>
          </template>

          <!-- 物品（背包+货币） -->
          <template v-else-if="currentPanel === 'items'">
            <!-- 背包：将条目平铺为卡片 -->
            <div class="card-grid" v-if="isObj(ch['物品栏']?.['背包']) || Array.isArray(ch['物品栏']?.['背包'])">
              <details
                class="card details-card"
                v-for="[ikey, item] in listifyBag(ch['物品栏']?.['背包'])"
                :key="String(ikey)"
                open
              >
                <summary class="card-title">{{ emojiForItem(item) }} {{ item?.['名称'] || ikey }}</summary>
                <div class="kv-row">
                  <span class="k">类型</span><span class="v">{{ item?.['类型'] ?? '-' }}</span>
                </div>
                <div class="kv-row" v-if="item?.['数量'] != null">
                  <span class="k">数量</span><span class="v">{{ item?.['数量'] }}</span>
                </div>
                <div class="kv-row" v-if="item?.['稀有度']">
                  <span class="k">稀有度</span><span class="v">{{ item?.['稀有度'] }}</span>
                </div>
                <div class="kv-row" v-if="item?.['重量'] != null">
                  <span class="k">重量</span><span class="v">{{ item?.['重量'] }}</span>
                </div>
                <div class="kv-row" v-if="item?.['描述']">
                  <span class="k">描述</span><span class="v">{{ item?.['描述'] }}</span>
                </div>
                <KvTree
                  v-if="hasExtra(rest(item, ['名称', '类型', '数量', '稀有度', '重量', '描述']))"
                  :data="rest(item, ['名称', '类型', '数量', '稀有度', '重量', '描述'])"
                />
              </details>
            </div>
            <!-- 回退：直接平铺 物品栏 顶层各键为卡片 -->
            <div class="card-grid" v-else-if="isObj(ch['物品栏'])">
              <details v-for="(item, key) in safeObj(ch['物品栏'])" :key="String(key)" class="card details-card" open>
                <summary class="card-title">{{ emojiForItem(item) }} {{ item?.['名称'] || key }}</summary>
                <div class="kv-row">
                  <span class="k">类型</span><span class="v">{{ item?.['类型'] ?? '-' }}</span>
                </div>
                <div class="kv-row" v-if="item?.['数量'] != null">
                  <span class="k">数量</span><span class="v">{{ item?.['数量'] }}</span>
                </div>
                <div class="kv-row" v-if="item?.['重量'] != null">
                  <span class="k">重量</span><span class="v">{{ item?.['重量'] }}</span>
                </div>
                <div class="kv-row" v-if="item?.['描述']">
                  <span class="k">描述</span><span class="v">{{ item?.['描述'] }}</span>
                </div>
                <KvTree
                  v-if="hasExtra(rest(item, ['名称', '类型', '数量', '重量', '描述']))"
                  :data="rest(item, ['名称', '类型', '数量', '重量', '描述'])"
                />
              </details>
            </div>

            <!-- 货币 -->
            <div class="chips">
              <span v-for="(v, k) in safeObj(ch['货币'])" :key="k" class="chip">{{ k }}: {{ v }}</span>
            </div>
            <KvTree v-if="isObj(ch['货币']) && hasExtra(rest(ch['货币'], []))" :data="rest(ch['货币'], [])" />
          </template>

          <!-- 装备 -->
          <template v-else-if="currentPanel === 'equip'">
            <div class="card-grid">
              <details v-for="slot in equipSlots" :key="slot" class="card details-card" open>
                <summary class="card-title">{{ emojiForEquip(slot) }} {{ slot }}</summary>
                <div class="kv-row">
                  <span class="k">名称</span><span class="v">{{ ch['装备栏']?.[slot]?.['名称'] || '-' }}</span>
                </div>
                <KvTree2 v-if="isObj(ch['装备栏']?.[slot])" :data="ch['装备栏']?.[slot]" />
              </details>
            </div>
          </template>

          <!-- 状态（统一：details-card + KvTree2） -->
          <template v-else-if="currentPanel === 'state'">
            <div class="card-grid">
              <details class="card details-card" open>
                <summary class="card-title">🔖 临时状态</summary>
                <KvTree2 :data="(mvu || {})['主角']?.['临时状态'] || {}" />
              </details>
              <details class="card details-card" open>
                <summary class="card-title">🎯 战斗资源</summary>
                <KvTree2 :data="ch['战斗']?.['资源'] || {}" />
              </details>
            </div>
          </template>

          <!-- 任务 -->
          <template v-else-if="currentPanel === 'tasks'">
            <KvTree2 v-if="mvu" :data="mvu['任务']" />
          </template>

          <!-- 其他角色（顶层每个角色为可折叠卡片） -->
          <template v-else-if="currentPanel === 'others'">
            <div class="card-grid" v-if="isObj(mvu?.['其他角色'])">
              <details v-for="(ov, ok) in safeObj(mvu?.['其他角色'])" :key="String(ok)" class="card details-card" open>
                <summary class="card-title">🧑‍🤝‍🧑 {{ ok }}</summary>
                <KvTree2 :data="ov" />
              </details>
            </div>
            <KvTree2 v-else-if="mvu" :data="mvu['其他角色'] || {}" />
          </template>

          <!-- 附近敌人（顶层每个敌人为可折叠卡片） -->
          <template v-else-if="currentPanel === 'nearby'">
            <div class="card-grid" v-if="isObj(mvu?.['附近敌人'])">
              <details v-for="(ev, ek) in safeObj(mvu?.['附近敌人'])" :key="String(ek)" class="card details-card" open>
                <summary class="card-title">👹 {{ ek }}</summary>
                <KvTree2 :data="ev" />
              </details>
            </div>
            <KvTree2 v-else-if="mvu" :data="mvu['附近敌人'] || {}" />
          </template>

          <!-- 法术系统（独立面板） -->
          <template v-else-if="currentPanel === 'magic'">
            <template v-if="hasCaster">
              <div class="card-grid">
                <details class="card details-card" v-if="Object.keys(filteredCastingAttrs).length" open>
                  <summary class="card-title">✨ 施法主属性</summary>
                  <KvTree2 :data="filteredCastingAttrs" />
                </details>
                <details class="card details-card" v-if="isObj(magicData['法术位'])" open>
                  <summary class="card-title">🔮 法术位</summary>
                  <KvTree2 :data="magicData['法术位']" />
                </details>
                <details class="card details-card" v-if="hasWarlock && isObj(magicData['契约魔法'])" open>
                  <summary class="card-title">🕯️ 契约魔法（邪术师）</summary>
                  <KvTree2 :data="magicData['契约魔法']" />
                </details>
              </div>
            </template>
            <p v-else class="note">未检测到法系职业，暂无法术系统数据</p>
          </template>

          <!-- 能力特性（独立面板） -->
          <template v-else-if="currentPanel === 'features'">
            <div class="card-grid" v-if="isObj((mvu || {})['主角']?.['能力特性'])">
              <details class="card details-card" open>
                <summary class="card-title">{{ emojiForSection('能力特性') }} 能力特性</summary>
                <KvTree2 :data="(mvu || {})['主角']?.['能力特性']" />
              </details>
            </div>
            <p v-else class="note">暂无能力特性数据</p>
          </template>

          <!-- 系统设置 -->
          <template v-else-if="currentPanel === 'system'">
            <div class="kv-row">
              <span class="k">流式生成</span
              ><label class="switch"
                ><input type="checkbox" :checked="ui.stream" @change="ui.toggleStream()" /><span>{{
                  ui.stream ? '开启' : '关闭'
                }}</span></label
              >
            </div>
            <p class="note">此开关会直接影响发送/重新生成时是否采用流式。</p>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, nextTick, ref, watch, computed, onBeforeUnmount, reactive } from 'vue';
import { useFullscreen } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { useUiStore } from '../stores/ui';
import { useChatStore } from '../stores/chat';
import KvTree from '../components/KvTree.vue';
import KvTree2 from '../components/KvTree2.vue';
import { SUBCLASS_LEVEL, SUBCLASS_OPTIONS } from '../shared/classes';

declare const Mvu: any;

const ui = useUiStore();
const chat = useChatStore();
const { stream } = storeToRefs(ui);
const { mvu, mainChar } = storeToRefs(chat);

const sidebarEl = ref<HTMLElement | null>(null);
const appKey = ref(0);
const isFs = ref(false);
const isDarkMode = ref(false);
// 伪全屏：如需覆盖上层容器样式可启用，但默认关闭以避免挤压宿主 UI
const fsOverriddenEls = new Set<any>();
// 伪全屏：隐藏宿主顶部/底部 UI（top-bar、form_sheld），退出时恢复
const hiddenHostEls = new Map<HTMLElement, string>();
function restoreHostUi() {
  try {
    hiddenHostEls.forEach((prev, el) => {
      try {
        if (prev) el.setAttribute('style', prev);
        else el.removeAttribute('style');
      } catch {}
    });
  } catch {}
  hiddenHostEls.clear();
}
const isFsBtnDisabled = computed(() => false);
const fsTarget = ref<HTMLElement | null>(null);
const { isSupported: fsSupported, toggle: toggleNativeFs } = useFullscreen(fsTarget);

// 基础派生数据
const ch = computed<any>(() => (mvu.value?.['主角'] || mainChar.value || {}) as any);
const sixAttrs = ['力量', '敏捷', '体质', '智力', '感知', '魅力'];
const equipSlots = ['主手武器', '副手武器', '护甲', '头盔', '手套', '鞋子', '项链', '戒指1', '戒指2'];

// 等级-经验与熟练加值表（新需求）
const LV_TABLE = [
  { xp: 0, prof: 2 },
  { xp: 300, prof: 2 },
  { xp: 900, prof: 2 },
  { xp: 2700, prof: 2 },
  { xp: 6500, prof: 3 },
  { xp: 14000, prof: 3 },
  { xp: 23000, prof: 3 },
  { xp: 34000, prof: 3 },
  { xp: 48000, prof: 4 },
  { xp: 64000, prof: 4 },
  { xp: 85000, prof: 4 },
  { xp: 100000, prof: 4 },
  { xp: 120000, prof: 5 },
  { xp: 140000, prof: 5 },
  { xp: 165000, prof: 5 },
  { xp: 195000, prof: 5 },
  { xp: 225000, prof: 6 },
  { xp: 265000, prof: 6 },
  { xp: 305000, prof: 6 },
  { xp: 355000, prof: 6 },
];

// 经验阈值与达标判断由舞台入口按钮控制，此处不再使用悬浮按钮

function openLevelUp() {
  currentPanel.value = '';
  showLevelUp.value = true;
}
const showLevelUp = ref(false);
const chosenClass = ref('');
const isLeveling = ref(false);
const baseClasses = [
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
function cancelLevelUp() {
  showLevelUp.value = false;
  chosenClass.value = '';
}
function classLevel(c: string): number {
  try {
    const list = (mvu.value?.['主角']?.['职业列表'] as any) || [];
    const inList = Array.isArray(list) && list.includes(c);
    if (!inList) return 0;
    return Number((mvu.value?.['主角']?.['职业详情']?.[c]?.['等级'] as any) ?? 0);
  } catch {
    return 0;
  }
}
async function confirmLevelUp() {
  if (isLeveling.value) return;
  isLeveling.value = true;
  // 这里仅放置占位逻辑；实际应用时将写入 MVU（职业等级/兼职、总等级、熟练加值）
  if (!chosenClass.value) return;
  try {
    const data = Mvu.getMvuData({ type: 'chat' }) || {};
    // 使用 lodash 进行写入，保证深层赋值
    // @ts-ignore
    const _assign = (obj: any, path: any, val?: any) =>
      typeof _ !== 'undefined' && _.set
        ? _.set(obj, path, val)
        : (function () {
            const keys = Array.isArray(path) ? path : String(path).split('.');
            let cur = obj;
            keys.forEach((k, i) => {
              if (i === keys.length - 1) cur[k] = val;
              else cur = cur[k] = cur[k] || {};
            });
          })();
    const heroPath = ['stat_data', '主角'];
    _assign(data, [...heroPath, '身份'], data.stat_data?.['主角']?.['身份'] || {});
    _assign(
      data,
      [...heroPath, '职业列表'],
      Array.isArray(data.stat_data?.['主角']?.['职业列表'])
        ? data.stat_data?.['主角']?.['职业列表']
        : data.stat_data?.['主角']?.['职业列表'] || [],
    );
    _assign(data, [...heroPath, '职业详情'], data.stat_data?.['主角']?.['职业详情'] || {});

    const cls = chosenClass.value as string;
    const list = data.stat_data['主角']['职业列表'] as any[];
    if (!list.includes(cls)) list.push(cls);
    const curLv = Number((data.stat_data['主角']['职业详情']?.[cls]?.['等级'] as any) ?? 0);
    // 新规则：不再为新职业创建职业详情；已有职业仅将等级+1
    if (curLv > 0) {
      _assign(data, ['stat_data', '主角', '职业详情', cls, '等级'], curLv + 1);
    }

    // 总等级 +1 与熟练加值
    const curTotal = Number((data.stat_data['主角']['身份']['总等级'] as any) ?? 1);
    const total = curTotal + 1;
    _assign(data, ['stat_data', '主角', '身份', '总等级'], total);
    const profByLevel = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6];
    const prof = profByLevel[Math.min(Math.max(total, 1), 20) - 1];
    _assign(data, ['stat_data', '主角', '熟练', '熟练加值'], prof);

    await Mvu.replaceMvuData(data, { type: 'chat' });
    await Mvu.replaceMvuData(data, { type: 'message' });

    // 判断该职业新等级是否触发加点
    const newClsLv = Number((data.stat_data['主角']['职业详情'][cls]?.['等级'] as any) ?? 0);
    if ([4, 8, 12, 16, 19].includes(newClsLv)) {
      // 打开自由加点面板
      asiRemain.value = 2;
      sixAttrs.forEach(k => (asiDraft[k] = 0));
      showAsi.value = true;
    }

    // 子职业阈值：多数职业在 3 级选择子职业（以 dnd5e 通用规则为准）
    if (shouldChooseSubclass(cls, newClsLv)) {
      openSubclassChooser(cls);
    }
  } catch (e) {
    console.error('升级失败', e);
  } finally {
    showLevelUp.value = false;
    chosenClass.value = '';
    isLeveling.value = false;
  }
}

// 子职业选择流程
const showSubclass = ref(false);
const chosenSubclass = ref('');
const subclassClass = ref('');
const subclassOptions = ref<string[]>([]);

// 触发等级与选项改为共用配置

function shouldChooseSubclass(cls: string, level: number): boolean {
  const needLv = SUBCLASS_LEVEL[cls];
  if (!needLv) return false;
  return level === needLv; // 到达触发等级时提示选择
}

function openSubclassChooser(cls: string) {
  subclassClass.value = cls;
  subclassOptions.value = SUBCLASS_OPTIONS[cls] || [];
  chosenSubclass.value = '';
  showSubclass.value = true;
}

function cancelSubclass() {
  // 允许稍后选择，不强制
  showSubclass.value = false;
}

async function confirmSubclass() {
  if (!subclassClass.value || !chosenSubclass.value) return;
  try {
    const data = Mvu.getMvuData({ type: 'chat' }) || {};
    const cls = subclassClass.value;
    const sub = chosenSubclass.value;
    // 写入到 主角.职业详情[cls].子职业
    // @ts-ignore
    const _assign = (obj: any, path: any, val?: any) =>
      typeof _ !== 'undefined' && _.set
        ? _.set(obj, path, val)
        : (function () {
            const keys = Array.isArray(path) ? path : String(path).split('.');
            let cur = obj;
            keys.forEach((k, i) => {
              if (i === keys.length - 1) cur[k] = val;
              else cur = cur[k] = cur[k] || {};
            });
          })();
    _assign(data, ['stat_data', '主角', '职业详情', cls, '子职业'], sub);
    await Mvu.replaceMvuData(data, { type: 'chat' });
    await Mvu.replaceMvuData(data, { type: 'message' });
  } catch (e) {
    console.error('选择子职业失败', e);
  } finally {
    showSubclass.value = false;
    chosenSubclass.value = '';
    subclassClass.value = '';
    subclassOptions.value = [];
  }
}

// 弹窗相关
const currentPanel = ref<
  | 'profile' // 身份+属性+战斗
  | 'classes'
  | 'items' // 物品（背包+货币）
  | 'equip' // 装备
  | 'features' // 能力特性
  | 'magic' // 法术系统
  | 'state' // 临时状态+资源
  | 'others' // 其他角色
  | 'nearby' // 附近敌人
  | 'tasks'
  | 'system'
  | ''
>('');
const panelTitle = computed(() => {
  switch (currentPanel.value) {
    case 'profile':
      return '⚔️ 角色';
    case 'classes':
      return '🏆 职业';
    case 'items':
      return '🎒 物品';
    case 'equip':
      return '⚔️ 装备';
    case 'features':
      return '🌟 特性';
    case 'magic':
      return '🔮 法术系统';
    case 'state':
      return '✨ 状态';
    case 'tasks':
      return '📜 任务';
    case 'system':
      return '⚙️ 系统设置';
    case 'others':
      return '👥 其他角色';
    case 'nearby':
      return '💀 附近敌人';
    default:
      return '❓ 未知';
  }
});

function openComponent(key: any) {
  currentPanel.value = key;
}
function closePanel() {
  currentPanel.value = '';
}

function pretty(v: any) {
  try {
    return typeof v === 'string' ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
}
function toArr(v: any): string[] {
  return Array.isArray(v) ? v.filter(Boolean) : [];
}
function isObj(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
function safeObj(v: any): Record<string, any> {
  return isObj(v) ? v : {};
}
function leaf(v: any) {
  return v == null ? '-' : String(v);
}
function isSimple(v: any) {
  return v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}
function rest(obj: any, known: string[]): Record<string, any> {
  if (!isObj(obj)) return {} as any;
  const out: Record<string, any> = {};
  Object.keys(obj).forEach(k => {
    if (!known.includes(k)) out[k] = (obj as any)[k];
  });
  return out;
}
function hasExtra(o: any) {
  return isObj(o) && Object.keys(o).length > 0;
}

// 区块标题 emoji（基础/属性/战斗/熟练/法术系统/能力特性/声望 等）
function emojiForSection(title: string) {
  if (/基础|身份/.test(title)) return '📜';
  if (/属性|能力值/.test(title)) return '💪';
  if (/战斗|防御|生命值|护甲/.test(title)) return '⚔️';
  if (/熟练|技能/.test(title)) return '🎯';
  if (/法术|魔法|施法/.test(title)) return '🔮';
  if (/能力特性|特性|天赋/.test(title)) return '🌟';
  if (/声望|名誉/.test(title)) return '👑';
  if (/职业|等级/.test(title)) return '🏆';
  if (/物品|背包|道具/.test(title)) return '🎒';
  if (/装备|武器|防具/.test(title)) return '🛡️';
  if (/状态|效果|增益|减益/.test(title)) return '✨';
  if (/任务|目标|使命/.test(title)) return '📜';
  if (/世界|时间|天气/.test(title)) return '🌍';
  if (/货币|金币|财富/.test(title)) return '💰';
  if (/资源|法术位|气力/.test(title)) return '🔋';
  if (/契约|邪术/.test(title)) return '👁️';
  if (/临时/.test(title)) return '⏳';
  return '📁';
}

// 简易 emoji 选择
function emojiForItem(item: any) {
  const t = (item?.['类型'] || '').toString();
  if (/武器|剑|刀|弓/.test(t)) return '🗡️';
  if (/护甲|盔甲|盾/.test(t)) return '🛡️';
  if (/药|药剂|卷轴|法术/.test(t)) return '🧪';
  if (/食物|食/.test(t)) return '🍞';
  return '📦';
}
function emojiForEquip(slot: string) {
  if (slot.includes('武器')) return '🗡️';
  if (slot.includes('护甲')) return '🛡️';
  if (slot.includes('头盔')) return '🪖';
  if (slot.includes('手套')) return '🧤';
  if (slot.includes('鞋')) return '🥾';
  if (slot.includes('项链')) return '📿';
  if (slot.includes('戒指')) return '💍';
  return '🎒';
}

// 将 背包 统一为可迭代的 [key, item] 列表
function listifyBag(bag: any): Array<[string, any]> {
  if (!bag) return [];
  try {
    if (Array.isArray(bag)) return bag.map((v, i) => [String(i), v]);
    if (typeof bag === 'object') return Object.entries(bag) as Array<[string, any]>;
  } catch {}
  return [];
}

// 法术系统派生数据
const magicData = computed<Record<string, any>>(() => (mvu.value?.['主角']?.['法术系统'] || {}) as any);
const classList = computed<string[]>(
  () => (Array.isArray(mvu.value?.['主角']?.['职业列表']) ? mvu.value?.['主角']?.['职业列表'] : []) as string[],
);
const classDetail = computed<any>(() => (mvu.value?.['主角']?.['职业详情'] || {}) as any);
const hasWarlock = computed<boolean>(() => classList.value.includes('邪术师'));
const hasCaster = computed<boolean>(() => {
  // 粗略判断：如果施法主属性里能匹配到当前职业或其子职业之一，即认为是法系
  const casting = magicData.value['施法主属性'] || {};
  if (!classList.value || classList.value.length === 0) return false;
  for (const c of classList.value) {
    if (casting && Object.prototype.hasOwnProperty.call(casting, c)) return true;
    const sub = classDetail.value?.[c]?.['子职业'];
    if (sub && Object.prototype.hasOwnProperty.call(casting, sub)) return true;
  }
  return false;
});
// 过滤"施法主属性"：仅展示在职业或子职业上命中的条目
const filteredCastingAttrs = computed<Record<string, any>>(() => {
  const casting = (magicData.value['施法主属性'] || {}) as Record<string, any>;
  const out: Record<string, any> = {};
  const setIfHit = (k: string) => {
    if (Object.prototype.hasOwnProperty.call(casting, k)) out[k] = casting[k];
  };
  classList.value.forEach(c => {
    setIfHit(c);
    const sub = classDetail.value?.[c]?.['子职业'];
    if (sub) setIfHit(String(sub));
  });
  return out;
});

// ASI（自由加点）
const showAsi = ref(false);
const asiRemain = ref(2);
const asiDraft = reactive<Record<string, number>>({ 力量: 0, 敏捷: 0, 体质: 0, 智力: 0, 感知: 0, 魅力: 0 });
function incAsi(k: string) {
  if (asiRemain.value <= 0) return;
  const base = Number((mvu.value?.['主角']?.['属性']?.[k] as any) ?? 0);
  const cur = base + (asiDraft[k] ?? 0);
  if (cur >= 20) return;
  asiDraft[k] = (asiDraft[k] ?? 0) + 1;
  asiRemain.value -= 1;
}
function decAsi(k: string) {
  if ((asiDraft[k] ?? 0) <= 0) return;
  asiDraft[k] = (asiDraft[k] ?? 0) - 1;
  asiRemain.value += 1;
}
function cancelAsi() {
  showAsi.value = false;
  asiRemain.value = 2;
  sixAttrs.forEach(k => (asiDraft[k] = 0));
}
async function confirmAsi() {
  // 必须用光再确认
  if (asiRemain.value !== 0) return;
  try {
    const data = Mvu.getMvuData({ type: 'chat' }) || {};
    const stat = (data.stat_data = data.stat_data || {});
    const hero = (stat['主角'] = stat['主角'] || {});
    hero['属性'] = hero['属性'] || {};
    sixAttrs.forEach(k => {
      const base = Number((hero['属性'][k] as any) ?? 0);
      hero['属性'][k] = Math.min(20, base + (asiDraft[k] ?? 0));
    });
    await Mvu.replaceMvuData(data, { type: 'chat' });
  } catch (e) {
    console.error('加点失败', e);
  } finally {
    cancelAsi();
  }
}

function toggleStream() {
  ui.toggleStream();
}

onMounted(() => {
  // 恢复数据初始化
  chat.init(stream);
  // 同步一次宿主流式开关
  try {
    ui.syncStreamFromHost();
  } catch {}
  // 监听宿主流式开关实时变化
  try {
    ui.startHostStreamSync();
  } catch {}

  // 加载夜间模式状态
  let savedDark: string | null = null;
  try {
    savedDark = localStorage.getItem('dnd-dark-mode');
    if (savedDark) {
      isDarkMode.value = savedDark === 'true';
    }
  } catch {}

  // 同步宿主的暗色主题（若宿主有暗色开关 class），保证首次载入即正确
  try {
    const frame = window.frameElement as HTMLElement | null;
    const hostDoc = frame?.ownerDocument || document;
    const preferDark =
      hostDoc.documentElement.classList.contains('theme_dark') ||
      hostDoc.body.classList.contains('dark') ||
      hostDoc.querySelector('.theme-dark, .dark') != null;
    if (!savedDark && preferDark) isDarkMode.value = true;
  } catch {}

  try {
    fsTarget.value = document.documentElement;
  } catch {}
  const onFsChange = () => {
    const doc: any = document;
    const active = !!(doc.fullscreenElement || (doc as any).webkitFullscreenElement);
    isFs.value = active;

    // 退出全屏：恢复宿主滚动条并强制还原 iframe 固定高度，防止溢出
    if (!active) {
      setTimeout(() => {
        const manageScrollbars = (window as any).__dndManageHostScrollbars;
        const setHeight = (window as any).__dndSetIframeHeight;
        // 退出应恢复宿主滚动条
        if (manageScrollbars) manageScrollbars(false);
        if (setHeight) setHeight(715);
        // 触发布局刷新，进一步保证高度收敛
        try {
          window.dispatchEvent(new Event('resize'));
        } catch {}
      }, 50);
    }
  };
  document.addEventListener('fullscreenchange', onFsChange);
  // @ts-ignore
  document.addEventListener('webkitfullscreenchange', onFsChange);
  // 监听来自 Stage 的升级请求
  window.addEventListener('dnd-open-levelup', openLevelUp as any);
  // 极简伪全屏：仅用于 iOS；其它平台只用原生全屏（去抖，避免重复写样式导致卡顿）
  let pseudoApplied = false;
  // 记录被覆盖样式的宿主元素（transform/contain/position/overflow）
  const fsHostBackup = new Map<HTMLElement, string>();
  let vvHandlersBound = false;
  let appPrevMinHeight: string | null = null;
  const bindVisualViewport = (frame: HTMLElement) => {
    try {
      const vv: any = (window as any).visualViewport;
      if (!vv || vvHandlersBound) return;
      const update = () => {
        try {
          frame.style.setProperty('height', Math.round(vv.height) + 'px', 'important');
        } catch {}
      };
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
      vvHandlersBound = true;
      update();
    } catch {}
  };
  const unbindVisualViewport = () => {
    try {
      const vv: any = (window as any).visualViewport;
      if (!vv || !vvHandlersBound) return;
      // 这里不移除匿名函数监听，依赖页面生命周期回收；仅复位标记
      vvHandlersBound = false;
    } catch {}
  };
  const applyPseudoFs = () => {
    const frame = window.frameElement as HTMLElement | null;
    if (!frame) return;
    const ua = navigator.userAgent || '';
    const isIOS = /iP(ad|hone|od)/i.test(ua);
    const isNative = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
    if (!isIOS || isNative) return;
    if (isFs.value && pseudoApplied) return;
    if (!isFs.value && !pseudoApplied) return;
    if (isFs.value) {
      frame.setAttribute('data-dnd-fs', '1');
      frame.style.setProperty('position', 'fixed', 'important');
      frame.style.setProperty('inset', '0', 'important');
      frame.style.setProperty('z-index', '2147483647', 'important');
      frame.style.setProperty('width', '100vw', 'important');
      // 先 100dvh，后 100svh（支持时覆盖）；并绑定 visualViewport 回填像素高度
      frame.style.setProperty('height', '100dvh', 'important');
      frame.style.setProperty('min-height', '100dvh', 'important');
      frame.style.setProperty('height', '100svh', 'important');
      frame.style.setProperty('min-height', '100svh', 'important');
      bindVisualViewport(frame);
      // iOS 伪全屏时隐藏宿主输入栏，避免遮挡；同时中和 transform/contain 祖先
      try {
        const doc = (frame as any).ownerDocument as Document | undefined;
        // 将 iframe 文档内的 #app 的 min-height 清零，避免 240px 限制
        const appEl = doc?.getElementById('app') as HTMLElement | null;
        if (appEl) {
          appPrevMinHeight = appEl.style.minHeight ?? null;
          appEl.style.setProperty('min-height', '0', 'important');
          appEl.style.setProperty('height', '100%', 'important');
          appEl.style.setProperty('max-height', 'none', 'important');
        }
        const el = doc?.getElementById('form_sheld') as HTMLElement | null;
        if (el && !hiddenHostEls.has(el)) {
          hiddenHostEls.set(el, el.getAttribute('style') || '');
          el.style.setProperty('display', 'none', 'important');
        }
        // 自下而上扫描父链，清理影响 fixed 参照/裁剪的属性
        let cur: HTMLElement | null = frame.parentElement as HTMLElement | null;
        const stopAt = doc?.body as HTMLElement | null;
        while (cur && cur !== stopAt) {
          try {
            const cs = doc!.defaultView!.getComputedStyle(cur);
            const need =
              cs.transform !== 'none' ||
              cs.contain !== 'none' ||
              cs.perspective !== 'none' ||
              /transform|perspective/.test(cs.willChange || '') ||
              (cs.overflow !== 'visible' && cs.overflow !== 'unset');
            if (need) {
              if (!fsHostBackup.has(cur)) fsHostBackup.set(cur, cur.getAttribute('style') || '');
              cur.style.setProperty('transform', 'none', 'important');
              cur.style.setProperty('contain', 'initial', 'important');
              cur.style.setProperty('perspective', 'none', 'important');
              cur.style.setProperty('will-change', 'auto', 'important');
              cur.style.setProperty('overflow', 'visible', 'important');
            }
          } catch {}
          cur = cur.parentElement as HTMLElement | null;
        }
        const html = doc?.documentElement as HTMLElement | null;
        const body = doc?.body as HTMLElement | null;
        [html, body].filter(Boolean).forEach(el => {
          if (!el) return;
          if (!fsHostBackup.has(el)) fsHostBackup.set(el, el.getAttribute('style') || '');
          el.style.setProperty('overflow', 'hidden', 'important');
          el.style.setProperty('touch-action', 'none', 'important');
        });
      } catch {}
      pseudoApplied = true;
    } else {
      frame.removeAttribute('data-dnd-fs');
      [
        'position',
        'top',
        'left',
        'right',
        'bottom',
        'z-index',
        'width',
        'height',
        'max-width',
        'max-height',
        'transform',
        'margin',
        'display',
        'min-height',
      ].forEach(k => frame.style.removeProperty(k));
      // 恢复宿主样式
      try {
        const doc = (frame as any).ownerDocument as Document | undefined;
        // 恢复 iframe 文档内 #app 的 min-height
        const appEl = doc?.getElementById('app') as HTMLElement | null;
        if (appEl) {
          if (appPrevMinHeight != null) appEl.style.setProperty('min-height', appPrevMinHeight);
          else appEl.style.removeProperty('min-height');
        }
        fsHostBackup.forEach((prev, el) => {
          try {
            if (prev) el.setAttribute('style', prev);
            else el.removeAttribute('style');
          } catch {}
        });
        fsHostBackup.clear();
      } catch {}
      restoreHostUi();
      unbindVisualViewport();
      // iOS伪全屏退出：恢复滚动条即可
      setTimeout(() => {
        const manageScrollbars = (window as any).__dndManageHostScrollbars;
        if (manageScrollbars) manageScrollbars(false);
      }, 100);
      pseudoApplied = false;
    }
  };
  watch(isFs, () => applyPseudoFs(), { immediate: true });
  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', onFsChange);
    document.removeEventListener('webkitfullscreenchange', onFsChange);
    window.removeEventListener('dnd-open-levelup', openLevelUp as any);
    restoreHostUi();
  });
});

function onToggleMenu() {
  ui.toggleInfo();
  appKey.value++;
}

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value;
  // 保存到localStorage
  try {
    localStorage.setItem('dnd-dark-mode', isDarkMode.value.toString());
  } catch {}

  // 通知 Stage 等子组件（已使用 ::global 选择器，通常不需要，但确保触发布局刷新）
  try {
    window.dispatchEvent(new Event('resize'));
  } catch {}
}

// 浏览器原生全屏
function toggleFullscreen() {
  const ua = navigator.userAgent || '';
  const isIOS = /iP(ad|hone|od)/i.test(ua);
  if (fsSupported.value && !isIOS) {
    toggleNativeFs();
    return;
  }
  // iOS 或原生不支持：走极简伪全屏
  isFs.value = !isFs.value;
}

function onMainClick() {
  if (ui.showInfo) {
    ui.closeInfo();
    appKey.value++;
  }
}

// 侧边栏完全由CSS控制，无需JS干预
</script>

<style scoped>
/* DnD 风格字体导入 */
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Code+Pro:wght@400;500;600&display=swap');

/* 只控制我们自己的容器，不影响宿主页面 */
:global(#app) {
  height: 715px; /* 固定高度，避免100%导致的问题 */
  max-height: 715px;
  overflow: hidden; /* 交由 Stage 自身滚动 */
}

/* 全屏时恢复100%高度 */
.dnd-layout.fs :global(#app) {
  height: 100% !important;
  max-height: 100% !important;
}
.dnd-layout {
  position: relative;
  height: 100%;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  font-family: 'Noto Sans', sans-serif; /* 保持原有字体，正文由酒馆控制 */
  color: #e8dcc0;
  background: linear-gradient(135deg, #1a1612 0%, #2a2520 100%);
  font-size: 15px;
  font-style: normal;
  font-weight: 500;
  line-height: 23px;
  margin-top: 0px;
  margin-bottom: 10px;
  /* 主题变量：供子组件通过 var() 使用，避免 scoped 优先级困扰 */
  --desk-bg: linear-gradient(135deg, #1a1612 0%, #2a2520 100%);
  --hero-bg: linear-gradient(135deg, #2d1810 0%, #1a1612 100%);
  --hero-border: rgba(139, 69, 19, 0.4);
  --stage-bg: linear-gradient(135deg, #2d1810 0%, #1a1612 100%);
  --stage-border: rgba(139, 69, 19, 0.4);
  --input-area-bg: linear-gradient(135deg, rgba(45, 24, 16, 0.8) 0%, rgba(26, 22, 18, 0.9) 100%);
  --input-area-border: rgba(139, 69, 19, 0.4);
  --text-input-bg: linear-gradient(135deg, rgba(15, 18, 22, 0.9) 0%, rgba(26, 22, 18, 0.8) 100%);
  --text-input-border: rgba(139, 69, 19, 0.3);
  --text-input-color: #e8dcc0;
  --text-input-border-focus: rgba(212, 175, 55, 0.6);
  --text-input-outline: rgba(212, 175, 55, 0.2);
  --text-input-placeholder: rgba(232, 220, 192, 0.5);
  /* 添加纸质纹理效果 */
  background-image:
    radial-gradient(circle at 25% 25%, rgba(244, 236, 210, 0.02) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(244, 236, 210, 0.01) 0%, transparent 50%);
  /* 避免尺寸类属性在全屏切换/抽屉开关时产生"缓动缩放"视觉抖动 */
  transition:
    color 0.3s ease,
    background 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

.dnd-layout.dark-mode {
  color: #c9d1d9;
  background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
  /* 暗色变量 */
  --desk-bg: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
  --hero-bg: linear-gradient(135deg, #21262d 0%, #161b22 100%);
  --hero-border: rgba(48, 54, 61, 0.4);
  --stage-bg: linear-gradient(135deg, #21262d 0%, #161b22 100%);
  --stage-border: rgba(48, 54, 61, 0.4);
  --input-area-bg: linear-gradient(135deg, rgba(33, 38, 46, 0.8) 0%, rgba(22, 27, 34, 0.9) 100%);
  --input-area-border: rgba(48, 54, 61, 0.4);
  --text-input-bg: linear-gradient(135deg, rgba(22, 27, 34, 0.9) 0%, rgba(33, 38, 46, 0.8) 100%);
  --text-input-border: rgba(48, 54, 61, 0.3);
  --text-input-color: #c9d1d9;
  --text-input-border-focus: rgba(88, 166, 255, 0.6);
  --text-input-outline: rgba(88, 166, 255, 0.2);
  --text-input-placeholder: rgba(201, 209, 217, 0.5);
  background-image:
    radial-gradient(circle at 25% 25%, rgba(48, 54, 61, 0.02) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(33, 38, 46, 0.01) 0%, transparent 50%);
}

/* 夜间模式：侧边栏 */
.dnd-layout.dark-mode .sidebar-panel {
  background: linear-gradient(135deg, #21262d 0%, #161b22 100%);
  border-color: rgba(48, 54, 61, 0.4);
}

/* 夜间模式：侧边栏按钮 */
.dnd-layout.dark-mode .side-btn {
  background: rgba(33, 38, 46, 0.6);
  color: #c9d1d9;
  border-color: rgba(48, 54, 61, 0.3);
}
.dnd-layout.dark-mode .side-btn:hover {
  background: rgba(48, 54, 61, 0.8);
  border-color: rgba(48, 54, 61, 0.5);
  color: #58a6ff;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    0 0 8px rgba(88, 166, 255, 0.2);
}

/* 夜间模式：面板弹窗 */
.dnd-layout.dark-mode .skill-panel {
  background: linear-gradient(135deg, #21262d 0%, #161b22 100%);
  border-color: rgba(48, 54, 61, 0.4);
  box-shadow:
    0 0 0 2px rgba(88, 166, 255, 0.2),
    0 12px 32px rgba(0, 0, 0, 0.6),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}
.dnd-layout.dark-mode .skill-panel::before {
  border-color: rgba(88, 166, 255, 0.1);
}
.dnd-layout.dark-mode .skill-panel header {
  background: linear-gradient(135deg, rgba(33, 38, 46, 0.8) 0%, rgba(22, 27, 34, 0.9) 100%);
  border-bottom-color: rgba(48, 54, 61, 0.4);
}
.dnd-layout.dark-mode .skill-panel header h3 {
  color: #58a6ff;
}
.dnd-layout.dark-mode .skill-panel .body {
  color: #c9d1d9;
}

/* 夜间模式：卡片 */
.dnd-layout.dark-mode .card {
  background: rgba(33, 38, 46, 0.6);
  border-color: rgba(48, 54, 61, 0.3);
}
.dnd-layout.dark-mode .card:hover {
  border-color: rgba(88, 166, 255, 0.3);
  background: rgba(33, 38, 46, 0.8);
}
.dnd-layout.dark-mode .card-title {
  color: #58a6ff;
}

/* 夜间模式：按钮 */
.dnd-layout.dark-mode .menu-btn {
  background: linear-gradient(145deg, #21262d 0%, #161b22 100%);
  border-color: rgba(48, 54, 61, 0.6);
  color: #58a6ff;
}
.dnd-layout.dark-mode .menu-btn:hover {
  background: linear-gradient(145deg, #30363d 0%, #21262d 100%);
  border-color: rgba(48, 54, 61, 0.8);
}

.dnd-layout.dark-mode .class-btn {
  background: linear-gradient(145deg, #30363d 0%, #21262d 100%);
  color: #c9d1d9;
  border-color: rgba(48, 54, 61, 0.6);
}
.dnd-layout.dark-mode .class-btn:hover {
  background: linear-gradient(145deg, #3d444d 0%, #30363d 100%);
  border-color: rgba(48, 54, 61, 1);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 3px 6px rgba(0, 0, 0, 0.4),
    0 0 8px rgba(88, 166, 255, 0.2);
}

.dnd-layout.dark-mode .btn-primary {
  background: linear-gradient(145deg, #238636 0%, #1a7f37 100%);
  color: #c9d1d9;
  border-color: rgba(48, 54, 61, 0.8);
}
.dnd-layout.dark-mode .btn-primary:hover {
  background: linear-gradient(145deg, #2ea043 0%, #238636 100%);
  border-color: rgba(48, 54, 61, 1);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 3px 6px rgba(0, 0, 0, 0.4),
    0 0 8px rgba(46, 160, 67, 0.2);
}
.dnd-layout.fs {
  position: fixed;
  inset: 0;
  z-index: 2147483638; /* 低于抽屉/弹窗 */
}
/* DnD 字体类 */
.dnd-title {
  font-family: 'Cinzel', 'Times New Roman', serif;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.dnd-body {
  font-family: 'Crimson Text', 'Georgia', serif;
  font-weight: 400;
  line-height: 1.6;
}

.dnd-data {
  font-family: 'Source Code Pro', 'Consolas', monospace;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.dnd-description {
  font-family: 'Libre Baskerville', 'Times New Roman', serif;
  font-weight: 400;
  line-height: 1.7;
  font-style: italic;
}

/* 全屏时减少内边距，放大可用宽度 */
.dnd-layout.fs .desktop-layout {
  padding: 0 12px 12px; /* 顶部不留白，去除 top-bar 占位 */
  height: 100%;
}
/* 全屏时放大侧栏宽度，并固定到屏幕边缘 */
.dnd-layout.fs .sidebar-panel {
  width: min(360px, 22vw);
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  height: 100vh;
}
/* 全屏时放大弹窗，改善压缩问题 */
.dnd-layout.fs .skill-panel {
  width: clamp(520px, 42vw, 1024px);
}
/* 全屏时让正文平铺展开 */
:global(.dnd-layout.fs .stage-container) {
  max-width: 100% !important;
  width: 100% !important;
}
:global(.dnd-layout.fs .init-page) {
  max-width: 96vw !important;
  width: 96vw !important;
  min-height: 100% !important;
}
/* 全屏下：侧边栏面板仍保持单列，避免拥挤 */
.dnd-layout.fs .skill-panel .body .card-grid {
  grid-template-columns: 1fr !important;
  gap: 12px;
}
.dnd-layout.fs .skill-panel .body .card {
  padding: 10px;
}
.dnd-layout.fs .skill-panel .body .kv-row {
  padding: 6px 0;
}
.dnd-layout.fs .skill-panel .body .chips {
  gap: 6px;
}
/* 使 KvTree 在全屏下与正常态一致的行距与标题间距 */
.dnd-layout.fs .skill-panel .body .kv-tree .row {
  padding: 6px 0;
}
.dnd-layout.fs .skill-panel .body .kv-tree .k {
  margin-right: 10px;
}
.dnd-layout.fs .skill-panel .body .kv-tree .title {
  margin: 8px 0 6px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(139, 69, 19, 0.4);
  background: linear-gradient(135deg, #2d1810 0%, #1a1612 100%);
  color: #e8dcc0;
  position: sticky;
  top: 0;
  z-index: 2147483639;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}
.dnd-layout.dark-mode .topbar {
  background: linear-gradient(135deg, #21262d 0%, #161b22 100%);
  border-bottom-color: rgba(48, 54, 61, 0.4);
  color: #c9d1d9;
}
.brand {
  font-family: 'Cinzel', 'Times New Roman', serif;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 1px;
  color: #d4af37;
  text-shadow: 0 0 6px rgba(212, 175, 55, 0.2);
}
.right-actions {
  display: flex;
  gap: 8px;
}
.menu-btn {
  padding: 6px;
  background: linear-gradient(145deg, #3a2a1e 0%, #2d1810 100%);
  border: 1px solid rgba(139, 69, 19, 0.6);
  border-radius: 6px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d4af37;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: all 0.15s ease;
}
.menu-btn:hover {
  background: linear-gradient(145deg, #4a3728 0%, #3a1e14 100%);
  border-color: rgba(139, 69, 19, 0.8);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transform: translateY(-1px);
}
.menu-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.hamburger {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.hamburger span {
  width: 14px;
  height: 2px;
  background: #d4af37;
  border-radius: 1px;
}

/* 单栏布局 */
.desktop-layout {
  display: block;
  height: calc(100% - 40px);
  padding: 16px;
  overflow: hidden; /* 保持hidden，让子元素处理滚动 */
  position: relative;
  /* 不对尺寸做transition，避免慢慢缩回的视觉 */
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  background: var(--desk-bg); /* 普通模式也有背景色 */
}

/* 右侧抽屉 */
.sidebar-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(260px, 20vw);
  background: linear-gradient(135deg, #2d1810 0%, #1a1612 100%);
  border: 1px solid rgba(139, 69, 19, 0.4);
  border-radius: 8px 0 0 8px;
  border-right: none;
  transform: translateX(100%);
  /* 仅过渡位移，不过渡尺寸，避免"慢慢缩回" */
  transition: transform 0.12s ease-out;
  z-index: 2147483640;
  pointer-events: none;
  overflow: hidden;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
  /* 优化性能，防闪动 */
  will-change: transform;
  contain: layout style paint;
  /* 确保内容不会导致重排 */
  -webkit-transform: translateZ(0);
  transform: translateZ(0) translateX(100%);
  backface-visibility: hidden;
  /* 隐藏滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.sidebar-panel::-webkit-scrollbar {
  display: none;
}
.sidebar-panel * {
  box-sizing: border-box;
}
@media (max-width: 900px) {
  .sidebar-panel {
    width: 40vw;
  }
}
.sidebar-panel.open {
  transform: translateZ(0) translateX(0);
  pointer-events: auto;
}

.side-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  /* 防重排闪动 */
  contain: layout style;
  will-change: auto;
  /* 硬件加速 */
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  /* 隐藏滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.side-buttons::-webkit-scrollbar {
  display: none;
}
.side-btn {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(139, 69, 19, 0.4);
  background: rgba(45, 24, 16, 0.6);
  color: #e8dcc0;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.dnd-layout.fs .side-btn {
  padding: 10px 14px; /* 全屏时放大按钮 */
  font-size: 14px;
}
.side-btn:hover {
  background: rgba(58, 30, 20, 0.8);
  border-color: rgba(139, 69, 19, 0.5);
  color: #d4af37;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    0 0 8px rgba(212, 175, 55, 0.2);
  transform: translateX(-2px) scale(1.02);
  animation: sideButtonGlow 0.6s ease-out;
}
@keyframes sideButtonGlow {
  0% {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  50% {
    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
  }
  100% {
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.3),
      0 0 8px rgba(212, 175, 55, 0.2);
  }
}

/* 主体区域 */
.main-content {
  position: relative;
  z-index: 1;
  overflow: hidden; /* 交由 Stage 自己处理滚动 */
  overflow-x: hidden;
  min-width: 0;
  height: 100%;
  /* 添加以下样式确保子元素能正确计算高度 */
  display: flex;
  flex-direction: column;
}
/* 允许 Init 页面在主内容内滚动 */
.main-content > :global(.init-page) {
  height: 100%;
  overflow: auto;
  flex: 1 1 auto;
  min-height: 0; /* 允许在父 flex 容器内收缩，从而自身产生滚动 */
}

/* 夜间模式：主体区域 */
.dnd-layout.dark-mode .main-content {
  background: linear-gradient(135deg, #0d1117 0%, #161b22 100%) !important;
  color: #c9d1d9 !important;
}

/* 夜间模式：桌面布局 */
.dnd-layout.dark-mode .desktop-layout {
  background: linear-gradient(135deg, #0d1117 0%, #161b22 100%) !important;
}

/* 夜间模式：整体背景 */
.dnd-layout.dark-mode {
  background: linear-gradient(135deg, #0d1117 0%, #161b22 100%) !important;
}

/* 弹窗复用样式 */
.skill-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483641;
}
.skill-panel {
  width: min(320px, 10vw); /* 约占屏幕十分之一 */
  max-width: calc(100% - 40px);
  background: linear-gradient(135deg, #2d1810 0%, #1a1612 100%);
  border: 3px solid #8b4513;
  border-radius: 16px;
  box-shadow:
    0 0 0 2px rgba(212, 175, 55, 0.3),
    0 12px 32px rgba(0, 0, 0, 0.6),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  overflow-x: hidden; /* 避免横向滚动 */
  position: relative;
}
.skill-panel::before {
  content: '';
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  bottom: 8px;
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 12px;
  pointer-events: none;
  z-index: 1;
}
.skill-panel::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(212, 175, 55, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(139, 69, 19, 0.02) 0%, transparent 50%);
  pointer-events: none;
  z-index: 1;
}
.skill-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 2px solid rgba(139, 69, 19, 0.4);
  background: linear-gradient(135deg, rgba(45, 24, 16, 0.8) 0%, rgba(26, 22, 18, 0.9) 100%);
  position: relative;
  z-index: 2;
}
.skill-panel header h3 {
  margin: 0;
  color: #d4af37;
  font-family: 'Cinzel', 'Times New Roman', serif;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
.skill-panel .body {
  padding: 16px;
  color: #e8dcc0;
  max-height: 70vh;
  overflow: auto;
  box-sizing: border-box;
  overflow-x: hidden; /* 禁止横向滚动 */
  word-break: break-word; /* 默认文本可换行 */
  overflow-wrap: anywhere; /* 超长连续字符也换行 */
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 100%;
}
.skill-panel .body * {
  max-width: 100%;
  box-sizing: border-box;
}

/* 面板内卡片统一单列，避免窄面板下多列导致溢出 */
.skill-panel .body .card-grid {
  grid-template-columns: 1fr !important; /* 强制侧边栏面板内单列，避免被通用规则覆盖 */
}
/* 网格子项允许收缩，防止内容以最小内容宽度撑破容器 */
.skill-panel .body .card-grid > * {
  min-width: 0;
}
/* 深入子组件内容，统一防溢出与换行策略 */
:deep(.kv-tree2),
:deep(.kv-tree) {
  max-width: 100%;
}
:deep(.kv-row),
:deep(.kv-row .v) {
  min-width: 0;
  word-break: break-word;
  overflow-wrap: anywhere;
}
:deep(details) {
  min-width: 0;
}
:deep(img),
:deep(video),
:deep(canvas) {
  max-width: 100%;
  height: auto;
}
:deep(pre),
:deep(code) {
  white-space: pre-wrap;
  word-break: break-word;
}

/* 防止内部块把容器撑宽：限制子元素最大宽度并允许换行 */
.skill-panel .body *,
.skill-panel .body img,
.skill-panel .body video,
.skill-panel .body canvas {
  max-width: 100%;
  box-sizing: border-box;
}
.skill-panel .close {
  background: #2a2a2f;
  border: 1px solid #47474a;
  border-radius: 6px;
  color: #e8e2d4;
  width: 28px;
  height: 28px;
  cursor: pointer;
}
.skill-panel .close:hover {
  background: #333338;
}

/* 简单信息展示样式 */
.kv {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kv-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap; /* 窄宽度下允许换行，避免溢出 */
  padding: 6px 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.12);
}
.kv-row .k {
  opacity: 0.85;
  margin-right: 10px;
  min-width: 0;
  flex: 0 1 auto;
}
.kv-row .v {
  font-weight: 600;
  word-break: break-word;
  overflow-wrap: anywhere;
  min-width: 0; /* 允许在 flex 中收缩，防止把容器撑宽 */
  flex: 1 1 0; /* 值列可收缩并占满剩余宽度，自动换行 */
}
.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  width: 100%;
}
.chip {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  min-width: 0;
  max-width: 100%;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.chip .badge {
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 6px;
  background: linear-gradient(145deg, #d4af37 0%, #b8941f 100%);
  color: #2d1810;
  border: 1px solid rgba(139, 69, 19, 0.4);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  text-shadow: none;
  transition: all 0.3s ease;
  animation: badgePulse 2s ease-in-out infinite;
}
@keyframes badgePulse {
  0%,
  100% {
    box-shadow: 0 0 4px rgba(212, 175, 55, 0.3);
  }
  50% {
    box-shadow: 0 0 8px rgba(212, 175, 55, 0.6);
  }
}
.note {
  opacity: 0.8;
  margin-top: 10px;
  font-size: 12px;
}

/* 卡片栅格 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.card {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.06);
  min-width: 0;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
.card:hover {
  border-color: rgba(212, 175, 55, 0.3);
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.1), transparent);
  transition: left 0.5s ease;
}
.card:hover::before {
  left: 100%;
}
.card-title {
  font-family: 'Cinzel', 'Times New Roman', serif;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #d4af37;
  white-space: normal; /* 标题允许换行，避免撑宽 */
  letter-spacing: 0.5px;
}
.sub-title {
  margin: 8px 0 4px;
  opacity: 0.9;
}
.feature {
  border: 1px dashed rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  padding: 8px;
  margin-top: 6px;
}
.f-name {
  font-weight: 700;
  margin-bottom: 4px;
}

/* 自定义滚动条 */
.stage-container::-webkit-scrollbar,
.skill-panel .body::-webkit-scrollbar,
.sidebar-panel::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.stage-container::-webkit-scrollbar-thumb,
.skill-panel .body::-webkit-scrollbar-thumb,
.sidebar-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.22);
  border-radius: 8px;
}
.stage-container::-webkit-scrollbar-track,
.skill-panel .body::-webkit-scrollbar-track,
.sidebar-panel::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
}
.stage-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.22) rgba(255, 255, 255, 0.06);
}

/* 响应式 */
@media (max-width: 1200px) {
  .skill-panel {
    width: min(360px, 24vw); /* 保持窄，不超过四分之一 */
  }
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .skill-panel {
    width: 96vw;
    max-width: 96vw;
    overflow-x: hidden;
  }
  /* 手机侧边栏弹窗内的卡片一列平铺 */
  .skill-panel .body .card-grid {
    grid-template-columns: 1fr !important;
  }
  /* 全屏+手机：面板内卡片也应一列平铺 */
  .dnd-layout.fs .skill-panel .body .card-grid {
    grid-template-columns: 1fr;
  }
  /* 手机端：提升折叠卡片可点击区域与可读性 */
  .details-card summary.card-title {
    padding: 10px 2px;
    font-size: 16px;
  }
  .card {
    padding: 10px;
  }
  /* 确保 KvTree2 在手机端不会溢出 */
  .skill-panel .body :deep(.kv2) {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
  .skill-panel .body :deep(.kv2 .row) {
    grid-template-columns: 1fr !important;
    gap: 2px !important;
  }
  .skill-panel .body :deep(.kv2 .k),
  .skill-panel .body :deep(.kv2 .v) {
    font-size: 12px !important;
    line-height: 1.3 !important;
    word-break: break-all !important;
  }
  .skill-panel .body {
    padding: 12px;
  }
  /* 手机端：键值行纵向堆叠，避免挤压换行导致溢出 */
  .kv-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .kv-row .v {
    word-break: break-word;
  }
  /* 手机端：chips 间距稍大，便于触控 */
  .chips {
    gap: 8px;
  }
  /* 全屏+手机：侧边栏宽度用移动端宽度覆盖桌面规则 */
  .dnd-layout.fs .sidebar-panel {
    width: 40vw !important;
  }
  .card-grid {
    grid-template-columns: 1fr;
  }
  .desktop-layout {
    padding: 10px;
    background: var(--desk-bg);
  }
  .sidebar-panel {
    top: 0;
    bottom: 0;
    width: 40vw; /* 约占 1/3 屏幕，便于操作 */
    border-radius: 0;
    border-left: none;
    border-right: none;
    overflow-x: hidden;
  }
  .side-buttons {
    padding: 8px;
  }
  .side-btn {
    padding: 10px 10px; /* 保持触控，但整体更窄 */
    font-size: 15px;
  }
  .topbar {
    height: 48px;
  }
  .skill-panel .body {
    max-height: calc(100vh - 120px);
    -webkit-overflow-scrolling: touch;
  }
}

/* Level Up 面板通用样式（沿用 skill-modal 的外层） */
.lv-panel {
  width: 560px;
  max-width: calc(100% - 40px);
  background: #15151a;
  border: 1px solid #3a3a3c;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
}
.lv-panel header {
  padding: 10px 12px;
  border-bottom: 1px solid #2a2a2f;
}
.lv-panel header h3 {
  margin: 0;
  color: #ffd700;
}
.lv-body {
  padding: 12px;
}
.class-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.class-btn {
  padding: 10px 12px;
  border: 2px solid rgba(139, 69, 19, 0.6);
  background: linear-gradient(145deg, #8b4513 0%, #2d1810 100%);
  color: #e8dcc0;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Cinzel', 'Times New Roman', serif;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.3px;
  transition: all 0.2s ease;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.3);
}
.class-btn .badge {
  margin-left: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  background: linear-gradient(145deg, #d4af37 0%, #b8941f 100%);
  color: #2d1810;
  border: 1px solid rgba(139, 69, 19, 0.4);
  font-size: 11px;
  font-weight: 700;
  text-shadow: none;
}
.class-btn.active,
.class-btn:hover {
  background: linear-gradient(145deg, #a0531a 0%, #3a1e14 100%);
  border-color: rgba(139, 69, 19, 1);
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 3px 6px rgba(0, 0, 0, 0.4),
    0 0 8px rgba(212, 175, 55, 0.2);
}
.lv-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #2a2a2f;
}
.btn-primary {
  padding: 10px 16px;
  background: linear-gradient(145deg, #2d4a22 0%, #1e3317 100%);
  color: #d4af37;
  border: 2px solid rgba(139, 69, 19, 0.8);
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Cinzel', 'Times New Roman', serif;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.3px;
  transition: all 0.2s ease;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.3);
}
.btn-primary:hover {
  background: linear-gradient(145deg, #3a5c2c 0%, #25401c 100%);
  border-color: rgba(139, 69, 19, 1);
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 3px 6px rgba(0, 0, 0, 0.4),
    0 0 8px rgba(212, 175, 55, 0.2);
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-alt {
  padding: 8px 12px;
  background: #2a2a2f;
  color: #e8e2d4;
  border: 1px solid #47474a;
  border-radius: 8px;
  cursor: pointer;
}

/* ASI 面板 */
.asi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.asi-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #2a2a2f;
  border-radius: 8px;
  padding: 8px;
}
.asi-ctrl {
  display: flex;
  align-items: center;
  gap: 8px;
}
.asi-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #47474a;
  background: #2a2a2f;
  color: #e8e2d4;
  cursor: pointer;
}
</style>
