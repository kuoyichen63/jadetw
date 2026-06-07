import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Gem, Search, CheckCircle, XCircle, Trophy, Compass, Crosshair, 
  Map, Sunrise, BarChart2, ShieldAlert, Download, Copy, Trash2, 
  Edit, RefreshCw, X, User, Clock, Check, LogOut, Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, addDoc, updateDoc, doc, deleteDoc, getDocs, getDoc, setDoc 
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './firebase';

// --- 台灣特色石種圖鑑 ---
const STONE_DATA = [
  { id: 'quartz', type: 'stone', name: '石英', weight: 150, image: 'https://raw.githubusercontent.com/kuoyichen63/jade/main/001.png',
    clues: ['為重要的造岩礦物，抗風化能力強', '硬度為7，具有玻璃光澤、貝狀斷口及壓電性質，比重為2.65', '在岩石中常以集合體形態產出而呈粒狀或塊狀，但在裂隙或孔洞中，亦可發現透明的六邊形柱狀晶體'], 
    explanation: '這是石英。很常見的造岩礦物！', wrong_explanation: '答錯了，這其實是普通的石英。', options: ['石英', '白玉髓', '雪花玉', '年糕玉'] },
  
  { id: 'serpentine', type: 'stone', name: '蛇紋岩', weight: 120, image: 'https://raw.githubusercontent.com/kuoyichen63/jade/main/002.png',
    clues: ['帶有黃綠色底，表面交織著類似蛇皮的網狀紋理。', '硬度偏低，常被誤認為台灣閃玉。', '雖然外觀翠綠，但不具備玉石的溫潤與堅韌。'], 
    explanation: '這是蛇紋岩。硬度較低，常被誤認。', wrong_explanation: '被騙了！這是蛇紋岩，不是台灣閃玉喔！', options: ['蛇紋岩', '普通台灣玉', '蠟光台灣玉', '金瓜石'] },
  
  { id: 'jinguashih', type: 'stone', name: '金瓜石', weight: 80, image: 'https://raw.githubusercontent.com/kuoyichen63/jade/main/003.png',
    clues: ['硬度約四度，屬糜嶺岩的變質岩。它可分為山、溪及海邊不同區域之種類。', '細緻，色澤柔美、亮麗，造形簡單、樸拙，所以，除了被稱為雅石外，也有人稱為禪石。', '因顏色如食用的金瓜而得名。事實上，這種石頭含有黃、綠、黑等多種顏色。'], 
    explanation: '極具特色的金瓜石，造型古樸。', wrong_explanation: '錯過好石頭了！這是極具特色的金瓜石。', options: ['金瓜石', '年糕玉', '玫瑰石', '蛇紋岩'] },
  
  { id: 'bamboo_leaf', type: 'stone', name: '台灣竹葉石', weight: 60, image: 'https://raw.githubusercontent.com/kuoyichen63/jade/main/004.png',
    clues: ['學名藍閃石片岩，因基岩內含暗色長條狀藍閃石結晶、交織形似竹葉而得名。其質地堅韌緻密，與淺色基質對比顯著。', '以深色岩體共生柱狀礦物斑紋而著稱。岩構堅硬且理面細滑，紋理具幾何規律，為觀賞性雅石。', '因礦相色澤對比強烈且具高視覺張力而聞名。結晶層次分明，展現特殊地質演化，為天然陳設品。'], 
    explanation: '質地堅硬，圖案生動自然的台灣竹葉石。', wrong_explanation: '可惜，這是美麗的台灣竹葉石！', options: ['台灣竹葉石', '台灣雞血石', '台灣墨玉', '黑碧玉'] },
  
  { id: 'black_jasper', type: 'stone', name: '黑碧玉', weight: 50, image: 'https://raw.githubusercontent.com/kuoyichen63/jade/main/005.png',
    clues: ['因含高濃度暗色礦物致通體純黑且不透光而得名。矽質緻密且硬度甚高，展現岩石物理之美。', '以不透明微晶質結構呈現深沉暗色系而著稱。抗風化能力強且吸光率高，散發厚重感，為雄渾之雕刻石材。', '因光學吸收極強且表面平整度佳而聞名。岩體厚重沉穩，具玻璃至油脂光澤之過渡，為雕飾加工良伴。'], 
    explanation: '拋光後明亮如鏡，散發沉穩大氣之美的黑碧玉。', wrong_explanation: '這可是大氣的黑碧玉，是很好的雅石。', options: ['黑碧玉', '台灣墨玉', '台灣竹葉石', '蛇紋岩'] },
  
  { id: 'rice_cake', type: 'jade', name: '年糕玉', weight: 35, image: 'https://raw.githubusercontent.com/kuoyichen63/jade/main/006.png',
    clues: ['因二氧化矽隱晶質結構呈膠狀宛如年糕而得名。質地細膩均勻，呈半透明微透光。', '以色澤飽和且具高拋光度之脂狀光澤而著稱。韌性極佳且結構無解理，視覺具膨脹感。', '因光學折射呈現均勻漫射與水潤感而聞名。質地緻密滑順，透光度穩定，具工藝價值。'], 
    explanation: '富含膠質感，外觀宛如年糕般細膩溫潤。', wrong_explanation: '猜錯囉，這可是玩家最愛的年糕玉！', options: ['年糕玉', '白玉髓', '雪花玉', '蠟光台灣玉'] },
  
  { id: 'white_chalcedony', type: 'jade', name: '白玉髓', weight: 35, image: 'https://raw.githubusercontent.com/kuoyichen63/jade/main/007.png',
    clues: ['這種石頭常出現在海岸地區，外觀有透明、半透明或乳白色，硬度約7.5且質地細緻。', '其中以乳白如牛奶般的品種最受歡迎，常被加工成飾品。', '這類石頭在晶體中有時可見冰裂紋般的自然紋路變化。'], 
    explanation: '質地潔白純淨、微透如冰，散發溫潤光澤。', wrong_explanation: '可惜了，這是高品質的白玉髓。', options: ['白玉髓', '石英', '雪花玉', '年糕玉'] },
  
  { id: 'common_jade', type: 'jade', name: '普通台灣玉', weight: 50, image: 'https://raw.githubusercontent.com/kuoyichen63/jade/main/008.png',
    clues: ['這種玉石常帶有明亮的玻璃光澤，顏色多半呈現翠綠色或墨綠色，因此有人給它一個和綠色玉石有關的俗稱。', '它是台灣玉產區中最常見、分布最廣的一種玉石。雖然名稱中帶有「普通」二字，但這並不代表它的價值一定較低。', '翠綠色調、堅韌的質地與亮麗的玻璃光澤，是它最具代表性的特徵，也讓許多人一提到台灣的著名玉石就會想到它。'], 
    explanation: '極具韌性，為台灣代表玉石。', wrong_explanation: '這可是正宗的普通台灣玉（豐田玉）啊！', options: ['普通台灣玉', '蛇紋岩', '蠟光台灣玉', '貓眼台灣玉'] },
  
  { id: 'taiwan_bloodstone', type: 'jade', name: '台灣雞血石', weight: 30, image: 'https://raw.githubusercontent.com/kuoyichen63/jade/main/009.png',
    clues: ['這是一種由紅色礦物與石英共同形成的岩石，常見紅色部分與白色礦物交錯出現，是一種具有明顯色彩對比的天然石材。', '在石頭表面上，可以看到紅色底色中，經常有白色石英像線條一樣貫穿其中，形成紅白相間、紋理清楚的特殊外觀。', '這種石頭主要產於台灣東部花蓮地區，因其紅白相間的特徵，有時被稱為「赤白仔」。'], 
    explanation: '帶有雞血般鮮豔的紅色斑紋，質地緻密。', wrong_explanation: '看走眼了，這是珍貴的台灣雞血石。', options: ['台灣雞血石', '玫瑰石', '台灣竹葉石', '金瓜石'] },
  
  { id: 'taiwan_black_jade', type: 'jade', name: '台灣墨玉', weight: 25, image: 'https://raw.githubusercontent.com/kuoyichen63/jade/main/010.png',
    clues: ['這是一種玉石，屬於蛇紋石類礦物。它主要由多種礦物組成，其中包含葉蛇紋石與磁鐵礦等成分。', '它的顏色多變，通常呈現深綠色到接近黑色之間，看起來色澤深沉、帶有金屬或暗色礦物的質感。', '具獨特魅力且帶有磁性的特徵，是花蓮特產的珍貴玉石。'], 
    explanation: '色澤黑中透綠，質地溫潤帶磁性。', wrong_explanation: '這是極具能量的台灣墨玉。', options: ['台灣墨玉', '黑碧玉', '蛇紋岩', '普通台灣玉'] },
  
  { id: 'snowflake', type: 'jade', name: '雪花玉', weight: 10, image: 'https://raw.githubusercontent.com/kuoyichen63/jade/main/011.png',
    clues: ['這種石頭是白色微透明的玉髓，裡面有像雪花或雲霧一樣的紋路，層次感很明顯。', '它常帶棕褐色外皮，內部白色，有時還會出現淡淡紫色，因為和紫色玉髓共生。', '主要產於臺東海岸，若出現金黃色紋路會被稱為「洒金黃」，屬於較佳品。'], 
    explanation: '內部具白色絮狀結晶，宛如漫天雪花飛舞。', wrong_explanation: '錯過神物了，這是非常美麗的雪花玉。', options: ['雪花玉', '白玉髓', '石英', '玫瑰石'] },
  
  { id: 'waxy_jade', type: 'jade', name: '蠟光台灣玉', weight: 15, image: 'https://raw.githubusercontent.com/kuoyichen63/jade/main/012.png',
    clues: ['這種玉石擁有特殊的灰藍色調，色彩低調沉穩，與常見玉石的色澤有所不同。', '它的內部由極其細微的礦物顆粒組成，肉眼難以分辨單一晶體，整體結構十分緻密。', '光線進入玉石後，會在細小晶體間產生漫射，使表面呈現柔和溫潤的蠟質光澤，而非明亮的玻璃光澤。'], 
    explanation: '表面呈現柔和的蠟狀光澤，摸起來溫潤滑膩。', wrong_explanation: '這是極其溫潤的蠟光台灣玉。', options: ['蠟光台灣玉', '普通台灣玉', '年糕玉', '蛇紋岩'] },
  
  { id: 'catseye_jade', type: 'jade', name: '貓眼台灣玉', weight: 2, image: 'https://raw.githubusercontent.com/kuoyichen63/jade/main/013.png',
    clues: ['這種石頭的內部藏有許多細長的纖維狀結晶顆粒，有些甚至可長達約100公分。這些纖維並不是隨機分布，而是朝著相同方向整齊排列。', '當光線照射到這種石頭時，如果觀察角度適當，表面會出現一道明亮的光帶。這道光帶看起來很像某種動物的眼睛，會隨著石頭轉動而移動。', '工匠會依照石頭內部纖維的排列方向，將原石研磨成球面或弧面。經過精細加工後，石頭表面便能展現靈動而集中的光芒，形成獨特的觀賞效果。'], 
    explanation: '傳說級神物出土！台灣貓眼閃玉，產量極少，玉中之王！', wrong_explanation: '天啊！你把傳說中的貓眼台灣玉當成普通石頭了！', options: ['貓眼台灣玉', '普通台灣玉', '蠟光台灣玉', '金瓜石'] },

  { id: 'rhodonite', type: 'stone', name: '玫瑰石', weight: 20, image: 'https://raw.githubusercontent.com/kuoyichen63/jade/main/014.png',
    clues: ['本質上是由多種錳礦構成的「富錳岩石」，其外表粗獷黝黑，卻在層層琢磨下，迸發出令人驚豔的瑰麗色澤與多變紋理，展現出原生質樸與人工藝品之間的反差美。', '這是一種經歷複雜地質作用形成的天然寶石，往往披著黑色的氧化外衣，唯有透過細緻的加工與表面封裝，才能褪去黯淡，將隱藏在內部的礦物多樣性與鮮豔美感徹底釋放。', '並非單一礦物，而是一群含錳礦物的共生集合，這種特殊的礦物組合賦予了它豐富的岩理變化，使其成為一種即便外觀不顯眼，卻擁有極高觀賞價值的「富錳岩石」。'], 
    explanation: '色彩瑰麗多變，為極具觀賞價值的富錳岩石！', wrong_explanation: '錯過了，這是色彩斑斕的玫瑰石。', options: ['玫瑰石', '台灣雞血石', '台灣竹葉石', '雪花玉'] }
];

