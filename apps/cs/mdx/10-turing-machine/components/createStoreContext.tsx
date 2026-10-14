import { createContext, type ReactNode, useContext, useState } from "react";
import type { StoreApi, UseBoundStore } from "zustand";

export function createStoreContext<TState>(
  createStore: () => UseBoundStore<StoreApi<TState>>,
) {
  const StoreContext =
    createContext<UseBoundStore<StoreApi<TState>>>(createStore());

  const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [useStore] = useState(createStore);
    return (
      <StoreContext.Provider value={useStore}>{children}</StoreContext.Provider>
    );
  };

  const useStore = () => {
    const store = useContext(StoreContext);
    return store();
  };

  return [StoreProvider, useStore] as const;
}
