import { BOARD_SIZE, PLAYER_BLACK, PLAYER_WHITE } from '../constants.js';

export class Board {
  constructor() {
    this.reset();
  }

  reset() {
    // 0 表示空，1 黑子，2 白子
    this.grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
    this.currentPlayer = PLAYER_BLACK; // 黑先
    this.winner = null;
    this.moveHistory = [];
    this.drawAgreed = false;
    this.winLine = null;   // { x1, y1, x2, y2 } | null
    this.endReason = null; // 'win'|'resign'|'draw'|'full'|'pass'|'timeout'
  }

  /** 尝试在 (x, y) 落子，返回是否成功 */
  place(x, y) {
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return false;
    if (this.grid[y][x] !== 0) return false;
    if (this.winner) return false;

    this.grid[y][x] = this.currentPlayer;
    this.moveHistory.push({ x, y, player: this.currentPlayer });

    const line = this.findWinLine(x, y, this.currentPlayer);
    if (line) {
      this.winner = this.currentPlayer;
      this.winLine = line;
      this.endReason = 'win';
    }

    // 切换玩家
    this.currentPlayer = this.currentPlayer === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
    return true;
  }

  /** 判断 (x,y) 是否形成五连/长连，返回连线端点 */
  findWinLine(x, y, player) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dx, dy] of dirs) {
      let sx = x, sy = y, ex = x, ey = y;
      // 正方向延伸
      while (true) {
        const nx = ex + dx, ny = ey + dy;
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && this.grid[ny][nx] === player) {
          ex = nx; ey = ny;
        } else break;
      }
      // 负方向延伸
      while (true) {
        const nx = sx - dx, ny = sy - dy;
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && this.grid[ny][nx] === player) {
          sx = nx; sy = ny;
        } else break;
      }
      const count = Math.max(Math.abs(ex - sx), Math.abs(ey - sy)) + 1;
      if (count >= 5) return { x1: sx, y1: sy, x2: ex, y2: ey };
    }
    return null;
  }

  getWinningLine() { return this.winLine; }

  /** 获取所有空位坐标 */
  getEmptyCells() {
    const cells = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.grid[y][x] === 0) cells.push({ x, y });
      }
    }
    return cells;
  }

  /** 悔棋：撤回最后一手 */
  popMove() {
    if (this.moveHistory.length === 0) return null;
    const move = this.moveHistory.pop();
    this.grid[move.y][move.x] = 0;
    this.winner = null;
    this.currentPlayer = move.player;
    return move;
  }

  isGameOver() {
    return this.winner !== null || this.getEmptyCells().length === 0 || this.drawAgreed;
  }
}