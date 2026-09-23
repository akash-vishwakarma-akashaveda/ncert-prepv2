import React, { createContext, useContext } from 'react';
import { useCatalog } from '../hooks/useCatalog';

type Catalog = ReturnType<typeof useCatalog>;

const CatalogContext = createContext<Catalog | undefined>(undefined);

// Loads the catalogue once for every route instead of per page.
export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CatalogContext.Provider value={useCatalog()}>{children}</CatalogContext.Provider>
);

export const useCatalogContext = (): Catalog => {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalogContext must be used within a CatalogProvider');
  return ctx;
};
