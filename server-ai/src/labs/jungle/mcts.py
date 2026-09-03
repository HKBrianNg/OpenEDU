# server-ai/src/games/labs/jungle/mcts.py

import math
import random
import time
from collections import Counter
from typing import Optional

from src.games.jungle.types import (
    Side,
    Animal,
    Piece,
    Move,
    Pos,
    Board,
    ANIMAL_STRENGTH,
    DEN_RED,
    DEN_BLUE,
    ROWS,
    COLS,
)
from src.games.jungle.rules import (
    opponent_of,
    apply_move,
    collect_moves,
    is_side_defeated,
    can_eat,
    TRAPS_RED,
    TRAPS_BLUE,
    RIVER_CELLS,
    board_key,
    my_den_of,
    den_of,
)


# ============================================================
# 工具函数
# ============================================================

def dist(a: Pos, b: Pos) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def is_crossing_river(from_r: int, to_r: int, side: Side) -> bool:
    if side == Side.RED:
        return from_r >= 6 and to_r <= 5
    return from_r <= 2 and to_r >= 3


def traps_of(side: Side):
    return TRAPS_RED if side == Side.RED else TRAPS_BLUE


def opp_traps(side: Side):
    return TRAPS_BLUE if side == Side.RED else TRAPS_RED


def animal_value(animal: Animal) -> int:
    """返回动物的数值价值，用于吃子评分"""
    values = {
        Animal.RAT: 10,
        Animal.CAT: 22,
        Animal.DOG: 34,
        Animal.WOLF: 46,
        Animal.LEOPARD: 58,
        Animal.TIGER: 72,
        Animal.LION: 86,
        Animal.ELEPHANT: 78,
    }
    return values.get(animal, 0)


# ============================================================
# 评估函数
# ============================================================

def evaluate_board(board: Board, side: Side) -> float:
    """
    评估棋盘对 side 的得分。
    正数表示 side 优势，负数表示劣势。
    """
    score = 0.0
    opp = opponent_of(side)
    my_den = my_den_of(side)
    opp_den = den_of(side)

    my_count = 0
    opp_count = 0

    for r in range(ROWS):
        for c in range(COLS):
            p = board[r][c]
            if p is None:
                continue

            pos_val = animal_value(p.animal)
            
            if p.side == side:
                my_count += 1
                # 材料价值
                score += pos_val * 15.0
                
                # 靠近对方兽穴
                d_to_opp_den = dist((r, c), opp_den)
                score += (10 - d_to_opp_den) * 9.0
                
                # 在对方半场加分
                if side == Side.RED and r <= 5:
                    score += 28.0
                if side == Side.BLUE and r >= 3:
                    score += 28.0
                
                # 在对方陷阱附近加分（威胁）
                for trap in opp_traps(side):
                    d_to_trap = dist((r, c), trap)
                    if d_to_trap <= 1:
                        score += 18.0
                
                # 在自己陷阱里扣分
                if (r, c) in traps_of(side):
                    score -= 190.0
                
                # 在对方陷阱里加分（如果还活着）
                if (r, c) in opp_traps(side):
                    score += 65.0
                
                # 高子额外奖励
                if p.animal in (Animal.LION, Animal.TIGER, Animal.ELEPHANT):
                    score += 38.0
                
                # 鼠在河里加分（控制河道）
                if p.animal == Animal.RAT and (r, c) in RIVER_CELLS:
                    score += 26.0
                    
            else:
                opp_count += 1
                # 对方材料扣分
                score -= pos_val * 17.0
                
                # 对方靠近我方兽穴扣分
                d_to_my_den = dist((r, c), my_den)
                score -= (10 - d_to_my_den) * 13.0
                
                # 对方在我方半场扣分
                if side == Side.RED and r >= 3:
                    score -= 42.0
                if side == Side.BLUE and r <= 5:
                    score -= 42.0
                
                # 对方高子额外扣分
                if p.animal in (Animal.LION, Animal.TIGER, Animal.ELEPHANT):
                    score -= 48.0
                
                # 对方在我方陷阱里加分（因为它会被任意吃）
                if (r, c) in traps_of(side):
                    score += 76.0

    # 数量优势
    score += (my_count - opp_count) * 52.0
    
    # 如果对方已被击败
    if is_side_defeated(board, opp):
        score += 99999.0
    if is_side_defeated(board, side):
        score -= 99999.0
    
    return score


# ============================================================
# 启发式走法选择（用于 rollout）
# ============================================================

