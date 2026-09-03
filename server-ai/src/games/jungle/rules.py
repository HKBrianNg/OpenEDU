# server-ai/src/games/jungle/rules.py

from .types import *

TRAPS_RED = {(7, 2), (7, 4), (8, 3)}
TRAPS_BLUE = {(1, 2), (1, 4), (0, 3)}


def opponent_of(side: Side) -> Side:
    return Side.BLUE if side == Side.RED else Side.RED


def den_of(side: Side) -> Pos:
    return DEN_BLUE if side == Side.RED else DEN_RED


def my_den_of(side: Side) -> Pos:
    return DEN_RED if side == Side.RED else DEN_BLUE


def in_bounds(r: int, c: int) -> bool:
    return 0 <= r < ROWS and 0 <= c < COLS


def is_river(r: int, c: int) -> bool:
    return 3 <= r <= 5 and c in (1, 2, 4, 5)


# 河格常量集合，供 mcts.py 等模块直接导入使用
RIVER_CELLS = frozenset(
    (r, c)
    for r in range(ROWS)
    for c in range(COLS)
    if is_river(r, c)
)


def can_eat(
    attacker: Piece,
    defender: Optional[Piece],
    defender_pos: Optional[Pos] = None,
    attacker_side: Optional[Side] = None,
) -> bool:
    if defender is None:
        return True
    if attacker.side == defender.side:
        return False

    # 陷阱：防守方在对方陷阱里，攻击方任意吃
    if defender_pos is not None:
        # 防守方在红方陷阱 → 红方可任意吃
        if defender_pos in TRAPS_RED and attacker.side == Side.RED:
            return True
        # 防守方在蓝方陷阱 → 蓝方可任意吃
        if defender_pos in TRAPS_BLUE and attacker.side == Side.BLUE:
            return True

    # 鼠吃象
    if attacker.animal == Animal.RAT and defender.animal == Animal.ELEPHANT:
        return True
    # 象不能吃鼠
    if attacker.animal == Animal.ELEPHANT and defender.animal == Animal.RAT:
        return False
    # 鼠不能吃其他子（除象和陷阱里的）
    if attacker.animal == Animal.RAT:
        return False

    return ANIMAL_STRENGTH[attacker.animal] >= ANIMAL_STRENGTH[defender.animal]


def get_valid_moves(board: Board, pos: Pos, side: Side) -> list[Pos]:
    r, c = pos
    piece = board[r][c]
    if piece is None or piece.side != side:
        return []

    results: list[Pos] = []
    my_den = my_den_of(side)

    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr, nc = r + dr, c + dc
        if not in_bounds(nr, nc):
            continue
        if (nr, nc) == my_den:
            continue

        target = board[nr][nc]

        if is_river(nr, nc):
            if piece.animal != Animal.RAT:
                if piece.animal in (Animal.LION, Animal.TIGER):
                    jump_r, jump_c = nr + dr, nc + dc
                    if not in_bounds(jump_r, jump_c):
                        continue
                    mid_r, mid_c = r + dr, c + dc
                    if board[mid_r][mid_c] is not None:
                        continue
                    target = board[jump_r][jump_c]
                    if target is None or can_eat(piece, target, (jump_r, jump_c), side):
                        results.append((jump_r, jump_c))
                continue
            else:
                # 鼠进河：河格必须空
                if target is not None:
                    continue
                results.append((nr, nc))
                continue

        if target is None or can_eat(piece, target, (nr, nc), side):
            results.append((nr, nc))

    return results


def is_side_defeated(board: Board, side: Side) -> bool:
    """检查 side 是否被击败（对方棋子进入了 side 的兽穴）"""
    den = my_den_of(side)
    piece = board[den[0]][den[1]]
    return piece is not None and piece.side != side


def collect_moves(board: Board, side: Side) -> list[tuple[Pos, Pos]]:
    out = []
    for r in range(ROWS):
        for c in range(COLS):
            p = board[r][c]
            if p and p.side == side:
                for to in get_valid_moves(board, (r, c), side):
                    out.append(((r, c), to))

    # 调试：打印所有吃子走法（默认注释掉，需要时可取消注释）
    # for (fr, fc), (tr, tc) in out:
    #     piece = board[fr][fc]
    #     target = board[tr][tc]
    #     if target is not None:
    #         print(f"[DEBUG] 吃子走法: {piece.side.name} {piece.animal.name} ({fr},{fc}) -> ({tr},{tc}) {target.animal.name}")

    return out


def apply_move(board: Board, m: tuple[Pos, Pos]) -> Board:
    nb = [row[:] for row in board]
    fr, fc = m[0]
    tr, tc = m[1]
    nb[tr][tc] = nb[fr][fc]
    nb[fr][fc] = None
    return nb


def print_board(board: Board):
    """打印棋盘，方便调试"""
    print("   ", end="")
    for c in range(COLS):
        print(f" {c} ", end=" ")
    print()
    for r in range(ROWS):
        print(f"{r}  ", end="")
        for c in range(COLS):
            p = board[r][c]
            if p is None:
                print(" . ", end=" ")
            else:
                side_char = "R" if p.side == Side.RED else "B"
                animal_name = p.animal.name[:3]
                print(f"{side_char}{animal_name}", end=" ")
        print()


def board_key(board: Board) -> str:
    """为棋盘生成一个唯一键，用于检测重复局面"""
    parts = []
    for r in range(ROWS):
        for c in range(COLS):
            p = board[r][c]
            if p is None:
                parts.append(".")
            else:
                side_char = "r" if p.side == Side.RED else "b"
                animal_num = ANIMAL_STRENGTH[p.animal]
                parts.append(f"{side_char}{animal_num}")
    return "|".join(parts)