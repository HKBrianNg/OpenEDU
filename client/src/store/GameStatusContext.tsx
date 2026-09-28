import React, { createContext, useContext, useState, useCallback } from 'react';

interface GameStatusContextValue {
  activeGame: string | null;
  setActiveGame: (name: string | null) => void;
  exitGame: () => void;
}

const GameStatusContext = createContext<GameStatusContextValue>({
  activeGame: null,
  setActiveGame: () => {},
  exitGame: () => {},
});

export const GameStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const exitGame = useCallback(() => {
    setActiveGame(null);
  }, []);

  return (
    <GameStatusContext.Provider value={{ activeGame, setActiveGame, exitGame }}>
      {children}
    </GameStatusContext.Provider>
  );
};

export const useGameStatus = () => useContext(GameStatusContext);