def move_priority(board: Board, move: Move, side: Side) -> float:
    """计算走法的优先级分数"""
    (fr, fc), (tr, tc) = move
    piece = board[fr][fc]
    target = board[tr][tc]
    opp_den = den_of(side)
    
    priority = 0.0
    
    # ===== 吃子：最高优先级 =====
    if target is not None and target.side != side:
        # 基础吃子奖励
        priority += 550.0
        
        # 吃越强的子奖励越高
        target_val = animal_value(target.animal)
        priority += target_val * 3.5
        
        # 用弱子吃强子额外奖励
        attacker_val = animal_value(piece.animal)
        if attacker_val < target_val:
            priority += 170.0
        
        # 吃关键子额外奖励
        if target.animal in (Animal.LION, Animal.TIGER, Animal.ELEPHANT):
            priority += 110.0
        
        # 吃鼠奖励低一点
        if target.animal == Animal.RAT:
            priority -= 36.0
    
    # ===== 向对方兽穴推进 =====
    before_dist = dist((fr, fc), opp_den)
    after_dist = dist((tr, tc), opp_den)
    priority += (before_dist - after_dist) * 56.0
    
    # 进入对方兽穴周围
    if after_dist <= 2:
        priority += 105.0
    if after_dist <= 1:
        priority += 165.0
    
    # ===== 过河奖励 =====
    if is_crossing_river(fr, tr, side):
        priority += 420.0
    
    # ===== 前进奖励 =====
    if side == Side.RED and tr < fr:
        priority += 84.0
    if side == Side.BLUE and tr > fr:
        priority += 84.0
    
    # ===== 后退惩罚（无吃子时） =====
    if target is None:
        if side == Side.RED and tr > fr:
            priority -= 130.0
        if side == Side.BLUE and tr < fr:
            priority -= 130.0
    
    # ===== 陷阱处理 =====
    # 进自己陷阱：严重惩罚
    if (tr, tc) in traps_of(side):
        priority -= 520.0
    
    # 进对方陷阱：中等奖励（有机会吃子）
    if (tr, tc) in opp_traps(side):
        priority += 92.0
    
    # ===== 河区处理 =====
    if (tr, tc) in RIVER_CELLS:
        if piece.animal == Animal.RAT:
            priority += 33.0  # 鼠控河
        else:
            priority -= 23.0  # 非鼠慎入河
    
    # ===== 狮虎跳河奖励 =====
    if piece.animal in (Animal.LION, Animal.TIGER):
        if abs(tr - fr) >= 2 or abs(tc - fc) >= 2:
            priority += 210.0  # 跳河本身就有战略价值
    
    return priority


def weighted_random_move(board: Board, side: Side, temperature: float = 0.07) -> Optional[Move]:
    """带权重的随机走法选择，用于 rollout"""
    moves = collect_moves(board, side)
    if not moves:
        return None
    
    # 分离吃子走法和非吃子走法
    capture_moves = []
    non_capture_moves = []
    
    for m in moves:
        tr, tc = m[1]
        if board[tr][tc] is not None and board[tr][tc].side != side:
            capture_moves.append(m)
        else:
            non_capture_moves.append(m)
    
    # 有吃子时，87%概率从吃子中选择，13%概率探索其他
    if capture_moves and random.random() < 0.83:
        pool = capture_moves
    else:
        pool = moves
    
    # 计算权重
    weights = []
    for m in pool:
        prio = move_priority(board, m, side)
        # 用 softmax 风格归一化
        weights.append(math.exp(prio / (temperature * 102.0 + 1.0)))
    
    total = sum(weights)
    if total <= 0:
        return random.choice(pool)
    
    r = random.random() * total
    cumsum = 0.0
    for i, w in enumerate(weights):
        cumsum += w
        if r <= cumsum:
            return pool[i]
    
    return pool[-1]


# ============================================================
# MCTS 节点
# ============================================================