const getRandomStoneData = () => {
  const totalWeight = STONE_DATA.reduce((sum, stone) => sum + stone.weight, 0);
  let randomNum = Math.random() * totalWeight;
  for (let stone of STONE_DATA) {
    if (randomNum < stone.weight) return stone;
    randomNum -= stone.weight;
  }
  return STONE_DATA[0];
};

const generateRandomShape = () => {
  const r = () => 35 + Math.floor(Math.random() * 30); 
  return `${r()}% ${r()}% ${r()}% ${r()}% / ${r()}% ${r()}% ${r()}% ${r()}%`;
};

// --- 石頭生成設定 ---
const SPAWN_RADIUS = 1000; 
const TOTAL_INTERACTIVE_STONES = 60; // 可互動的特殊石頭
const TOTAL_SCENERY_STONES = 150;    // 純背景造景的普通鵝卵石 (創造寫實海灘)

// 產生可互動的玉石與陷阱
const generateStones = (playerX = 0, playerZ = 0) => {
  return Array.from({ length: TOTAL_INTERACTIVE_STONES }).map((_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * SPAWN_RADIUS;
    return {
      id: `stone_${i}`, 
      x: playerX + Math.cos(angle) * distance,
      z: playerZ + Math.sin(angle) * distance,
      data: getRandomStoneData(),
      shape: generateRandomShape(),
      rotation: Math.random() * 360,
      baseScale: 1.0 // 標準大小
    };
  });
};

// 產生純視覺的鵝卵石 (不具備互動性，只用來鋪滿沙灘)
const generateSceneryStones = (playerX = 0, playerZ = 0) => {
  const sceneryColors = ['bg-stone-500', 'bg-stone-600', 'bg-stone-700', 'bg-neutral-600', 'bg-neutral-700', 'bg-zinc-600'];
  return Array.from({ length: TOTAL_SCENERY_STONES }).map((_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * SPAWN_RADIUS;
    return {
      id: `scenery_${i}`, 
      x: playerX + Math.cos(angle) * distance,
      z: playerZ + Math.sin(angle) * distance,
      colorClass: sceneryColors[Math.floor(Math.random() * sceneryColors.length)],
      shape: generateRandomShape(),
      rotation: Math.random() * 360,
      baseScale: 0.3 + Math.random() * 0.9 // 大小錯落有致 (30% ~ 120%)
    };
  });
};

const renderStoneVisuals = (typeId: string) => {
  const stoneInfo = STONE_DATA.find(s => s.id === typeId);
  const highlight = <div className="absolute top-1 left-1/4 w-1/2 h-1/3 bg-white/20 rounded-full blur-[2px] pointer-events-none z-10"></div>;
  
  if (!stoneInfo) {
    return <div className="w-full h-full bg-stone-600 relative">{highlight}</div>;
  }

  return (
    <div className="w-full h-full relative bg-stone-800 flex items-center justify-center overflow-hidden" style={{ borderRadius: 'inherit' }}>
      <img 
        src={stoneInfo.image} 
        alt={stoneInfo.name}
        className="w-full h-full object-cover pointer-events-none scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 shadow-[inset_-4px_-4px_10px_rgba(0,0,0,0.6),inset_2px_2px_5px_rgba(255,255,255,0.2)] pointer-events-none z-10" style={{ borderRadius: 'inherit' }}></div>
      {highlight}
    </div>
  );
};

// --- Web Audio API 音效引擎 ---
const SoundEngine: {
  ctx: AudioContext | null;
  init: () => void;
  playStep: () => void;
  playAnalyze: () => void;
  playPopup: () => void;
  playCorrect: () => void;
  playWrong: () => void;
} = {
  ctx: null,
  init: function() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  playStep: function() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  },
  playAnalyze: function() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  },
  playPopup: function() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  },
  playCorrect: function() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => { // C5, E5, G5, C6
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.1, t + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.1);
        osc.stop(t + i * 0.1 + 0.4);
    });
  },
  playWrong: function() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.4);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  }
};

interface GameRecordDoc {
  id?: string;
  username: string;
  startTime: string;
  totalDiscovered: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  durationSeconds: number;
}

