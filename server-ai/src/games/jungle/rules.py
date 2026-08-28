from .types import *

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

def can_eat(attacker: Piece, defender: Optional[Piece]) -> bool:
    if defender is None:
        return True
    if attacker.side == defender.side:
        return False
    if attacker.animal == Animal.RAT and defender.animal == Animal.ELEPHANT:
        return True
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
                    if target is None or can_eat(piece, target):
                        results.append((jump_r, jump_c))
                continue
            else:
                if target is not None:
                    continue
                results.append((nr, nc))
                continue

        if target is None or can_eat(piece, target):
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
    return out

def apply_move(board: Board, m: tuple[Pos, Pos]) -> Board:
    nb = [row[:] for row in board]
    fr, fc = m[0]
    tr, tc = m[1]
    nb[tr][tc] = nb[fr][fc]
    nb[fr][fc] = None
    return nb