import { Board } from './game/Board.js';
import { BoardRenderer } from './visualizer/BoardRenderer.js';
import { GameController } from './controller/GameController.js';
import { getAIMove } from './ai/simpleAI.js';

// 预加载棋盘底图，确保首次进入对弈时已缓存
const preloadBoardBg = new Image();
preloadBoardBg.src = 'assets/images/board_bg.png';

// ========== 首页欢迎动画（单元素四阶段贝塞尔） ==========
const homePage = document.getElementById('homePage');
let animationPlayed = false;

function startHomeAnimation() {
  if (animationPlayed) return;
  animationPlayed = true;

  const wText = document.getElementById('welcomeText');
  const whiteCover = document.getElementById('whiteCover');

  // Phase ① (0s–0.5s): "欢迎来到" 5rem 居中淡入
  wText.style.fontSize = '5rem';
  void wText.offsetHeight;
  const rect = wText.getBoundingClientRect();
  const offsetY = window.innerHeight / 2 - (rect.top + rect.height / 2);
  wText.style.transform = `translateY(${offsetY}px)`;
  wText.style.opacity = '1';

  // Phase ②+③ (0.5s–2.5s)
  setTimeout(() => {
    homePage.classList.add('transition-all');
    homePage.classList.add('larger-center');
    wText.style.fontSize = '';
    wText.style.transform = '';
    homePage.classList.add('show-title');
    whiteCover.classList.add('hidden');
  }, 500);

  // Phase ④ (2.5s–3.5s): 标题归位 + 按钮淡入 + 欢迎语淡出
  setTimeout(() => {
    homePage.classList.remove('larger-center');
    // 重置内联 opacity，让 CSS 接管 → show-content 会让欢迎语淡出
    wText.style.opacity = '';
    homePage.classList.add('show-content');
  }, 2500);
}

// 启动欢迎动画
startHomeAnimation();

// ========== 页面切换与游戏初始化 ==========
let controller  = null;
let renderer    = null;
let currentMode = 'ai';
let isFocus     = false;

const gamePage     = document.getElementById('gamePage');
const rulesPage    = document.getElementById('rulesPage');
const bgLayers     = document.getElementById('bgLayers');
const homeBtn      = document.getElementById('homeBtn');
const notationTable = document.getElementById('notationTable');
const turnStoneEl   = document.getElementById('turnStone');
const turnTextA     = document.getElementById('turnTextA');
const turnTextB     = document.getElementById('turnTextB');
let   _turnFront    = turnTextA;  // 当前可见的文字元素
let   _turnBack     = turnTextB;  // 当前隐藏的文字元素

// 快捷栏按钮
const btnMenu   = document.getElementById('btnMenu');
const btnFocus  = document.getElementById('btnFocus');
const btnHint   = document.getElementById('btnHint');
const btnUndo   = document.getElementById('btnUndo');
const btnDraw   = document.getElementById('btnDraw');
const btnResign = document.getElementById('btnResign');

// 菜单
const gameMenu    = document.getElementById('gameMenu');
const menuExit    = document.getElementById('menuExit');
const menuNewGame = document.getElementById('menuNewGame');
const menuDraw    = document.getElementById('menuDraw');
const menuResign  = document.getElementById('menuResign');

const rulesBackBtn = document.getElementById('rulesBackBtn');

// 首页按钮
document.getElementById('btnAI').addEventListener('click', () => startGame('ai'));
document.getElementById('btnTwoPlayer').addEventListener('click', () => startGame('two-player'));
document.getElementById('btnRules').addEventListener('click', showRules);

function startGame(mode) {
  currentMode = mode;
  isFocus = false;
  gamePage.classList.remove('focus-mode');
  homePage.classList.remove('active');
  gamePage.classList.add('active');
  bgLayers.classList.add('game-mode');
  closeMenu();

  // 按钮可见性
  btnHint.style.display = mode === 'ai' ? '' : 'none';
  btnFocus.querySelector('.qbtn-icon').textContent = '◉';
  btnFocus.querySelector('.qbtn-label').textContent = '专注';
  btnFocus.dataset.tip = '专注';

  const board = new Board();
  const wrapper = document.getElementById('boardWrapper');
  renderer = new BoardRenderer(wrapper);
  renderer.hintPos = null;
  controller = new GameController(board, renderer, null, mode);
  controller.onUpdate = (b) => {
    updateTurnInfo(b);
    updateNotation(b);
    if (renderer) renderer.hintPos = null;
  };
  controller.start();
}

function showRules() {
  homePage.classList.remove('active');
  rulesPage.classList.add('active');
}

function goHome() {
  gamePage.classList.remove('active');
  rulesPage.classList.remove('active');
  homePage.classList.add('active');
  bgLayers.classList.remove('game-mode');
  gamePage.classList.remove('focus-mode');
  isFocus = false;
  closeMenu();
}

// ---------- 专注模式 ----------
btnFocus.addEventListener('click', () => {
  isFocus = !isFocus;
  if (isFocus) {
    gamePage.classList.add('focus-mode');
    btnFocus.querySelector('.qbtn-icon').textContent = '◎';
    btnFocus.querySelector('.qbtn-label').textContent = '退出专注';
    btnFocus.dataset.tip = '退出专注';
  } else {
    gamePage.classList.remove('focus-mode');
    btnFocus.querySelector('.qbtn-icon').textContent = '◉';
    btnFocus.querySelector('.qbtn-label').textContent = '专注';
    btnFocus.dataset.tip = '专注';
  }
  closeMenu();
  // 立即触发布局重算
  if (renderer) {
    requestAnimationFrame(() => {
      renderer.computeLayout();
      if (controller) renderer.draw(controller.board);
    });
  }
});

