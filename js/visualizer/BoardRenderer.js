import { BOARD_SIZE, PLAYER_BLACK, PLAYER_WHITE } from '../constants.js';

const COL_LABELS = 'ABCDEFGHIJKLMNO';
const STAR_POS   = [[7,7],[3,3],[3,11],[11,3],[11,11]];

export class BoardRenderer {
  constructor(container) {
    this.container = container;
    this.cellSize = 40;

    this._buildDOM();
    this.computeLayout();
    window.addEventListener('resize', () => this.onResize());
    this._pendingLayout = false;

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

    this._hintPos = null;
  }

  _buildDOM() {
    this.container.innerHTML = '';
    this.container.classList.add('board-wrapper');

    this.boardMain = el('div','board-main');

    this.boardGrid = el('div','board-grid');

    // 星位 — 精确定位在交叉点中心
    STAR_POS.forEach(([cx,cy]) => {
      const s = el('span','star-point');
      s.style.setProperty('--sx', cx);
      s.style.setProperty('--sy', cy);
      this.boardGrid.appendChild(s);
    });

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

    // 四边坐标
    for (let i = 0; i < BOARD_SIZE; i++) {
      const t = el('span','coord-label coord-top');    t.textContent = COL_LABELS[i]; t.style.setProperty('--idx', i); this.boardMain.appendChild(t);
      const b = el('span','coord-label coord-bottom'); b.textContent = COL_LABELS[i]; b.style.setProperty('--idx', i); this.boardMain.appendChild(b);
      const l = el('span','coord-label coord-left');   l.textContent = String(15 - i); l.style.setProperty('--idx', i); this.boardMain.appendChild(l);
      const r = el('span','coord-label coord-right');  r.textContent = String(15 - i); r.style.setProperty('--idx', i); this.boardMain.appendChild(r);
    }

    this.container.appendChild(this.boardMain);
  }

  /* ======== 自适应 ======== */
  computeLayout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isFocus = document.getElementById('gamePage')?.classList.contains('focus-mode');
    // 专注：紧贴窗口边缘
    const availW = isFocus ? vw - 12  : vw - 210;
    const availH = isFocus ? vh - 12  : vh - 140;
    const slots  = 2 * 1.25 + 2 * 0.528;  // innerGap*2(格) + coordGap*2(格) ≈ 3.556
    const cs = Math.floor(Math.min(
      availW / (BOARD_SIZE - 1 + slots),
      availH / (BOARD_SIZE - 1 + slots)
    ));
    this.cellSize = Math.max(28, Math.min(cs, 55));

    const cell      = this.cellSize;
    const innerGap  = Math.round(cell * 1.25);           // 1.25 格
    const stoneD    = cell * 0.44 * 2;                   // 棋子直径
    const coordGap  = Math.round(stoneD * 0.8);           // 距网格 0.8 倍棋子直径
    const frameW    = Math.max(2, Math.round(cell * 0.09)); // 描边粗度（比例）
    const stoneR    = cell * 0.44;
    const starR     = Math.max(3, Math.round(cell * 0.1));
    const coordFS   = Math.max(13, Math.round(cell * 0.42));
    const gridSpan  = (BOARD_SIZE - 1) * cell;

    const s = this.container.style;
    s.setProperty('--cell-size',  cell + 'px');
    s.setProperty('--inner-gap',  innerGap + 'px');
    s.setProperty('--coord-gap',  coordGap + 'px');
    s.setProperty('--frame-w',    frameW + 'px');
    s.setProperty('--stone-r',    stoneR + 'px');
    s.setProperty('--star-r',     starR + 'px');
    s.setProperty('--coord-fs',   coordFS + 'px');
    s.setProperty('--grid-span',  gridSpan + 'px');
    s.setProperty('--marker-r',   Math.max(3, stoneR * 0.22) + 'px');
  }

  onResize() {
    if (!this._pendingLayout) {
      this._pendingLayout = true;
      requestAnimationFrame(() => {
        this._pendingLayout = false;
        this.computeLayout();
      });
    }
  }

  /* ======== 提示 ======== */
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

  static notation(x, y) { return COL_LABELS[x] + (15 - y); }

  /* ======== 绘制 ======== */
  draw(board) {
    const { grid, moveHistory } = board;
    const last = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const s = this._stones[y][x];
        const v = grid[y][x];
        if (v === 0) { s.style.display = 'none'; s.className = 'stone'; }
        else { s.style.display = ''; s.className = v === PLAYER_BLACK ? 'stone stone-black' : 'stone stone-white'; }
      }
    }

    if (last) {
      this.lastMarker.style.display = '';
      this.lastMarker.style.setProperty('--sx', last.x);
      this.lastMarker.style.setProperty('--sy', last.y);
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
