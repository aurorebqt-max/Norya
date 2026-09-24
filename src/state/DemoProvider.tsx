import React, { createContext, useContext, useState } from "react";
type Store = {
  done: string[];
  complete: (id: string) => void;
  resolved: string[];
  resolve: (id: string) => void;
};
const Context = createContext<Store | null>(null);
export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState<string[]>([]);
  const [resolved, setResolved] = useState<string[]>([]);
  return (
    <Context.Provider
      value={{
        done,
        complete: (id) => setDone((v) => (v.includes(id) ? v : [...v, id])),
        resolved,
        resolve: (id) => setResolved((v) => (v.includes(id) ? v : [...v, id])),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error("DemoProvider required");
  return value;
}
