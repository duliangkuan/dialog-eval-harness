'use client';

import { useState } from 'react';
import { Sidebar } from './layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Intents } from './pages/Intents';
import { TestSets } from './pages/TestSets';
import { Experiments } from './pages/Experiments';
import { Results } from './pages/Results';
import { Evaluators } from './pages/Evaluators';
import { Debug } from './pages/Debug';
import { Visualization } from './pages/Visualization';
import { Models } from './pages/Models';
import { EmptyState } from './ui';
import { AppProvider } from '@/lib/store/AppContext';

type PageKey =
  | 'dashboard'
  | 'intents'
  | 'testsets'
  | 'experiments'
  | 'results'
  | 'evaluators'
  | 'debug'
  | 'visualization'
  | 'models';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');

  const handleNavigate = (page: string) => setCurrentPage(page as PageKey);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'intents':
        return <Intents />;
      case 'testsets':
        return <TestSets />;
      case 'experiments':
        return <Experiments onNavigate={handleNavigate} />;
      case 'results':
        return <Results />;
      case 'evaluators':
        return <Evaluators />;
      case 'debug':
        return <Debug />;
      case 'visualization':
        return <Visualization />;
      case 'models':
        return <Models />;
      default:
        return <EmptyState text="页面建设中..." />;
    }
  };

  return (
    <AppProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '32px 40px',
          }}
        >
          {renderPage()}
        </main>
      </div>
    </AppProvider>
  );
}
