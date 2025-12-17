import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  pageLoadingStates: Record<string, boolean>;
  actionLoadingStates: Record<string, boolean>;
  setPageLoading: (pageId: string, isLoading: boolean) => void;
  setActionLoading: (actionId: string, isLoading: boolean) => void;
  isAnyPageLoading: () => boolean;
  isPageLoading: (pageId: string) => boolean;
  isActionLoading: (actionId: string) => boolean;
  isAnyActionLoading: () => boolean;
  clearActionLoading: (actionId: string) => void;
  clearAllActionLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [pageLoadingStates, setPageLoadingStates] = useState<Record<string, boolean>>({});
  const [actionLoadingStates, setActionLoadingStates] = useState<Record<string, boolean>>({});

  const setPageLoading = (pageId: string, isLoading: boolean) => {
    setPageLoadingStates(prev => ({
      ...prev,
      [pageId]: isLoading
    }));
  };

  const setActionLoading = (actionId: string, isLoading: boolean) => {
    setActionLoadingStates(prev => {
      if (isLoading) {
        return {
          ...prev,
          [actionId]: true
        };
      } else {
        const newState = { ...prev };
        delete newState[actionId];
        return newState;
      }
    });
  };

  const isAnyPageLoading = () => {
    return Object.values(pageLoadingStates).some(loading => loading);
  };

  const isPageLoading = (pageId: string) => {
    return pageLoadingStates[pageId] || false;
  };

  const isActionLoading = (actionId: string) => {
    return actionLoadingStates[actionId] || false;
  };

  const isAnyActionLoading = () => {
    return Object.values(actionLoadingStates).some(loading => loading);
  };

  const clearActionLoading = (actionId: string) => {
    setActionLoadingStates(prev => {
      const newState = { ...prev };
      delete newState[actionId];
      return newState;
    });
  };

  const clearAllActionLoading = () => {
    setActionLoadingStates({});
  };

  return (
    <LoadingContext.Provider value={{
      pageLoadingStates,
      actionLoadingStates,
      setPageLoading,
      setActionLoading,
      isAnyPageLoading,
      isPageLoading,
      isActionLoading,
      isAnyActionLoading,
      clearActionLoading,
      clearAllActionLoading
    }}>
      {children}
    </LoadingContext.Provider>
  );
};