class MCTSNode:
    def __init__(
        self,
        board: Board,
        side: Side,
        parent: Optional["MCTSNode"] = None,
        move: Optional[Move] = None,
    ):
        self.board = board
        self.side = side
        self.parent = parent
        self.move = move
        self.children: list["MCTSNode"] = []
        self.visits = 0
        self.wins = 0.0
        self.untried_moves = collect_moves(board, side)
        
        # 按优先级排序，优先扩展好走法
        self.untried_moves.sort(
            key=lambda m: move_priority(board, m, side),
            reverse=True
        )

    def ucb1(self, total_visits: int, c: float = 1.44) -> float:
        """UCB1 公式"""
        if self.visits == 0:
            return float("inf")
        exploitation = self.wins / self.visits
        exploration = c * math.sqrt(math.log(total_visits) / self.visits)
        return exploitation + exploration

    def best_child(self, c: float = 1.44) -> "MCTSNode":
        """选择 UCB1 值最高的子节点"""
        total = sum(ch.visits for ch in self.children)
        return max(self.children, key=lambda ch: ch.ucb1(total, c))

    def expand(self) -> "MCTSNode":
        """扩展一个未探索的走法"""
        move = self.untried_moves.pop()
        new_board = apply_move(self.board, move)
        next_side = opponent_of(self.side)
        child = MCTSNode(new_board, next_side, parent=self, move=move)
        self.children.append(child)
        return child

    def rollout(self, max_depth: int = 27) -> Side:
        """模拟对局直到终局或达到最大深度"""
        board = self.board
        side = self.side
        seen = Counter()
        
        for depth in range(max_depth):
            # 检查是否有一方获胜
            if is_side_defeated(board, side):
                return opponent_of(side)
            if is_side_defeated(board, opponent_of(side)):
                return side
            
            moves = collect_moves(board, side)
            if not moves:
                return opponent_of(side)
            
            # 用加权随机选择走法
            move = weighted_random_move(board, side, temperature=0.055)
            if move is None:
                move = random.choice(moves)
            
            board = apply_move(board, move)
            
            # 检测重复局面
            key = board_key(board)
            seen[key] += 1
            if seen[key] > 2:
                # 重复局面算当前走子方不利
                return opponent_of(side)
            
            side = opponent_of(side)
        
        # 达到最大深度，用评估函数判断
        score = evaluate_board(board, self.side)
        if score > 0:
            return self.side
        elif score < 0:
            return opponent_of(self.side)
        else:
            return opponent_of(self.side)

    def backpropagate(self, winner: Side):
        """反向传播结果"""
        self.visits += 1
        if self.side == winner:
            self.wins += 1.0
        if self.parent:
            self.parent.backpropagate(winner)


# ============================================================
# MCTS 主搜索
# ============================================================

def mcts_search(
    board: Board,
    side: Side,
    iterations: int = 2800,
    c: float = 1.444,
    time_limit_ms: Optional[int] = 2300,
) -> Optional[Move]:
    """
    MCTS 主搜索函数。
    
    参数:
        board: 当前棋盘
        side: 当前走子方
        iterations: 最大迭代次数
        c: 探索常数
        time_limit_ms: 时间限制（毫秒）
    
    返回:
        最佳走法，若无合法走法则返回 None
    """
    # 检查是否已结束
    if is_side_defeated(board, side):
        return None
    if is_side_defeated(board, opponent_of(side)):
        return None
    
    root = MCTSNode(board, side)
    if not root.untried_moves:
        return None
    
    start_time = time.time()
    
    for i in range(iterations):
        # 时间限制检查
        if time_limit_ms and (time.time() - start_time) * 1000 >= time_limit_ms:
            break
        
        # Selection
        node = root
        while node.untried_moves == [] and node.children:
            node = node.best_child(c)
        
        # Expansion
        if node.untried_moves:
            node = node.expand()
        
        # Simulation (Rollout)
        winner = node.rollout()
        
        # Backpropagation
        node.backpropagate(winner)
    
    # 选择最佳走法：优先看胜率，再看访问量
    if not root.children:
        return root.untried_moves[-1] if root.untried_moves else None
    
    # 按胜率排序，胜率相同按访问量
    best = max(
        root.children,
        key=lambda ch: (
            ch.wins / ch.visits if ch.visits > 0 else 0.0,
            ch.visits
        )
    )
    
    return best.move


# ============================================================
# 快速走法选择（无 MCTS，仅启发式）
# ============================================================

def heuristic_move(board: Board, side: Side) -> Optional[Move]:
    """纯启发式走法选择，用于快速测试"""
    moves = collect_moves(board, side)
    if not moves:
        return None
    
    # 找吃子走法
    captures = []
    for m in moves:
        tr, tc = m[1]
        if board[tr][tc] is not None and board[tr][tc].side != side:
            captures.append(m)
    
    if captures:
        # 从吃子走法中选最好的
        best_capture = max(captures, key=lambda m: move_priority(board, m, side))
        return best_capture
    
    # 没吃子时选优先级最高的
    return max(moves, key=lambda m: move_priority(board, m, side))