import { createContext, ReactNode, useContext } from 'react';

export type ShellSubnavApi = {
  setSubnav: (node: ReactNode) => void;
};

export const ShellSubnavContext = createContext<ShellSubnavApi | null>(null);

export function useShellSubnav(): ShellSubnavApi {
  const value = useContext(ShellSubnavContext);
  if (!value) throw new Error('useShellSubnav must be used within ShellSubnavContext');
  return value;
}
