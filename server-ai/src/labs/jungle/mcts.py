# server-ai/src/labs/jungle/mcts.py

import math
import random
import time
from typing import Optional

from src.games.jungle.types import Board, Side, Pos, Move
from src.games.jungle.rules import collect_moves, apply_move, is_side_defeated, opponent_of


class MCTSNode:
    def __init__(self, board: Board, side: Side, parent: Optional['MCTSNode'] = None, move: Optional[Move] = None):
        self.board = board
        self.side = side
        self.parent = parent
        self.move = move
        self.children: list['MCTSNode'] = []
        self.visits = 0
        self.wins = 0.0
        self.untried_moves: list[Move] = collect_moves(board, side)

    def ucb1(self, total_visits: int, c: float = 1.414) -> float:
        if self.visits == 0:
            return float('inf')
        exploitation = self.wins / self.visits
        exploration = c * math.sqrt(math.log(total_visits) / self.visits)
        return exploitation + exploration

    def best_child(self, c: float = 1.414) -> 'MCTSNode':
        total = sum(ch.visits for ch in self.children)
        return max(self.children, key=lambda ch: ch.ucb1(total, c))

    def expand(self) -> 'MCTSNode':
        move = self.untried_moves.pop()
        new_board = apply_move(self.board, move)
        next_side = opponent_of(self.side)
        child = MCTSNode(new_board, next_side, parent=self, move=move)
        self.children.append(child)
        return child

    def rollout(self) -> Side:
        board = self.board
        side = self.side
        while True:
            moves = collect_moves(board, side)
            if not moves:
                return opponent_of(side)
            move = random.choice(moves)
            board = apply_move(board, move)
            opp = opponent_of(side)
            if is_side_defeated(board, opp):
                return side
            side = opp

    def backpropagate(self, winner: Side):
        self.visits += 1
        if self.side == winner:
            self.wins += 1
        if self.parent:
            self.parent.backpropagate(winner)


def mcts_search(board: Board, side: Side, iterations: int = 1200, c: float = 1.414) -> Optional[Move]:
    root = MCTSNode(board, side)
    if not root.untried_moves:
        return None

    for _ in range(iterations):
        node = root
        while node.untried_moves == [] and node.children:
            node = node.best_child(c)
        if node.untried_moves:
            node = node.expand()
        winner = node.rollout()
        node.backpropagate(winner)

    best_child = max(root.children, key=lambda ch: ch.visits)
    return best_child.move