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
  }

  /** 尝试在 (x, y) 落子，返回是否成功 */
  place(x, y) {
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return false;
    if (this.grid[y][x] !== 0) return false;
    if (this.winner) return false;

    this.grid[y][x] = this.currentPlayer;
    this.moveHistory.push({ x, y, player: this.currentPlayer });

    if (this.checkWin(x, y, this.currentPlayer)) {
      this.winner = this.currentPlayer;
    }

    // 切换玩家
    this.currentPlayer = this.currentPlayer === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
    return true;
  }

  /** 五子连珠判断 */
  checkWin(x, y, player) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dx, dy] of dirs) {
      let count = 1;
      // 正方向
      for (let step = 1; step < 5; step++) {
        const nx = x + dx * step, ny = y + dy * step;
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && this.grid[ny][nx] === player) count++;
        else break;
      }
      // 负方向
      for (let step = 1; step < 5; step++) {
        const nx = x - dx * step, ny = y - dy * step;
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && this.grid[ny][nx] === player) count++;
        else break;
      }
      if (count >= 5) return true;
    }
    return false;
  }

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