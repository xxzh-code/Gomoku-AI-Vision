import { BOARD_SIZE, PLAYER_BLACK, PLAYER_WHITE } from '../constants.js';

const COL_LABELS = 'ABCDEFGHIJKLMNO';
const STAR_POS   = [[7,7],[3,3],[3,11],[11,3],[11,11]];

export class BoardRenderer {
  constructor(container) {
    this.container = container;
    this.dpr = window.devicePixelRatio || 1;
    this.cellSize = 40;

    this._buildDOM();
    this.computeLayout();
    window.addEventListener('resize', () => this.onResize());

    this.onCellClick = null;
    this.boardGrid.addEventListener('click', (e) => {
      if (!this.onCellClick) return;
      const rect = this.boardGrid.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const x = Math.round(mx / this.cellSize);
      const y = Math.round(my / this.cellSize);
      if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
        this.onCellClick(x, y);
      }
    });

    this._lastBoard = null;
    this._hintPos = null;
  }

  _buildDOM() {
    this.container.innerHTML = '';
    this.container.classList.add('board-wrapper');

    // 棋盘主体（包含 padding 内的坐标空间）
    this.boardMain = el('div','board-main');
    this.boardMain.style.position = 'relative';

    // 网格
    this.boardGrid = el('div','board-grid');

    // 星位
    STAR_POS.forEach(([cx,cy]) => {
      const s = el('span','star-point');
      s.style.setProperty('--sx', cx);
      s.style.setProperty('--sy', cy);
      this.boardGrid.appendChild(s);
    });

    // 外框
    this.boardFrame = el('div','board-frame');
    this.boardGrid.appendChild(this.boardFrame);

    // 棋子层
    this.stonesLayer = el('div','stones-layer');
    this._stones = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      this._stones[y] = [];
      for (let x = 0; x < BOARD_SIZE; x++) {
        const s = el('div','stone');
        s.style.display = 'none';
        s.style.setProperty('--sx', x);
        s.style.setProperty('--sy', y);
        this.stonesLayer.appendChild(s);
        this._stones[y][x] = s;
      }
    }
    this.lastMarker = el('div','last-marker');
    this.lastMarker.style.display = 'none';
    this.stonesLayer.appendChild(this.lastMarker);
    this.hintMarker = el('div','hint-marker');
    this.hintMarker.style.display = 'none';
    this.stonesLayer.appendChild(this.hintMarker);

    this.boardGrid.appendChild(this.stonesLayer);
    this.boardMain.appendChild(this.boardGrid);

    // ---- 坐标（在 boardMain 内绝对定位，对齐网格线）----
    this._coords = { top:[], bottom:[], left:[], right:[] };

    // 顶部 A-O
    for (let i = 0; i < BOARD_SIZE; i++) {
      const s = el('span','coord-label coord-top');
      s.textContent = COL_LABELS[i];
      s.style.setProperty('--idx', i);
      this.boardMain.appendChild(s);
      this._coords.top.push(s);
    }
    // 底部 A-O
    for (let i = 0; i < BOARD_SIZE; i++) {
      const s = el('span','coord-label coord-bottom');
      s.textContent = COL_LABELS[i];
      s.style.setProperty('--idx', i);
      this.boardMain.appendChild(s);
      this._coords.bottom.push(s);
    }
    // 左侧 1-15
    for (let i = 0; i < BOARD_SIZE; i++) {
      const s = el('span','coord-label coord-left');
      s.textContent = String(15 - i);
      s.style.setProperty('--idx', i);
      this.boardMain.appendChild(s);
      this._coords.left.push(s);
    }
    // 右侧 1-15
    for (let i = 0; i < BOARD_SIZE; i++) {
      const s = el('span','coord-label coord-right');
      s.textContent = String(15 - i);
      s.style.setProperty('--idx', i);
      this.boardMain.appendChild(s);
      this._coords.right.push(s);
    }

    this.container.appendChild(this.boardMain);
  }

  computeLayout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isFocus = document.getElementById('gamePage')?.classList.contains('focus-mode');
    const availW = isFocus ? vw - 60 : vw - 210;
    const availH = isFocus ? vh - 10  : vh - 140;
    const coordSlots = 3.3;
    const cs = Math.floor(Math.min(
      availW / (BOARD_SIZE - 1 + coordSlots),
      availH / (BOARD_SIZE - 1 + coordSlots)
    ));
    this.cellSize = Math.max(28, Math.min(cs, 55));

    const innerGap  = Math.ceil(this.cellSize * 0.60);
    const frameW    = 5;
    const stoneR    = this.cellSize * 0.44;
    const starR     = Math.max(3, Math.round(this.cellSize * 0.1));
    const coordFS   = Math.max(13, Math.round(this.cellSize * 0.42));
    const gridSpan  = (BOARD_SIZE - 1) * this.cellSize;

    const s = this.container.style;
    s.setProperty('--cell-size',   this.cellSize + 'px');
    s.setProperty('--inner-gap',   innerGap + 'px');
    s.setProperty('--frame-w',     frameW + 'px');
    s.setProperty('--stone-r',     stoneR + 'px');
    s.setProperty('--star-r',      starR + 'px');
    s.setProperty('--coord-fs',    coordFS + 'px');
    s.setProperty('--grid-span',   gridSpan + 'px');
    s.setProperty('--marker-r',    Math.max(3, stoneR * 0.22) + 'px');
  }

  onResize() {
    if (this._rt) clearTimeout(this._rt);
    this._rt = setTimeout(() => { this.computeLayout(); }, 150);
  }

  set hintPos(pos) {
    this._hintPos = pos;
    if (pos) {
      this.hintMarker.style.display = '';
      this.hintMarker.style.setProperty('--sx', pos.x);
      this.hintMarker.style.setProperty('--sy', pos.y);
    } else {
      this.hintMarker.style.display = 'none';
    }
  }
  get hintPos() { return this._hintPos; }

  static notation(x, y) {
    return COL_LABELS[x] + (15 - y);
  }

  draw(board) {
    const { grid, moveHistory } = board;
    const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const stone = this._stones[y][x];
        const val = grid[y][x];
        if (val === 0) {
          stone.style.display = 'none';
          stone.className = 'stone';
        } else {
          stone.style.display = '';
          stone.className = val === PLAYER_BLACK ? 'stone stone-black' : 'stone stone-white';
        }
      }
    }

    if (lastMove) {
      this.lastMarker.style.display = '';
      this.lastMarker.style.setProperty('--sx', lastMove.x);
      this.lastMarker.style.setProperty('--sy', lastMove.y);
    } else {
      this.lastMarker.style.display = 'none';
    }
  }
}

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
