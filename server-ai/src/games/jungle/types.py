from __future__ import annotations

from enum import IntEnum
from typing import Optional, Tuple, List, TypeAlias


class Animal(IntEnum):
    RAT = 1
    CAT = 2
    DOG = 3
    WOLF = 4
    LEOPARD = 5
    TIGER = 6
    LION = 7
    ELEPHANT = 8


class Side(IntEnum):
    RED = 0
    BLUE = 1


class Piece:
    animal: Animal
    side: Side

    def __init__(self, animal: Animal, side: Side):
        self.animal = animal
        self.side = side

    def __repr__(self):
        return f"{'R' if self.side == Side.RED else 'B'}{self.animal.value}"

    def to_dict(self):
        return {"animal": self.animal.value, "side": self.side.value}

    @staticmethod
    def from_dict(d: dict) -> 'Piece':
        return Piece(Animal(d["animal"]), Side(d["side"]))


Pos: TypeAlias = Tuple[int, int]                     # (row, col)
Board: TypeAlias = List[List[Optional[Piece]]]
Move: TypeAlias = Tuple[Pos, Pos]                    # (from, to)

ROWS = 9
COLS = 7

DEN_RED = (8, 3)      # 红方兽穴在底部
DEN_BLUE = (0, 3)     # 蓝方兽穴在顶部

ANIMAL_STRENGTH = {
    Animal.RAT: 1,
    Animal.CAT: 2,
    Animal.DOG: 3,
    Animal.WOLF: 4,
    Animal.LEOPARD: 5,
    Animal.TIGER: 6,
    Animal.LION: 7,
    Animal.ELEPHANT: 8,
}

# 标准斗兽棋初始布局（每方8种动物各1只）
INITIAL_BOARD: Board = [
    # row 0: 蓝方底行（左到右：狮、象、虎、兽穴、豹、狼、狗）
    [Piece(Animal.LION, Side.BLUE), Piece(Animal.ELEPHANT, Side.BLUE), Piece(Animal.TIGER, Side.BLUE), None, Piece(Animal.LEOPARD, Side.BLUE), Piece(Animal.WOLF, Side.BLUE), Piece(Animal.DOG, Side.BLUE)],
    # row 1: 蓝方前排（猫、鼠）
    [None, Piece(Animal.CAT, Side.BLUE), None, None, None, Piece(Animal.RAT, Side.BLUE), None],
    # row 2-6: 空地（含河区）
    [None, None, None, None, None, None, None],
    [None, None, None, None, None, None, None],
    [None, None, None, None, None, None, None],
    [None, None, None, None, None, None, None],
    [None, None, None, None, None, None, None],
    # row 7: 红方前排（鼠、猫）
    [None, Piece(Animal.RAT, Side.RED), None, None, None, Piece(Animal.CAT, Side.RED), None],
    # row 8: 红方底行（左到右：狗、狼、豹、兽穴、虎、象、狮）
    [Piece(Animal.DOG, Side.RED), Piece(Animal.WOLF, Side.RED), Piece(Animal.LEOPARD, Side.RED), None, Piece(Animal.TIGER, Side.RED), Piece(Animal.ELEPHANT, Side.RED), Piece(Animal.LION, Side.RED)],
]