export default function App() {
  const [gameState, setGameState] = useState<string>('start'); 
  const [score, setScore] = useState<number>(0);
  const [totalDiscovered, setTotalDiscovered] = useState<number>(0);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  
  // 使用者名稱輸入狀態
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<string>('地質旅人');
  const [startTimeStr, setStartTimeStr] = useState<string>('');
  
  // 自訂計時器：統計遊玩秒數
  const [durationSec, setDurationSec] = useState<number>(0);
  const currentRecordIdRef = useRef<string | null>(null);

  // 排行榜 & 後台彈窗
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [leaderboardData, setLeaderboardData] = useState<GameRecordDoc[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);

  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [adminStatus, setAdminStatus] = useState<'locked' | 'signup' | 'unlocked'>('locked');
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [adminSetupPass, setAdminSetupPass] = useState<string>('');
  const [adminSetupPassConfirm, setAdminSetupPassConfirm] = useState<string>('');
  const [adminRecords, setAdminRecords] = useState<GameRecordDoc[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState<boolean>(false);
  
  // 後台編輯功能
  const [editingRecord, setEditingRecord] = useState<GameRecordDoc | null>(null);
  const [editUsername, setEditUsername] = useState<string>('');
  const [editCorrectCount, setEditCorrectCount] = useState<number>(0);
  const [editTotalDiscovered, setEditTotalDiscovered] = useState<number>(0);

  const [windowSize, setWindowSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 375, 
    height: typeof window !== 'undefined' ? window.innerHeight : 667 
  });
  
  const bgSkyRef = useRef<HTMLDivElement>(null);
  const bgGroundRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const oceanRef = useRef<HTMLDivElement>(null);

  const playerRef = useRef({ x: 0, z: 0, yaw: 0, pitch: 0 }); 
  
  const [joystickUI, setJoystickUI] = useState({ x: 0, y: 0, active: false });
  const joystickValueRef = useRef({ x: 0, y: 0 }); 
  const joystickPointerRef = useRef<number | null>(null); 
  const joystickStartRef = useRef({ x: 0, y: 0 }); 
  const dragRef = useRef({ isDragging: false, pointerId: null as number | null, lastX: 0, lastY: 0 }); 
  const lastStepTimeRef = useRef(0);

  // 雙物件池：互動石頭 與 純視覺背景石頭
  const stonesRef = useRef<any[]>([]);
  const stoneDOMRefs = useRef<(HTMLDivElement | null)[]>([]); 
  const sceneryStonesRef = useRef<any[]>([]);
  const sceneryDOMRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [targetedStone, setTargetedStone] = useState<any>(null);
  const targetedStoneRef = useRef<any>(null); 
  const [inspectingStone, setInspectingStone] = useState<any>(null);
  const [appraisalResult, setAppraisalResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const requestRef = useRef<number>(0);

  const FOCAL_LENGTH = 350;
  const CAMERA_HEIGHT = 90;
  const PLAYER_SPEED = 7;
  const DRAG_SENSITIVITY = 0.007; 
  const PITCH_LIMIT = 0.5; 

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateSize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 格式化當前時間為中文日期字串
  const formatDateTime = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  };

  // 儲存與同步資料至 Firestore (即時自動存檔)
  const saveOrUpdateRecord = async (
    isFinal: boolean = false, 
    customScore?: number, 
    customTotal?: number, 
    customSec?: number
  ) => {
    const finalScore = customScore !== undefined ? customScore : score;
    const finalTotal = customTotal !== undefined ? customTotal : totalDiscovered;
    const finalSec = customSec !== undefined ? customSec : durationSec;
    const incorrect = Math.max(0, finalTotal - finalScore);
    const accuracy = finalTotal > 0 ? parseFloat(((finalScore / finalTotal) * 100).toFixed(1)) : 0.0;

    const recordData = {
      username: currentUser,
      startTime: startTimeStr,
      totalDiscovered: finalTotal,
      correctCount: finalScore,
      incorrectCount: incorrect,
      accuracy: accuracy,
      durationSeconds: finalSec,
    };

    try {
      if (currentRecordIdRef.current) {
        // 更新已有記錄
        const docRef = doc(db, 'records', currentRecordIdRef.current);
        await updateDoc(docRef, recordData);
      } else {
        // 建立新記錄
        const recordsCol = collection(db, 'records');
        const newDoc = await addDoc(recordsCol, recordData);
        currentRecordIdRef.current = newDoc.id;
      }
    } catch (err) {
      console.error('Failed to auto-save game record:', err);
    }
  };

  // 開始遊戲計時器與自動同步
  useEffect(() => {
    if (gameState !== 'playing') return;

    // 每秒遊玩秒數 + 1
    const timer = setInterval(() => {
      setDurationSec(prev => {
        const nextSec = prev + 1;
        // 每 5 秒與雲端同步一次 (即時存檔避免斷線遺失數據)
        if (nextSec % 5 === 0) {
          saveOrUpdateRecord(false, score, totalDiscovered, nextSec);
        }
        return nextSec;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, score, totalDiscovered, currentUser, startTimeStr]);

  // 前端綁定不正常斷線的快照與 beforeunload 防護
  useEffect(() => {
    const handleUnloadSave = () => {
      // 在關閉/更新頁面時調用
      if (gameState === 'playing' && currentRecordIdRef.current) {
        saveOrUpdateRecord(true);
      }
    };
    window.addEventListener('beforeunload', handleUnloadSave);
    return () => window.removeEventListener('beforeunload', handleUnloadSave);
  }, [gameState, score, totalDiscovered, durationSec, currentUser]);

  const initGame = async () => {
    SoundEngine.init(); 
    playerRef.current = { x: 0, z: 0, yaw: 0, pitch: 0 };
    stonesRef.current = generateStones(0, 0); 
    sceneryStonesRef.current = generateSceneryStones(0, 0);
    targetedStoneRef.current = null;
    setTargetedStone(null);
    stoneDOMRefs.current = new Array(TOTAL_INTERACTIVE_STONES).fill(null);
    sceneryDOMRefs.current = new Array(TOTAL_SCENERY_STONES).fill(null);
    setInventory({});
    setScore(0);
    setTotalDiscovered(0);
    setDurationSec(0);
    currentRecordIdRef.current = null;

    // 設定玩者名字
    const activeName = usernameInput.trim() !== '' ? usernameInput.trim() : '地質旅人';
    setCurrentUser(activeName);

    const nowStr = formatDateTime(new Date());
    setStartTimeStr(nowStr);

    setGameState('playing');

    // 立刻在資料庫中初始化這筆全新的遊玩紀錄
    const recordData = {
      username: activeName,
      startTime: nowStr,
      totalDiscovered: 0,
      correctCount: 0,
      incorrectCount: 0,
      accuracy: 0,
      durationSeconds: 0,
    };
    try {
      const recordsCol = collection(db, 'records');
      const newDoc = await addDoc(recordsCol, recordData);
      currentRecordIdRef.current = newDoc.id;
    } catch (err) {
      console.error('Firestore record initialization field:', err);
    }
  };

  // 離開遊戲
  const leaveGame = async () => {
    if (currentRecordIdRef.current) {
      // 離開時完成最後一次寫入記錄
      await saveOrUpdateRecord(true);
    }
    // 回到主頁面
    currentRecordIdRef.current = null;
    setUsernameInput('');
    setGameState('start');
  };

  // leaderboard 按鈕點擊，載入紀錄
  const loadLeaderboardData = async () => {
    setLoadingLeaderboard(true);
    try {
      const col = collection(db, 'records');
      const snap = await getDocs(col);
      const data: GameRecordDoc[] = [];
      snap.forEach((d) => {
        data.push({ id: d.id, ...d.data() } as GameRecordDoc);
      });
      // 篩選與排序：以 成功辨識數量 (correctCount) 降序排列。如果相同，可用 startTime 降序。
      const sortedData = data.sort((a, b) => {
        if (b.correctCount !== a.correctCount) {
          return b.correctCount - a.correctCount;
        }
        return b.startTime.localeCompare(a.startTime);
      });
      setLeaderboardData(sortedData);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // 管理後台點擊
  const openAdminPanel = async () => {
    setShowAdminPanel(true);
    setAdminPasswordInput('');
    setAdminSetupPass('');
    setAdminSetupPassConfirm('');
    try {
      const docRef = doc(db, 'system', 'admin_config');
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().password) {
        setAdminStatus('locked');
      } else {
        // 沒有密碼，進入首次設定密碼模式
        setAdminStatus('signup');
      }
    } catch (err) {
      console.error('Failed to read admin password config:', err);
      // fallback to signup if fail
      setAdminStatus('signup');
    }
  };

  // 提交驗證密碼
  const handleVerifyPassword = async () => {
    try {
      const docRef = doc(db, 'system', 'admin_config');
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().password === adminPasswordInput) {
        setAdminStatus('unlocked');
        loadAdminRecords();
      } else {
        alert('密碼錯誤！');
      }
    } catch (err) {
      console.error('Password verification error:', err);
    }
  };

  // 提交設定全新密碼
  const handleSetupPassword = async () => {
    if (!adminSetupPass) {
      alert('密碼不能為空');
      return;
    }
    if (adminSetupPass !== adminSetupPassConfirm) {
      alert('兩次輸入的密碼不一致');
      return;
    }
    try {
      const docRef = doc(db, 'system', 'admin_config');
      await setDoc(docRef, { password: adminSetupPass });
      setAdminStatus('unlocked');
      loadAdminRecords();
    } catch (err) {
      console.error('Failed to set admin password:', err);
      alert('密碼設定失敗，請確認 Firebase 設定。');
    }
  };

  // 載入管理後台記錄清單
  const loadAdminRecords = async () => {
    setLoadingAdmin(true);
    try {
      const col = collection(db, 'records');
      const snap = await getDocs(col);
      const data: GameRecordDoc[] = [];
      snap.forEach((d) => {
        data.push({ id: d.id, ...d.data() } as GameRecordDoc);
      });
      // 排序以開始時間降序
      const sorted = data.sort((a, b) => b.startTime.localeCompare(a.startTime));
      setAdminRecords(sorted);
    } catch (err) {
      console.error('Failed to load admin records:', err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  // 後台：刪除記錄
  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('確定要刪除這筆遊玩紀錄嗎？此動作無法復原。')) return;
    try {
      await deleteDoc(doc(db, 'records', id));
      setAdminRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Delete record failed:', err);
    }
  };

  // 後台：開啟修改彈窗
  const startEditRecord = (record: GameRecordDoc) => {
    setEditingRecord(record);
    setEditUsername(record.username);
    setEditCorrectCount(record.correctCount);
    setEditTotalDiscovered(record.totalDiscovered);
  };

  // 後台：儲存修改記錄
  const handleSaveEditRecord = async () => {
    if (!editingRecord || !editingRecord.id) return;
    if (!editUsername.trim()) {
      alert('姓名不能填空！');
      return;
    }
    if (editCorrectCount > editTotalDiscovered) {
      alert('成功辨識數量不能大於總辨識數量！');
      return;
    }

    const incorrect = Math.max(0, editTotalDiscovered - editCorrectCount);
    const accuracy = editTotalDiscovered > 0 ? parseFloat(((editCorrectCount / editTotalDiscovered) * 100).toFixed(1)) : 0.0;

    const updateData = {
      username: editUsername,
      correctCount: editCorrectCount,
      totalDiscovered: editTotalDiscovered,
      incorrectCount: incorrect,
      accuracy: accuracy
    };

    try {
      const docRef = doc(db, 'records', editingRecord.id);
      await updateDoc(docRef, updateData);
      
      // 更新 local state
      setAdminRecords(prev => prev.map(rec => {
        if (rec.id === editingRecord.id) {
          return { ...rec, ...updateData };
        }
        return rec;
      }));
      setEditingRecord(null);
    } catch (err) {
      console.error('Update record failed:', err);
      alert('修改失敗！');
    }
  };

  // 後台：匯出全部記錄至 CV 記憶體 (Clipboard)
  const exportToClipboard = () => {
    try {
      // 輸出 JSON 格式易讀好轉
      const text = JSON.stringify(adminRecords, null, 2);
      navigator.clipboard.writeText(text);
      alert('已成功將全部記錄(JSON格式)匯出並複製到 CV 記憶體(剪貼簿)！');
    } catch (err) {
      console.error('Failed to write to clipboard:', err);
      alert('複製到剪貼簿失敗，可能浏览器不支援或需要適配權限。');
    }
  };

  // 後台：匯出全部記錄至 CVS 檔 (CSV)
  const exportToCSV = () => {
    try {
      // 表頭
      const headers = ['記錄ID', '使用者名稱', '開始時間', '總辨識數量', '成功辨識數量', '錯誤辨識數量', '正確率(%)', '遊玩總時間(秒)'];
      const rows = adminRecords.map(r => [
        r.id || '',
        r.username,
        r.startTime,
        r.totalDiscovered,
        r.correctCount,
        r.incorrectCount,
        r.accuracy,
        r.durationSeconds
      ]);

      const csvContent = [
        '\uFEFF' + headers.join(','), // 加入 BOM 防止 Excel 開啟亂碼
        ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `game_records_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('匯出 CSV 檔案失敗！');
    }
  };

  // --- 【全 3D 粒子渲染引擎】Game Loop ---
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing' || inspectingStone || appraisalResult || isAnalyzing || showLeaderboard || showAdminPanel) {
      requestRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const player = playerRef.current;
    const joy = joystickValueRef.current;

    const moveX = joy.y * (-Math.sin(player.yaw)) + joy.x * Math.cos(player.yaw);
    const moveZ = joy.y * Math.cos(player.yaw) + joy.x * Math.sin(player.yaw);
    player.x += moveX * PLAYER_SPEED;
    player.z += moveZ * PLAYER_SPEED;

    // 觸發走路音效
    if (Math.abs(joy.x) > 0 || Math.abs(joy.y) > 0) {
      const now = Date.now();
      if (now - lastStepTimeRef.current > 350) { // 控制腳步聲間距 (350毫秒)
         SoundEngine.playStep();
         lastStepTimeRef.current = now;
      }
    }

    const centerY = windowSize.height / 2;
    const centerX = windowSize.width / 2;
    const BASE_CROSSHAIR_RADIUS = 60; 
    const cosYaw = Math.cos(-player.yaw);
    const sinYaw = Math.sin(-player.yaw);
    const cosPitch = Math.cos(player.pitch);
    const sinPitch = Math.sin(player.pitch);

    // 【地平線聯動】
    const horizonY = centerY + FOCAL_LENGTH * Math.tan(player.pitch);
    if (bgSkyRef.current) bgSkyRef.current.style.height = `${horizonY}px`;
    if (bgGroundRef.current) bgGroundRef.current.style.top = `${horizonY}px`;

    // 【太陽與海浪】
    let yawNorm = player.yaw % (Math.PI * 2);
    if (yawNorm > Math.PI) yawNorm -= Math.PI * 2;
    if (yawNorm < -Math.PI) yawNorm += Math.PI * 2;
    const sunX = (windowSize.width / 2) - (yawNorm / (Math.PI / 2)) * (windowSize.width / 2);
    if (sunRef.current) sunRef.current.style.left = `${sunX}px`;
    if (oceanRef.current) oceanRef.current.style.backgroundPosition = `0px ${Date.now() / 50}px`;

    let closestTarget = null;
    let minDistance = Infinity;

    // 共用的渲染邏輯函數 (適用於兩種石頭)
    const processStoneArray = (stoneArray: any[], domRefsArray: React.MutableRefObject<(HTMLDivElement | null)[]>, isInteractive: boolean) => {
      stoneArray.forEach((stone, index) => {
        let dx = stone.x - player.x;
        let dz = stone.z - player.z;
        
        // 離開視線太遠就重置到前方
        if (dx * dx + dz * dz > SPAWN_RADIUS * SPAWN_RADIUS) {
            const spawnAngle = Math.random() * Math.PI * 2;
            stone.x = player.x + Math.cos(spawnAngle) * (SPAWN_RADIUS * 0.9);
            stone.z = player.z + Math.sin(spawnAngle) * (SPAWN_RADIUS * 0.9);
            dx = stone.x - player.x;
            dz = stone.z - player.z;
        }

        const dy = -CAMERA_HEIGHT; 
        const rotX = dx * cosYaw - dz * sinYaw;
        const rotZ_temp = dx * sinYaw + dz * cosYaw;
        const rotY = dy * cosPitch - rotZ_temp * sinPitch;
        const rotZ = dy * sinPitch + rotZ_temp * cosPitch;

        const dom = domRefsArray.current[index];
        if (!dom) return;

        if (rotZ > 20 && rotZ < SPAWN_RADIUS) { 
          const scale = FOCAL_LENGTH / rotZ;
          const screenX = centerX + rotX * scale;
          const screenY = centerY - rotY * scale; 
          
          if (screenX > -100 && screenX < windowSize.width + 100 && screenY > -100 && screenY < windowSize.height + 100) {
              
              let finalScale = scale * stone.baseScale;
              let isTargeted = false;

              // 只有互動石頭需要準星判定
              if (isInteractive) {
                const distToCrosshair = Math.sqrt(Math.pow(screenX - centerX, 2) + Math.pow(screenY - centerY, 2));
                const isCurrentlyTargeted = targetedStoneRef.current && targetedStoneRef.current.id === stone.id;
                const dynamicRadius = isCurrentlyTargeted ? BASE_CROSSHAIR_RADIUS * 1.5 : BASE_CROSSHAIR_RADIUS;
                
                if (distToCrosshair < dynamicRadius && rotZ < minDistance) {
                    minDistance = rotZ;
                    closestTarget = stone;
                }
                isTargeted = closestTarget?.id === stone.id;
                if (isTargeted) finalScale = finalScale * 1.2;
              }
              
              dom.style.visibility = 'visible';
              dom.style.transform = `translate3d(${screenX - 17.5}px, ${screenY - 12.25}px, 0) scale(${finalScale}) rotate(${stone.rotation}deg)`;
              
              const zBase = Math.max(1, Math.min(999, Math.floor(1000 - rotZ)));
              dom.style.zIndex = isTargeted ? '1000' : String(isInteractive ? zBase + 5 : zBase);
              
              if (isInteractive) {
                if (isTargeted) dom.classList.add('ring-4', 'ring-orange-400', 'shadow-[0_0_20px_rgba(249,115,22,0.9)]');
                else dom.classList.remove('ring-4', 'ring-orange-400', 'shadow-[0_0_20px_rgba(249,115,22,0.9)]');
              }
              return;
          }
        }
        dom.style.visibility = 'hidden';
      });
    };

    processStoneArray(sceneryStonesRef.current, sceneryDOMRefs, false);
    processStoneArray(stonesRef.current, stoneDOMRefs, true);

    if (targetedStoneRef.current?.id !== closestTarget?.id) {
      targetedStoneRef.current = closestTarget;
      setTargetedStone(closestTarget); 
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, inspectingStone, appraisalResult, windowSize, showLeaderboard, showAdminPanel]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameLoop]);

  // --- 控制項 ---
  const onCameraPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || inspectingStone || appraisalResult || isAnalyzing) return;
    dragRef.current = { isDragging: true, pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onCameraPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || !dragRef.current.isDragging || dragRef.current.pointerId !== e.pointerId) return;
    if (inspectingStone || appraisalResult || isAnalyzing) return;
    const deltaX = e.clientX - dragRef.current.lastX;
    const deltaY = e.clientY - dragRef.current.lastY;
    playerRef.current.yaw -= deltaX * DRAG_SENSITIVITY;
    playerRef.current.pitch -= deltaY * DRAG_SENSITIVITY;
    playerRef.current.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, playerRef.current.pitch));
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
  };
  const onCameraPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId === e.pointerId) {
      dragRef.current.isDragging = false;
      dragRef.current.pointerId = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation(); 
    if (gameState !== 'playing') return;
    e.currentTarget.setPointerCapture(e.pointerId); 
    joystickPointerRef.current = e.pointerId;
    joystickStartRef.current = { x: e.clientX, y: e.clientY };
    setJoystickUI({ x: 0, y: 0, active: true });
    joystickValueRef.current = { x: 0, y: 0 };
  };
  const onJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joystickPointerRef.current !== e.pointerId) return;
    const deltaX = e.clientX - joystickStartRef.current.x;
    const deltaY = e.clientY - joystickStartRef.current.y;
    const maxRadius = 40; 
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    let normalizedX = deltaX;
    let normalizedY = deltaY;
    if (distance > maxRadius) {
        const ratio = maxRadius / distance;
        normalizedX *= ratio;
        normalizedY *= ratio;
    }
    setJoystickUI({ x: normalizedX, y: normalizedY, active: true });
    joystickValueRef.current = { x: normalizedX / maxRadius, y: -normalizedY / maxRadius };
  };
  const onJoystickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joystickPointerRef.current === e.pointerId) {
      setJoystickUI({ x: 0, y: 0, active: false });
      joystickValueRef.current = { x: 0, y: 0 };
      e.currentTarget.releasePointerCapture(e.pointerId);
      joystickPointerRef.current = null;
    }
  };

  const handleInspect = () => {
    const target = targetedStoneRef.current;
    if (target) {
      SoundEngine.playAnalyze();
      
      setJoystickUI({ x: 0, y: 0, active: false });
      joystickValueRef.current = { x: 0, y: 0 };
      dragRef.current.isDragging = false;

      setIsAnalyzing(true);
      setAnalyzeProgress(0);

      const startTime = Date.now();
      const duration = 1000;

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / duration) * 100);
        setAnalyzeProgress(progress);

        if (elapsed < duration) {
          requestAnimationFrame(updateProgress);
        } else {
          setIsAnalyzing(false);
          setTimeout(() => SoundEngine.playPopup(), 100); 
          
          const randomClue = target.data.clues[Math.floor(Math.random() * target.data.clues.length)];
          const shuffledOptions = [...target.data.options].sort(() => 0.5 - Math.random());

          setInspectingStone({
            ...target,
            currentClue: randomClue,
            currentOptions: shuffledOptions
          });
        }
      };
      requestAnimationFrame(updateProgress);
    }
  };

  const handleGuess = async (selectedName: string) => {
    const isCorrect = selectedName === inspectingStone.data.name;
    
    if (isCorrect) SoundEngine.playCorrect();
    else SoundEngine.playWrong();

    setAppraisalResult({
      isCorrect,
      stoneData: inspectingStone.data,
      msg: isCorrect ? inspectingStone.data.explanation : inspectingStone.data.wrong_explanation
    });

    const nextTotal = totalDiscovered + 1;
    const nextScore = isCorrect ? score + 1 : score;

    setTotalDiscovered(nextTotal);

    if (isCorrect) {
      setScore(nextScore);
      setInventory(prev => ({ ...prev, [inspectingStone.data.id]: (prev[inspectingStone.data.id] || 0) + 1 }));
    }

    // 當辨識完成時，立即觸發即時資料同步 
    saveOrUpdateRecord(false, nextScore, nextTotal, durationSec);

    const stoneToRespawn = stonesRef.current.find(s => s.id === inspectingStone.id);
    if (stoneToRespawn) {
       const spawnAngle = Math.random() * Math.PI * 2;
       stoneToRespawn.x = playerRef.current.x + Math.cos(spawnAngle) * SPAWN_RADIUS;
       stoneToRespawn.z = playerRef.current.z + Math.sin(spawnAngle) * SPAWN_RADIUS;
       stoneToRespawn.data = getRandomStoneData(); 
    }
    
    targetedStoneRef.current = null;
    setTargetedStone(null);
  };

  const closeResult = () => {
    setInspectingStone(null);
    setAppraisalResult(null);
  };

  // --- UI 渲染區 (雙物件池分離渲染) ---
  const sceneryStonesUI = useMemo(() => {
    if (gameState === 'start') return null;
    return sceneryStonesRef.current.map((stone, index) => (
      <div 
        key={stone.id}
        ref={el => sceneryDOMRefs.current[index] = el}
        className={`absolute top-0 left-0 will-change-transform shadow-[0_4px_6px_rgba(0,0,0,0.5)] ${stone.colorClass}`}
        style={{ 
          width: '35px', height: '24.5px', borderRadius: stone.shape,
          visibility: 'hidden', transformOrigin: 'center center'
        }}
      >
        <div className="absolute top-0 left-1/4 w-1/2 h-1/3 bg-white/10 rounded-full blur-[1px]"></div>
      </div>
    ));
  }, [gameState]);

  const stonesUI = useMemo(() => {
    if (gameState === 'start') return null;
    return stonesRef.current.map((stone, index) => (
      <div 
        key={stone.id}
        ref={el => stoneDOMRefs.current[index] = el}
        className="absolute top-0 left-0 will-change-transform shadow-[0_5px_10px_rgba(0,0,0,0.7)]"
        style={{ 
          width: '35px', height: '24.5px', borderRadius: stone.shape,
          visibility: 'hidden', transformOrigin: 'center center'
        }}
      >
        <div className="w-full h-full overflow-hidden" style={{ borderRadius: 'inherit' }}>
           {renderStoneVisuals(stone.data.id)}
        </div>
      </div>
    ));
  }, [gameState]);

  // --- Hotbar 物品列 ---
  const InventoryHotbar = () => {
    const collectedItems = Object.entries(inventory).filter(([_, count]) => (count as number) > 0);
    const totalSlots = Math.max(5, Math.min(9, collectedItems.length + 1));
    const slots = Array.from({ length: totalSlots });

    return (
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-slate-900/60 p-1.5 rounded-lg border-2 border-slate-700/50 backdrop-blur-md z-[2000] pointer-events-none shadow-[0_0_15px_rgba(0,0,0,0.8)]">
        {slots.map((_, index) => {
          const item = collectedItems[index];
          let stoneInfo = null;
          if (item) {
            stoneInfo = STONE_DATA.find(s => s.id === item[0]);
          }

          return (
            <div 
              key={`slot_${index}`} 
              className={`w-10 h-10 sm:w-12 sm:h-12 border-2 ${item ? 'border-slate-500 bg-slate-800/80 shadow-inner pointer-events-auto' : 'border-slate-800/80 bg-slate-900/40'} rounded flex items-center justify-center relative`}
            >
              {item && stoneInfo && (
                <>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center group pointer-events-auto">
                    <div className="w-[80%] h-[70%] overflow-hidden shadow-md" style={{ borderRadius: '35% 35% 35% 35% / 35% 35% 35% 35%' }}>
                      {renderStoneVisuals(stoneInfo.id)}
                    </div>
                    <div className="absolute -top-8 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700 pointer-events-none">
                      {stoneInfo.name}
                    </div>
                  </div>
                  <span className="absolute bottom-0 right-0 text-[10px] sm:text-xs font-bold text-white drop-shadow-[1px_1px_1px_rgba(0,0,0,1)] pr-0.5 pb-0.5 font-mono pointer-events-none">
                    {item[1]}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-stone-900 via-slate-800 to-zinc-900 flex flex-col font-sans touch-none select-none overflow-hidden text-stone-100 relative">
      {/* Decorative Blur Lights */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-50px] right-[-50px] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none z-0"></div>

      {/* 網頁左上角：排行榜按鈕與管理按鈕 */}
      <div className="absolute top-4 left-4 z-[2500] flex gap-2">
        <button
          onClick={() => {
            setShowLeaderboard(true);
            loadLeaderboardData();
          }}
          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all active:scale-95 text-stone-100 cursor-pointer shadow-lg shadow-black/10 backdrop-blur-md"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>排行榜 (Ranking)</span>
        </button>
        <button
          onClick={openAdminPanel}
          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all active:scale-95 text-stone-100 cursor-pointer shadow-lg shadow-black/10 backdrop-blur-md"
        >
          <Key className="w-4 h-4 text-sky-400" />
          <span>管理後台 (Admin)</span>
        </button>
      </div>

      {/* HUD 右上角 - 探勘統計面板 */}
      {gameState === 'playing' && (
        <header className="absolute top-4 right-4 z-[2000] pointer-events-none">
          <div className="bg-white/10 backdrop-blur-xl text-stone-100 p-4 rounded-3xl border border-white/20 shadow-2xl min-w-[160px] sm:min-w-[190px] flex flex-col gap-3 pointer-events-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold tracking-widest text-stone-200">探勘統計小視窗</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 my-1">
              <div className="p-2 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5">總辨識</div>
                <div className="text-sm font-mono text-stone-100">{totalDiscovered}</div>
              </div>
              <div className="p-2 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5">正確</div>
                <div className="text-sm font-mono text-emerald-400">{score}</div>
              </div>
              <div className="p-2 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5">錯誤</div>
                <div className="text-sm font-mono text-rose-400">{Math.max(0, totalDiscovered - score)}</div>
              </div>
              <div className="p-2 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5">正確率</div>
                <div className="text-sm font-mono text-amber-300">
                  {totalDiscovered > 0 ? ((score / totalDiscovered) * 100).toFixed(1) : "0.0"}%
                </div>
              </div>
            </div>

            <div className="p-3 bg-stone-900/40 rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-stone-400 uppercase tracking-wider">遊玩總時間</div>
                <div className="text-xs font-mono tracking-tighter text-stone-200">
                  {Math.floor(durationSec / 3600).toString().padStart(2, '0')}h : {Math.floor((durationSec % 3600) / 60).toString().padStart(2, '0')}m : {(durationSec % 60).toString().padStart(2, '0')}s
                </div>
              </div>
              <div className="text-emerald-500 opacity-50">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            {/* 新增離開遊戲按鈕 */}
            <button
              onClick={leaveGame}
              className="w-full py-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              離開遊戲
            </button>
            <p className="text-[10px] text-center text-stone-500">數據將自動同步至 Firebase</p>
          </div>
        </header>
      )}

      {/* 3D 遊戲視窗 (相機轉移、拖曳操作) */}
      <main 
        className="relative flex-1 overflow-hidden"
        onPointerDown={onCameraPointerDown}
        onPointerMove={onCameraPointerMove}
        onPointerUp={onCameraPointerUp}
        onPointerCancel={onCameraPointerUp}
      >
        {/* === 天空與海洋區 === */}
        <div 
          ref={bgSkyRef} 
          className="absolute top-0 left-0 w-full overflow-hidden bg-gradient-to-b from-indigo-950 via-sky-800 to-orange-400 will-change-transform"
          style={{ height: '50vh' }} 
        >
            <div ref={sunRef} className="absolute bottom-10 w-28 h-28 bg-yellow-100 rounded-full blur-[6px] shadow-[0_0_80px_rgba(251,146,60,1)] -translate-x-1/2 will-change-transform"></div>
            
            <div className="absolute bottom-0 left-0 w-full h-[15vh] bg-gradient-to-b from-transparent to-sky-900 border-b-2 border-orange-400/60 z-10">
                <div ref={oceanRef} className="absolute inset-0 opacity-40 mix-blend-overlay will-change-transform" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.6) 3px, transparent 6px)' }}></div>
            </div>
        </div>

        {/* === 無盡礫灘地板區 === */}
        <div 
          ref={bgGroundRef} 
          className="absolute left-0 w-full overflow-hidden bg-gradient-to-b from-[#1c1917] to-[#292524] will-change-transform"
          style={{ top: '50vh', bottom: 0 }}
        ></div>

        {/* 實體鋪設與背景渲染 */}
        {sceneryStonesUI}
        {stonesUI}

        {/* 準星定位器 */}
        {gameState === 'playing' && (
          <div 
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2000] flex flex-col items-center justify-center transition-transform ${targetedStone ? 'scale-110 pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              handleInspect();
            }}
          >
            <div className="relative flex items-center justify-center">
               <div className={`absolute w-16 h-16 rounded-full border-2 transition-all duration-200 ${targetedStone ? 'border-orange-400 border-dashed animate-spin-slow bg-orange-400/10' : 'border-white/40 shadow-[0_0_5px_rgba(0,0,0,0.5)]'}`}></div>
               <Crosshair className={`w-6 h-6 transition-colors duration-200 drop-shadow-md ${targetedStone ? 'text-orange-400' : 'text-white'}`} />
            </div>
            {targetedStone && (
              <span className="mt-8 bg-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-orange-500/40 animate-pulse tracking-widest">
                點擊分析
              </span>
            )}
          </div>
        )}

        {/* 搖桿與手振操作 */}
        {gameState === 'playing' && (
          <div className="absolute bottom-16 sm:bottom-20 w-full px-8 flex justify-between items-end z-[2000] pointer-events-none">
            <div 
              className="w-32 h-32 sm:w-36 sm:h-36 bg-slate-800/40 border-2 border-white/20 rounded-full backdrop-blur-md flex items-center justify-center relative pointer-events-auto shadow-lg"
              onPointerDown={onJoystickPointerDown}
              onPointerMove={onJoystickPointerMove}
              onPointerUp={onJoystickPointerUp}
              onPointerCancel={onJoystickPointerUp}
            >
              <div 
                className="w-14 h-14 bg-white/20 rounded-full border border-white/30 shadow-2xl transition-opacity duration-150"
                style={{ 
                  transform: `translate(${joystickUI.x}px, ${joystickUI.y}px)`,
                  willChange: 'transform',
                  opacity: joystickUI.active ? 1 : 0.6
                }}
              />
            </div>

            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                handleInspect();
              }}
              disabled={!targetedStone}
              className={`pointer-events-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center font-bold text-base sm:text-lg shadow-xl transition-all duration-200 mb-2 ${
                targetedStone 
                ? 'bg-amber-500/25 hover:bg-amber-500/35 border border-amber-500/40 text-amber-200 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.25)] animate-pulse cursor-pointer' 
                : 'bg-white/5 text-stone-500 border border-white/10 backdrop-blur-md cursor-default shadow-black/10'
              }`}
            >
              <Search className="w-6 h-6 sm:w-8 sm:h-8 mb-1" />
              分析
            </button>
          </div>
        )}

        {/* 背包列表 */}
        {gameState === 'playing' && (
          <InventoryHotbar />
        )}

        {/* --- UI 蓋板區（遊戲開始） --- */}
        {gameState === 'start' && (
          <div 
            className="absolute inset-0 bg-stone-950/40 flex flex-col items-center justify-center p-6 z-[3000] backdrop-blur-xl pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()} 
          >
            <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[32px] shadow-2xl max-w-sm w-full text-center border border-white/20 relative overflow-hidden">
              <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-amber-500/20 rounded-full blur-2xl"></div>
              <div className="absolute bottom-[-50px] right-[-50px] w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
              <Sunrise className="w-16 h-16 text-amber-400 mx-auto mb-4 relative z-10 animate-pulse" />
              <h2 className="text-3xl font-extrabold text-stone-100 mb-1 tracking-wide relative z-10">東海岸尋寶</h2>
              <p className="text-amber-300 font-medium text-xs mb-6 tracking-widest relative z-10 uppercase">特色石種辨識虛實互動軟體</p>
              
              {/* 使用者名稱輸入框 */}
              <div className="text-left mb-6 relative z-10">
                <label className="block text-xs text-stone-300 font-bold tracking-wider mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  請輸入探勘玩家姓名
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="地質旅人 (未填則預設代稱)"
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl text-sm font-semibold text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-505 tracking-wide shadow-inner placeholder-stone-500 animate-fade-in"
                />
              </div>

              <div className="text-left text-xs text-stone-300 mb-6 space-y-4 bg-stone-950/40 p-4 rounded-2xl border border-white/5 relative z-10">
                <p className="leading-relaxed text-justify">
                  漫步東海岸 3D 虛擬礫灘，當準星對準特殊玉石與特色石種時，點擊並透過描述線索，辨別正確名稱。
                </p>
              </div>

              <button 
                onClick={initGame}
                className="bg-amber-500/25 hover:bg-amber-500/35 border border-amber-500/40 text-amber-200 px-8 py-4 rounded-2xl font-black w-full text-lg shadow-[0_0_20px_rgba(245,158,11,0.2)] active:scale-95 transition-all relative z-10 cursor-pointer"
              >
                開始探勘
              </button>
            </div>
          </div>
        )}

        {/* 系統分析中進度條 */}
        {isAnalyzing && (
          <div 
            className="absolute inset-0 bg-stone-950/40 flex flex-col items-center justify-center z-[3000] p-4 backdrop-blur-xl pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()} 
          >
            <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[32px] shadow-2xl border border-white/20 max-w-xs w-full flex flex-col items-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <Search className="w-16 h-16 text-amber-400 relative z-10 animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-stone-100 tracking-widest mb-6">系統分析中</h3>
              
              <div className="w-full h-3 bg-stone-950/50 rounded-full overflow-hidden border border-white/10 shadow-inner relative">
                <div 
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]"
                  style={{ width: `${analyzeProgress}%` }}
                ></div>
              </div>
              <p className="text-amber-405 text-xs mt-3 font-mono">{Math.floor(analyzeProgress)}%</p>
            </div>
          </div>
        )}

        {/* 觀察與鑑定彈窗 */}
        {inspectingStone && !appraisalResult && (
          <div 
            className="absolute inset-0 bg-stone-950/40 flex flex-col items-center justify-center z-[3000] p-4 backdrop-blur-xl pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()} 
          >
            <div className="bg-white/10 backdrop-blur-2xl rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-white/10">
              <div className="bg-white/5 text-stone-100 p-5 flex gap-2 items-center justify-center relative border-b border-white/10">
                <Search className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-lg tracking-widest">實物觀察</h3>
                <button onClick={() => setInspectingStone(null)} className="absolute right-5 text-stone-500 hover:text-white text-2xl">✕</button>
              </div>
              <div className="p-6">
                
                <div className="flex justify-center mb-6 relative">
                  <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl"></div>
                  <img 
                    src={inspectingStone.data.image} 
                    alt="鑑定物件真實圖像" 
                    className="w-40 h-40 sm:w-48 sm:h-48 object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)] relative z-10" 
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="bg-stone-950/40 p-5 rounded-2xl mb-6 border border-white/5 shadow-inner min-h-[140px] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 pointer-events-none blur-sm">
                    {renderStoneVisuals(inspectingStone.data.id)}
                  </div>
                  <p className="text-stone-100 text-sm font-medium leading-relaxed relative z-10 text-left">
                    「{inspectingStone.currentClue}」
                  </p>
                </div>
                
                <h4 className="text-center text-xs text-stone-400 mb-3 tracking-widest">請選擇玉石種類</h4>
                <div className="grid grid-cols-2 gap-3">
                  {inspectingStone.currentOptions.map((optName: string) => (
                    <button 
                      key={optName}
                      onClick={() => handleGuess(optName)} 
                      className="bg-white/5 hover:bg-white/10 text-stone-200 font-bold py-3 px-2 rounded-xl border border-white/10 transition-colors active:scale-95 flex items-center justify-center text-sm shadow-md cursor-pointer"
                    >
                      <span>{optName}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 鑑定結果 */}
        {appraisalResult && (
          <div 
            className="absolute inset-0 bg-stone-950/40 flex flex-col items-center justify-center z-[3000] p-4 backdrop-blur-xl pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()} 
          >
            <div className="bg-white/10 backdrop-blur-2xl rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl border border-white/10">
              {appraisalResult.isCorrect ? (
                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-emerald-500/20">
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                </div>
              ) : (
                <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-rose-500/20">
                  <XCircle className="w-12 h-12 text-rose-400" />
                </div>
              )}
              
              <h3 className={`text-3xl font-black mb-4 ${appraisalResult.isCorrect ? 'text-emerald-400' : 'text-rose-455'}`}>
                {appraisalResult.stoneData.name}
              </h3>
              
              <p className="text-stone-300 text-sm mb-8 bg-stone-950/40 p-5 rounded-2xl text-left leading-relaxed border border-white/5">
                {appraisalResult.msg}
              </p>
              
              <button onClick={closeResult} className="bg-amber-500/25 hover:bg-amber-500/35 border border-amber-500/40 text-amber-200 px-6 py-4 rounded-2xl font-bold w-full active:scale-95 transition-all text-lg shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer">
                放進背包繼續找
              </button>
            </div>
          </div>
        )}

        {/* --- 排行榜 Modal 彈窗 --- */}
        <AnimatePresence>
          {showLeaderboard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-950/60 flex items-center justify-center p-4 z-[4000] backdrop-blur-md pointer-events-auto"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white/10 backdrop-blur-2xl border border-white/20 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
              >
                {/* 標題頭部 */}
                <div className="bg-slate-800/60 p-5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-amber-400" />
                    <div>
                      <h3 className="text-lg font-black tracking-widest text-white">東海岸探勘排行榜</h3>
                      <p className="text-xs text-amber-500 font-medium">以成功辨識數量排序</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowLeaderboard(false);
                      setLeaderboardData([]);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 排行列表內容 */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  {loadingLeaderboard ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                      <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                      <p className="text-slate-400 text-xs font-mono">載入遠端精采紀錄中...</p>
                    </div>
                  ) : leaderboardData.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Compass className="w-12 h-12 mx-auto mb-2 opacity-50 text-slate-600 animate-pulse" />
                      <p className="text-sm font-semibold">目前尚無任何大師級探勘紀錄</p>
                      <p className="text-xs">趕緊進入遊戲，開啟你的特色石種收藏大業吧！</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* 表頭 */}
                      <div className="grid grid-cols-12 text-[10px] sm:text-xs font-bold text-slate-400 px-3 py-2 uppercase tracking-widest border-b border-slate-800/40">
                        <div className="col-span-2 text-center">排名</div>
                        <div className="col-span-4 pl-2">使用者名稱</div>
                        <div className="col-span-3 text-center text-emerald-400">成功辨識</div>
                        <div className="col-span-3 text-right pr-2">開始時間</div>
                      </div>

                      {/* 內容列 */}
                      {leaderboardData.map((item, idx) => {
                        const isTopThree = idx < 3;
                        const rankColors = [
                          'bg-amber-500/20 text-amber-400 border-amber-500/40 backdrop-blur-md',
                          'bg-stone-300/20 text-stone-250 border-stone-300/40 backdrop-blur-md',
                          'bg-amber-700/20 text-orange-400 border-amber-800/40 backdrop-blur-md'
                        ];

                        return (
                          <div 
                            key={item.id}
                            className={`grid grid-cols-12 items-center text-xs sm:text-sm px-3 py-3 rounded-xl border transition-all hover:bg-white/5 ${
                              isTopThree ? rankColors[idx] + ' font-bold' : 'border-white/5 text-stone-300'
                            }`}
                          >
                            <div className="col-span-2 text-center">
                              {isTopThree ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs saturate-150 shadow-inner">
                                  {idx + 1}
                                </span>
                              ) : (
                                <span className="font-mono text-stone-500">{idx + 1}</span>
                              )}
                            </div>
                            <div className="col-span-4 pl-2 truncate" title={item.username}>
                              {item.username}
                            </div>
                            <div className="col-span-3 text-center text-emerald-450 font-black font-mono">
                              {item.correctCount} / {item.totalDiscovered}
                            </div>
                            <div className="col-span-3 text-right pr-2 font-mono text-[10px] sm:text-xs text-stone-500">
                              {item.startTime.split(' ')[0]} {/* 僅顯示日期 */}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 底部按鈕 */}
                <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => {
                      setShowLeaderboard(false);
                      setLeaderboardData([]);
                    }}
                    className="bg-white/10 hover:bg-white/20 text-stone-100 border border-white/10 font-bold px-6 py-2.5 rounded-xl text-sm transition-all cursor-pointer"
                  >
                    關閉
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- 管理員後台 Modal 彈窗 --- */}
        <AnimatePresence>
          {showAdminPanel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-950/60 flex items-center justify-center p-4 z-[4000] backdrop-blur-md pointer-events-auto"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white/10 backdrop-blur-2xl border border-white/20 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              >
                {/* 管理標頭 */}
                <div className="bg-white/5 p-5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-6 h-6 text-sky-400" />
                    <div>
                      <h3 className="text-lg font-black tracking-widest text-white">東海岸尋寶 ✦ 管理後台</h3>
                      <p className="text-xs text-sky-455 font-medium">數據庫查閱、單筆刪除、手動修改及遠端數據導出</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowAdminPanel(false);
                      setAdminRecords([]);
                    }}
                    className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg text-stone-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 控制主區 */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  
                  {/* P1: 設置新密碼流程 (SIGNUP) */}
                  {adminStatus === 'signup' && (
                    <div className="max-w-md mx-auto py-12 space-y-6 animate-fade-in">
                      <div className="text-center">
                        <ShieldAlert className="w-12 h-12 text-sky-455 mx-auto mb-2 animate-bounce" />
                        <h4 className="text-lg font-black text-white tracking-widest">初始化管理員密碼</h4>
                        <p className="text-xs text-stone-400 mt-1">首次偵測。請設定一組可存取遠端 Firebase 的後台通行密碼。</p>
                      </div>

                      <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner">
                        <div>
                          <label className="block text-xs font-bold text-stone-300 mb-1.5">設置密碼</label>
                          <input
                            type="password"
                            value={adminSetupPass}
                            onChange={(e) => setAdminSetupPass(e.target.value)}
                            placeholder="輸入新管理認證密碼"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-300 mb-1.5">再次確認密碼</label>
                          <input
                            type="password"
                            value={adminSetupPassConfirm}
                            onChange={(e) => setAdminSetupPassConfirm(e.target.value)}
                            placeholder="重複輸入密碼"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleSetupPassword}
                        className="w-full bg-sky-500/20 hover:bg-sky-500/35 border border-sky-500/40 text-sky-200 font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95 text-sm cursor-pointer"
                      >
                        啟用管理者身分
                      </button>
                    </div>
                  )}

                  {/* P2: 輸入舊密碼流程 (LOCKED) */}
                  {adminStatus === 'locked' && (
                    <div className="max-w-md mx-auto py-12 space-y-6 animate-fade-in">
                      <div className="text-center">
                        <Key className="w-12 h-12 text-sky-400 mx-auto mb-2 animate-bounce" />
                        <h4 className="text-lg font-black text-white tracking-widest">管理員身分解鎖</h4>
                        <p className="text-xs text-stone-400 mt-1">請輸入當初設定的管理密碼，方可授權修改遠端資料集。</p>
                      </div>

                      <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner">
                        <label className="block text-xs font-bold text-stone-300 mb-2">後台管理密碼</label>
                        <input
                          type="password"
                          value={adminPasswordInput}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleVerifyPassword();
                          }}
                          onChange={(e) => setAdminPasswordInput(e.target.value)}
                          placeholder="請輸入解鎖密鑰"
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      <button
                        onClick={handleVerifyPassword}
                        className="w-full bg-sky-500/20 hover:bg-sky-500/35 border border-sky-500/40 text-sky-200 font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95 text-sm cursor-pointer"
                      >
                        送出解鎖
                      </button>
                    </div>
                  )}

                  {/* P3: 解鎖後，顯示所有遊玩記錄 (UNLOCKED) */}
                  {adminStatus === 'unlocked' && (
                    <div className="space-y-4 animate-fade-in">
                      {/* 功能操控列：匯出與重載 */}
                      <div className="flex flex-col sm:flex-row gap-2 justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="text-left">
                          <span className="text-xs font-bold text-stone-400">系統統計共計</span>
                          <span className="text-base font-black text-sky-400 mx-1 font-mono">{adminRecords.length}</span>
                          <span className="text-xs font-bold text-stone-400">筆遊玩歷史登錄</span>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          <button
                            onClick={exportToClipboard}
                            className="flex-1 sm:flex-initial bg-white/10 hover:bg-white/20 text-stone-200 border border-white/15-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-sky-400" />
                            <span>匯出文字 (Buffer)</span>
                          </button>
                          <button
                            onClick={exportToCSV}
                            className="flex-1 sm:flex-initial bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-350 border border-emerald-500/30 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-400" />
                            <span>匯出 CSV 檔案</span>
                          </button>
                          <button
                            onClick={loadAdminRecords}
                            className="bg-white/10 hover:bg-white/20 text-sky-400 font-bold p-2 border border-white/10 rounded-xl transition-transform active:rotate-180 duration-300 cursor-pointer flex items-center justify-center"
                            title="重新整理數據"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* 資料表 */}
                      {loadingAdmin ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                          <RefreshCw className="w-8 h-8 text-sky-455 animate-spin" />
                          <p className="text-stone-400 text-xs font-mono">後台數據拉取中...</p>
                        </div>
                      ) : adminRecords.length === 0 ? (
                        <div className="text-center py-16 text-stone-500">
                          <p className="text-sm font-semibold">目前無任何遊戲數據留存紀錄</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-white/10">
                          <table className="w-full text-left text-xs sm:text-sm border-collapse">
                            <thead>
                              <tr className="bg-white/5 text-stone-300 font-bold tracking-wider capitalize border-b border-white/10">
                                <th className="p-3 text-center w-12">排序</th>
                                <th className="p-3">姓名</th>
                                <th className="p-3">開始時間</th>
                                <th className="p-3 text-center">總辨識量</th>
                                <th className="p-3 text-center text-emerald-400">成功辨識</th>
                                <th className="p-3 text-center text-rose-400">錯誤辨識</th>
                                <th className="p-3 text-center">正確率</th>
                                <th className="p-3 text-center">時間(秒)</th>
                                <th className="p-3 text-center w-24">操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {adminRecords.map((r, itemIdx) => (
                                <tr key={r.id} className="hover:bg-white/5 text-stone-300 animate-fade-in">
                                  <td className="p-3 text-center font-mono text-stone-500">{itemIdx + 1}</td>
                                  <td className="p-3 font-bold truncate max-w-[120px]" title={r.username}>
                                    {r.username}
                                  </td>
                                  <td className="p-3 font-mono text-[11px] text-stone-500">{r.startTime}</td>
                                  <td className="p-3 text-center font-mono">{r.totalDiscovered}</td>
                                  <td className="p-3 text-center font-mono text-emerald-400 font-bold">{r.correctCount}</td>
                                  <td className="p-3 text-center font-mono text-rose-400">{r.incorrectCount}</td>
                                  <td className="p-3 text-center font-mono font-bold text-amber-500">{r.accuracy}%</td>
                                  <td className="p-3 text-center font-mono">{r.durationSeconds}</td>
                                  <td className="p-3 text-center">
                                    <div className="flex gap-1 justify-center">
                                      {/* 修改資料按鈕 */}
                                      <button
                                        onClick={() => startEditRecord(r)}
                                        className="p-1 px-2 bg-white/5 hover:bg-white/10 hover:text-sky-400 border border-white/10 rounded text-stone-400 flex items-center justify-center transition-colors cursor-pointer"
                                        title="修改"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      {/* 刪除資料按鈕 */}
                                      <button
                                        onClick={() => handleDeleteRecord(r.id!)}
                                        className="p-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:text-rose-300 rounded text-rose-450 flex items-center justify-center transition-colors cursor-pointer"
                                        title="刪除"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* 後台底部 */}
                <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => {
                      setShowAdminPanel(false);
                      setAdminRecords([]);
                    }}
                    className="bg-white/10 hover:bg-white/20 text-stone-100 border border-white/10 font-bold px-6 py-2.5 rounded-xl text-sm transition-all cursor-pointer"
                  >
                    關閉
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- 修改資料彈窗 --- */}
        <AnimatePresence>
          {editingRecord && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-950/40 flex items-center justify-center p-4 z-[5000] backdrop-blur-md pointer-events-auto"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative">
                <button
                  onClick={() => setEditingRecord(null)}
                  className="absolute right-5 top-5 text-stone-500 hover:text-white transition-colors text-xl"
                >
                  ✕
                </button>
                <div className="text-center mb-6">
                  <Edit className="w-10 h-10 text-sky-400 mx-auto mb-2" />
                  <h4 className="text-lg font-black tracking-widest text-white">修改遊玩數據資料</h4>
                  <p className="text-xs text-stone-400 mt-1">針對指定玩家紀錄修正不當或作弊數據</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">玩家名稱</label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-300 mb-1">成功辨識量</label>
                      <input
                        type="number"
                        min={0}
                        value={editCorrectCount}
                        onChange={(e) => setEditCorrectCount(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm font-mono text-emerald-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-350 mb-1">總辨識(發現)量</label>
                      <input
                        type="number"
                        min={0}
                        value={editTotalDiscovered}
                        onChange={(e) => setEditTotalDiscovered(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-2">
                  <button
                    onClick={() => setEditingRecord(null)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-stone-300 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm border border-white/10 transition-all cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveEditRecord}
                    className="flex-1 bg-sky-500/20 hover:bg-sky-500/35 border border-sky-500/40 text-sky-200 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-lg transition-all cursor-pointer"
                  >
                    確認儲存
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
