from enum import IntEnum
from typing import Optional, NamedTuple

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

Pos = tuple[int, int]  # (row, col)
Board = list[list[Optional[Piece]]]
Move = tuple[Pos, Pos]  # (from, to)

ROWS = 9
COLS = 7

DEN_RED = (0, 3)
DEN_BLUE = (8, 3)

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

# 初始棋盘
INITIAL_BOARD: Board = [
    [Piece(Animal.ELEPHANT, Side.RED), Piece(Animal.LION, Side.RED), Piece(Animal.LEOPARD, Side.RED), None, Piece(Animal.WOLF, Side.RED), Piece(Animal.DOG, Side.RED), Piece(Animal.CAT, Side.RED)],
    [None, Piece(Animal.RAT, Side.RED), None, None, None, Piece(Animal.TIGER, Side.RED), None],
    [None, None, None, None, None, None, None],
    [None, None, None, None, None, None, None],
    [None, None, None, None, None, None, None],
    [None, None, None, None, None, None, None],
    [None, None, None, None, None, None, None],
    [None, Piece(Animal.TIGER, Side.BLUE), None, None, None, Piece(Animal.RAT, Side.BLUE), None],
    [Piece(Animal.CAT, Side.BLUE), Piece(Animal.DOG, Side.BLUE), Piece(Animal.WOLF, Side.BLUE), None, Piece(Animal.LEOPARD, Side.BLUE), Piece(Animal.LION, Side.BLUE), Piece(Animal.ELEPHANT, Side.BLUE)],
]