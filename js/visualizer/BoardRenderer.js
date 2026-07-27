import { BOARD_SIZE, PLAYER_BLACK, PLAYER_WHITE } from '../constants.js';

const COL_LABELS = 'ABCDEFGHIJKLMNO';
const STAR_POS   = [[7,7],[3,3],[3,11],[11,3],[11,11]];
const BLACK_SVGS = Array.from({length:10}, (_,i) => `assets/images/stones/black/B${i+1}.svg`);
const WHITE_SVGS = Array.from({length:10}, (_,i) => `assets/images/stones/white/W${i+1}.svg`);
const SHADOW_SVG = 'assets/images/stones/shadow.svg';

function randomStone(color) {
  const list = color === PLAYER_BLACK ? BLACK_SVGS : WHITE_SVGS;
  return list[Math.floor(Math.random() * list.length)];
}

export class BoardRenderer {
  constructor(container) {
    this.container = container;
    this.cellSize = 40;
    this.innerGap = 50;

    this._buildDOM();
    this.computeLayout();
    window.addEventListener('resize', () => this.onResize());
    this._pendingLayout = false;

    this.onCellClick = null;
    this._hoverCell = null;

    this.boardMain.addEventListener('click', (e) => {
      const p = this._eventToCell(e);
      if (p && this.onCellClick) this.onCellClick(p.x, p.y);
    });
    this.boardMain.addEventListener('mousemove', (e) => {
      const p = this._eventToCell(e);
      if (p && (!this._hoverCell || this._hoverCell.x !== p.x || this._hoverCell.y !== p.y)) {
        this._hoverCell = p;
        // 已落子位置不显示预览
        const occupied = this._lastBoard && this._lastBoard.grid[p.y][p.x] !== 0;
        if (occupied) { this._hidePreview(); }
        else { this._updatePreview(p.x, p.y); }
      } else if (!p && this._hoverCell) {
        this._hoverCell = null;
        this._hidePreview();
      }
    });
    this.boardMain.addEventListener('mouseleave', () => {
      this._hoverCell = null;
      this._hidePreview();
    });

    this._hintPos = null;
  }

