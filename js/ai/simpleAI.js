export function getAIMove(board) {
  const emptyCells = board.getEmptyCells();
  if (emptyCells.length === 0) return null;
  const randIndex = Math.floor(Math.random() * emptyCells.length);
  return emptyCells[randIndex];
}