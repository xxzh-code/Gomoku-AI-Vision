import { PLAYER_BLACK, PLAYER_WHITE } from '../constants.js';
import { getAIMove } from '../ai/simpleAI.js';

export class GameController {
  /**
   * @param {Board} board
   * @param {BoardRenderer} renderer
   * @param {HTMLElement} statusElement
   * @param {'ai'|'two-player'} mode
   */
  constructor(board, renderer, statusElement, mode = 'ai') {
    this.board = board;
    this.renderer = renderer;
    this.statusEl = statusElement || { textContent: '' };
    this.mode = mode;
    this.isAIThinking = false;
    this.onUpdate = null;   // 外部回调(board) → 记谱刷新

    this.renderer.onCellClick = (x, y) => this.handleHumanMove(x, y);
  }

  start() {
    this.board.reset();
    this.renderer.draw(this.board);
    this.updateStatus();
    this.fireUpdate();
  }

  handleHumanMove(x, y) {
    if (this.board.isGameOver()) return;
    if (this.mode === 'ai') {
      if (this.isAIThinking) return;
      if (this.board.currentPlayer !== PLAYER_BLACK) return;
    }

    const success = this.board.place(x, y);
    if (!success) return;

    this.afterMove();

    if (this.mode === 'ai' && !this.board.isGameOver()) {
      this.isAIThinking = true;
      setTimeout(() => {
        this.aiMove();
        this.isAIThinking = false;
      }, 300);
    }
  }

  aiMove() {
    if (this.board.currentPlayer !== PLAYER_WHITE || this.board.isGameOver()) return;
    const move = getAIMove(this.board);
    if (move) {
      this.board.place(move.x, move.y);
      this.afterMove();
    }
  }

  afterMove() {
    this.renderer.draw(this.board);
    this.updateStatus();
    this.fireUpdate();
  }

  /** 悔棋：人机模式撤回双方各一手，双人模式撤回一手 */
  undoMove() {
    if (this.isAIThinking) return;
    const hist = this.board.moveHistory;
    if (hist.length === 0) return;

    if (this.mode === 'ai' && hist.length >= 2) {
      // 撤回 AI + 玩家各一手
      this.board.popMove();
      this.board.popMove();
    } else if (this.mode === 'two-player' || (this.mode === 'ai' && hist[hist.length - 1].player === PLAYER_BLACK)) {
      // 双人撤回一手；人机模式只撤玩家一手（AI 还没回应的情况）
      this.board.popMove();
    }

    this.renderer.draw(this.board);
    this.updateStatus();
    this.fireUpdate();
  }

  /** 认输：当前回合方认输，对手胜 */
  resign() {
    if (this.board.isGameOver()) return;
    const opp = this.board.currentPlayer === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
    this.board.winner = opp;
    this.afterMove();
  }

  /** 提和 */
  offerDraw() {
    if (this.board.isGameOver()) return;
    this.board.drawAgreed = true;
    this.afterMove();
  }

  fireUpdate() {
    if (this.onUpdate) this.onUpdate(this.board);
  }

  updateStatus() {
    if (this.board.drawAgreed) {
      this.statusEl.textContent = '和棋';
    } else if (this.board.winner) {
      if (this.mode === 'ai') {
        this.statusEl.textContent = this.board.winner === PLAYER_BLACK ? '黑棋胜！' : '白棋胜！';
      } else {
        this.statusEl.textContent = this.board.winner === PLAYER_BLACK ? '黑方赢了！' : '白方赢了！';
      }
    } else if (this.board.getEmptyCells().length === 0) {
      this.statusEl.textContent = '平局';
    } else {
      if (this.mode === 'ai') {
        this.statusEl.textContent = this.board.currentPlayer === PLAYER_BLACK ? '你的回合' : 'AI 思考中...';
      } else {
        this.statusEl.textContent = this.board.currentPlayer === PLAYER_BLACK ? '黑方回合' : '白方回合';
      }
    }
  }
}