  _eventToCell(e) {
    const rect = this.boardMain.getBoundingClientRect();
    const mx = e.clientX - rect.left - this.innerGap;
    const my = e.clientY - rect.top  - this.innerGap;
    const x = Math.round(mx / this.cellSize);
    const y = Math.round(my / this.cellSize);
    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) return { x, y };
    return null;
  }

  _buildDOM() {
    this.container.innerHTML = '';
    this.container.classList.add('board-wrapper');

    this.boardMain = el('div','board-main');
    this.boardGrid = el('div','board-grid');

    STAR_POS.forEach(([cx,cy]) => {
      const s = el('span','star-point');
      s.style.setProperty('--sx', cx);
      s.style.setProperty('--sy', cy);
      this.boardGrid.appendChild(s);
    });

    // 阴影层（底层）
    this.shadowsLayer = el('div','shadows-layer');
    this._shadows = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      this._shadows[y] = [];
      for (let x = 0; x < BOARD_SIZE; x++) {
        const s = el('img','stone-shadow');
        s.src = SHADOW_SVG;
        s.alt = '';
        s.style.display = 'none';
        s.style.setProperty('--sx', x);
        s.style.setProperty('--sy', y);
        this.shadowsLayer.appendChild(s);
        this._shadows[y][x] = s;
      }
    }
    this.boardGrid.appendChild(this.shadowsLayer);

    // 棋子层（上层）
    this.stonesLayer = el('div','stones-layer');
    this._stones = [];
    this._stoneSrcs = [];   // 记录每格已选的 SVG
    for (let y = 0; y < BOARD_SIZE; y++) {
      this._stones[y] = [];
      this._stoneSrcs[y] = [];
      for (let x = 0; x < BOARD_SIZE; x++) {
        const s = el('img','stone-img');
        s.alt = '';
        s.style.display = 'none';
        s.style.setProperty('--sx', x);
        s.style.setProperty('--sy', y);
        this.stonesLayer.appendChild(s);
        this._stones[y][x] = s;
        this._stoneSrcs[y][x] = null;
      }
    }

    this.lastMarker = el('div','last-marker');
    this.lastMarker.style.display = 'none';
    this.stonesLayer.appendChild(this.lastMarker);
    this.hintMarker = el('div','hint-marker');
    this.hintMarker.style.display = 'none';
    this.stonesLayer.appendChild(this.hintMarker);

    // 预览（棋子+阴影，初始隐藏）
    this.pvShadow = el('img','stone-shadow stone-pv'); this.pvShadow.src = SHADOW_SVG; this.pvShadow.alt = '';
    this.pvShadow.style.display = 'none';
    this.shadowsLayer.appendChild(this.pvShadow);
    this.pvImg = el('img','stone-img stone-pv'); this.pvImg.alt = '';
    this.pvImg.style.display = 'none';
    this.stonesLayer.appendChild(this.pvImg);
    this._pvVisible = false;

    this.boardGrid.appendChild(this.stonesLayer);

    // 终局连线（wrapper 旋转，inner 拉伸动画）
    this.winLineWrap = el('div','win-line-wrap');
    this.winLineWrap.style.display = 'none';
    this.winLineEl = el('div','win-line');
    this.winLineWrap.appendChild(this.winLineEl);
    this.boardGrid.appendChild(this.winLineWrap);

    this.boardMain.appendChild(this.boardGrid);

    for (let i = 0; i < BOARD_SIZE; i++) {
      const t = el('span','coord-label coord-top');    t.textContent = COL_LABELS[i]; t.style.setProperty('--idx', i); this.boardMain.appendChild(t);
      const b = el('span','coord-label coord-bottom'); b.textContent = COL_LABELS[i]; b.style.setProperty('--idx', i); this.boardMain.appendChild(b);
      const l = el('span','coord-label coord-left');   l.textContent = String(15 - i); l.style.setProperty('--idx', i); this.boardMain.appendChild(l);
      const r = el('span','coord-label coord-right');  r.textContent = String(15 - i); r.style.setProperty('--idx', i); this.boardMain.appendChild(r);
    }

    this.container.appendChild(this.boardMain);
  }

  _updatePreview(x, y) {
    const ts = document.getElementById('turnStone');
    const isBlack = ts && ts.classList.contains('black');
    this.pvImg.src = isBlack ? BLACK_SVGS[0] : WHITE_SVGS[0];
    const tx = (x * this.cellSize) + 'px';
    const ty = (y * this.cellSize) + 'px';
    const t = `translate(calc(${tx} - 50%), calc(${ty} - 50%))`;
    this.pvShadow.style.transform = t;
    this.pvImg.style.transform = t;

    // 取消正在进行的消失动画
    if (this._pvTimer) { clearTimeout(this._pvTimer); this._pvTimer = null; }

    if (!this._pvVisible) {
      // 首次出现：先 display 再 opacity 淡入
      this.pvShadow.style.display = '';
      this.pvImg.style.display = '';
      this.pvShadow.style.opacity = '0';
      this.pvImg.style.opacity = '0';
      this.pvShadow.classList.add('no-transition');
      this.pvImg.classList.add('no-transition');
      void this.pvImg.offsetWidth;
      this.pvShadow.classList.remove('no-transition');
      this.pvImg.classList.remove('no-transition');
    }
    this.pvShadow.style.opacity = '0.5';
    this.pvImg.style.opacity = '0.5';
    this._pvVisible = true;
    this.boardMain.classList.add('preview-active');
  }
  _hidePreview() {
    if (!this._pvVisible) return;
    this.boardMain.classList.remove('preview-active');
    this.pvShadow.style.opacity = '0';
    this.pvImg.style.opacity = '0';
    this._pvTimer = setTimeout(() => {
      this._pvVisible = false;
      this.pvShadow.style.display = 'none';
      this.pvImg.style.display = 'none';
      this._pvTimer = null;
    }, 130);
  }

  /* ======== 自适应 ======== */
  computeLayout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isFocus = document.getElementById('gamePage')?.classList.contains('focus-mode');
    const availW = isFocus ? vw - 12  : vw - 210;
    const availH = isFocus ? vh - 12  : vh - 140;
    const slots  = 2 * 1.25 + 2 * 0.528;
    const cs = Math.floor(Math.min(
      availW / (BOARD_SIZE - 1 + slots),
      availH / (BOARD_SIZE - 1 + slots)
    ));
    this.cellSize = Math.max(28, Math.min(cs, 55));

    const cell      = this.cellSize;
    const innerGap  = Math.round(cell * 1.25);
    this.innerGap   = innerGap;
    const stoneD    = cell * 0.44 * 2;
    const coordGap  = Math.round(stoneD * 0.8);
    const frameW    = Math.max(2, Math.round(cell * 0.09));
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

    const sidePanel = document.getElementById('sidePanel');
    if (sidePanel) {
      sidePanel.style.height = (innerGap * 2 + gridSpan) + 'px';
    }
  }

  onResize() {
    if (!this._pendingLayout) {
      this._pendingLayout = true;
      requestAnimationFrame(() => {
        this._pendingLayout = false;
        this.computeLayout();
        if (this._lastWinLine) this._drawWinLine(this._lastWinLine, false);
      });
    }
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

  static notation(x, y) { return COL_LABELS[x] + (15 - y); }

  /* ======== 终局连线 ======== */
  showWinLine(board) {
    const line = board.getWinningLine();
    if (!line) return;
    this._lastWinLine = line;  // 保存供 resize 重绘
    this._drawWinLine(line);
  }

  _drawWinLine(line, animate = true) {
    let { x1, y1, x2, y2 } = line;
    if (y1 > y2 || (y1 === y2 && x1 > x2)) {
      [x1, y1, x2, y2] = [x2, y2, x1, y1];
    }
    const cs = this.cellSize;
    const sx = x1 * cs, sy = y1 * cs;
    const ex = x2 * cs, ey = y2 * cs;
    const dx = ex - sx, dy = ey - sy;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    const wrap = this.winLineWrap;
    wrap.style.display = '';
    wrap.style.left = sx + 'px';
    wrap.style.top  = (sy - 2) + 'px';
    wrap.style.width = len + 'px';
    wrap.style.transform = `rotate(${angle}deg)`;

    if (animate) {
      const el = this.winLineEl;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = 'win-draw 0.15s ease-in forwards';
    }
  }

  hideWinLine() {
    this.winLineWrap.style.display = 'none';
    this._lastWinLine = null;
  }

  /* ======== 绘制 ======== */
  draw(board) {
    this._lastBoard = board;
    const { grid, moveHistory } = board;
    const last = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const stone  = this._stones[y][x];
        const shadow = this._shadows[y][x];
        const v = grid[y][x];
        if (v === 0) {
          stone.style.display = 'none';
          shadow.style.display = 'none';
          this._stoneSrcs[y][x] = null;
        } else {
          const wasHidden = stone.style.display === 'none';
          stone.style.display = '';
          shadow.style.display = '';
          if (!this._stoneSrcs[y][x]) {
            this._stoneSrcs[y][x] = randomStone(v);
          }
          stone.src = this._stoneSrcs[y][x];
          if (wasHidden) {
            stone.classList.remove('stone-drop');
            void stone.offsetWidth;
            stone.classList.add('stone-drop');
            stone.addEventListener('animationend', () => stone.classList.remove('stone-drop'), { once: true });
          }
        }
      }
    }

    if (last) {
      this.lastMarker.style.display = '';
      this.lastMarker.style.setProperty('--sx', last.x);
      this.lastMarker.style.setProperty('--sy', last.y);
    } else {
      this.lastMarker.style.display = 'none';
    }

    // 终局连线
    const wl = board.getWinningLine();
    if (board.winner && wl) {
      const same = this._lastWinLine &&
        this._lastWinLine.x1 === wl.x1 && this._lastWinLine.y1 === wl.y1 &&
        this._lastWinLine.x2 === wl.x2 && this._lastWinLine.y2 === wl.y2;
      this._lastWinLine = wl;
      if (same) {
        // 已存在：仅更新位置，不重播动画
        this._drawWinLine(wl, false);
      } else {
        setTimeout(() => this._drawWinLine(wl, true), 280);
      }
    } else {
      this.hideWinLine();
    }

    this._hidePreview();
  }
}

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
