import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Lightbox, type LightboxItem } from './Lightbox';

interface OpenArgs {
  items: LightboxItem[];
  index: number;
  title?: string;
}

type OpenLightbox = (args: OpenArgs) => void;

const LightboxContext = createContext<OpenLightbox>(() => {});

export const useLightbox = () => useContext(LightboxContext);

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ items: LightboxItem[]; index: number; title?: string } | null>(null);

  const open = useCallback<OpenLightbox>((args) => setState(args), []);
  const close = useCallback(() => setState(null), []);
  const navigate = useCallback((index: number) => setState((prev) => (prev ? { ...prev, index } : prev)), []);

  const value = useMemo(() => open, [open]);

  return (
    <LightboxContext.Provider value={value}>
      {children}
      <Lightbox
        items={state?.items ?? []}
        index={state ? state.index : null}
        title={state?.title}
        onClose={close}
        onNavigate={navigate}
      />
    </LightboxContext.Provider>
  );
}