// ---------- 菜单 ----------
function openMenu() {
  const rect = btnMenu.getBoundingClientRect();
  const pageRect = gamePage.getBoundingClientRect();

  // 专注模式下隐藏提和/认输（它们是独立按钮）
  menuDraw.style.display = isFocus ? 'none' : '';
  menuResign.style.display = isFocus ? 'none' : '';

  // 先显示以测量尺寸
  gameMenu.classList.add('open');
  const menuW = gameMenu.offsetWidth;
  const menuH = gameMenu.offsetHeight;

  if (isFocus) {
    // 专注模式：菜单显示在快捷栏左边
    gameMenu.style.left = (rect.left - pageRect.left - menuW - 4) + 'px';
    gameMenu.style.top  = (rect.top - pageRect.top) + 'px';
  } else {
    // 非专注：菜单显示在按钮上方
    gameMenu.style.left = (rect.left - pageRect.left) + 'px';
    gameMenu.style.top  = (rect.top - pageRect.top - menuH - 4) + 'px';
  }
}
function closeMenu() {
  gameMenu.classList.remove('open');
}
btnMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  if (gameMenu.classList.contains('open')) { closeMenu(); }
  else { openMenu(); }
});
document.addEventListener('click', (e) => {
  if (!gameMenu.contains(e.target) && e.target !== btnMenu) closeMenu();
});

menuExit.addEventListener('click', () => { closeMenu(); goHome(); });
menuNewGame.addEventListener('click', () => { closeMenu(); if (controller) controller.start(); });
menuDraw.addEventListener('click', () => { closeMenu(); if (controller) controller.offerDraw(); });
menuResign.addEventListener('click', () => { closeMenu(); if (controller) controller.resign(); });

// ---------- 快捷栏操作 ----------
btnUndo.addEventListener('click', () => { if (controller) controller.undoMove(); });
btnDraw.addEventListener('click', () => { if (controller) controller.offerDraw(); });
btnResign.addEventListener('click', () => { if (controller) controller.resign(); });

btnHint.addEventListener('click', () => {
  if (!controller || !renderer || controller.board.isGameOver()) return;
  if (controller.isAIThinking) return;
  const move = getAIMove(controller.board);
  if (move) {
    renderer.hintPos = { x: move.x, y: move.y };
    renderer.draw(controller.board);
  }
});

// ---------- 执子信息（双文字交叉淡入淡出 0.2s）----------
function updateTurnInfo(board) {
  const hist = board.moveHistory;
  const cp   = board.currentPlayer;
  const over = board.isGameOver();

  let stoneClass, newText;

  if (over && board.drawAgreed) {
    stoneClass = 'turn-stone split';
    newText = '和局';
  } else if (over && board.winner) {
    stoneClass = 'turn-stone ' + (board.winner === 1 ? 'black' : 'white');
    newText = board.winner === 1 ? '黑方胜' : '白方胜';
  } else {
    stoneClass = 'turn-stone ' + (cp === 1 ? 'black' : 'white');
    if (hist.length === 0) {
      newText = '黑先行';
    } else if (hist.length === 1) {
      newText = '白后手';
    } else {
      newText = cp === 1 ? '黑行棋' : '白行棋';
    }
  }

  // 文字未变则跳过
  if (_turnFront.textContent === newText && turnStoneEl.className === stoneClass) return;

  // 棋子 CSS transition 0.2s 自动过渡
  turnStoneEl.className = stoneClass;

  // 在隐藏层写入新文字
  _turnBack.textContent = newText;
  _turnBack.classList.remove('turn-text-back');

  // 交叉淡入淡出
  _turnFront.style.opacity = '0';
  _turnBack.style.opacity = '1';

  // 交换前后角色
  const prevBack = _turnBack;
  _turnBack = _turnFront;
  _turnFront = prevBack;

  // 过渡结束后旧文字退到背面
  setTimeout(() => {
    _turnBack.classList.add('turn-text-back');
  }, 200);
}

// ---------- 记谱（CSS 圈号/胶囊：黑着实心，白着空心）----------
function badgeHTML(n, color) {
  const capsule = n >= 10 ? ' capsule' : '';
  return `<span class="move-badge ${color}${capsule}">${n}</span>`;
}

function updateNotation(board) {
  const hist = board.moveHistory;
  if (hist.length === 0) {
    notationTable.innerHTML = '<span class="notation-empty">等待落子...</span>';
    return;
  }
  let html = '';
  for (let i = 0; i < hist.length; i += 2) {
    const round = Math.floor(i / 2) + 1;
    const bn = i + 1;
    const bBadge = badgeHTML(bn, 'black');
    const black = bBadge + BoardRenderer.notation(hist[i].x, hist[i].y);
    const white = (i + 1 < hist.length)
      ? badgeHTML(bn + 1, 'white') + BoardRenderer.notation(hist[i + 1].x, hist[i + 1].y)
      : '';
    html += `<div class="notation-row">`
      + `<span class="notation-num">${round}.</span>`
      + `<span class="notation-black">${black}</span>`
      + `<span class="notation-white">${white}</span>`
      + `</div>`;
  }
  notationTable.innerHTML = html;
  const scroll = document.getElementById('notationScroll');
  if (scroll) scroll.scrollTop = scroll.scrollHeight;
}

if (homeBtn) homeBtn.addEventListener('click', goHome);
rulesBackBtn.addEventListener('click', goHome);