'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import {
  Intent,
  IntentVersion,
  TestSet,
  Evaluator,
  ModelConfig,
  Experiment,
} from '../backend/types';
import {
  MOCK_INTENTS,
  MOCK_INTENT_VERSIONS,
  MOCK_TEST_SETS,
  MOCK_EVALUATORS,
  MOCK_MODELS,
  MOCK_EXPERIMENTS,
} from './mock-data';

interface AppState {
  intents: Intent[];
  intentVersions: IntentVersion[];
  testSets: TestSet[];
  evaluators: Evaluator[];
  models: ModelConfig[];
  experiments: Experiment[];
  selectedExperimentId: string | null;
  setSelectedExperimentId: (id: string | null) => void;
  addIntent: (intent: Intent) => void;
  updateIntent: (id: string, data: Partial<Intent>) => void;
  deleteIntent: (id: string) => void;
  addIntentVersion: (version: IntentVersion) => void;
  updateIntentVersion: (id: string, data: Partial<IntentVersion>) => void;
  deleteIntentVersion: (id: string) => void;
  addTestSet: (testSet: TestSet) => void;
  updateTestSet: (id: string, data: Partial<TestSet>) => void;
  deleteTestSet: (id: string) => void;
  addEvaluator: (evaluator: Evaluator) => void;
  updateEvaluator: (id: string, data: Partial<Evaluator>) => void;
  deleteEvaluator: (id: string) => void;
  addModel: (model: ModelConfig) => void;
  deleteModel: (id: string) => void;
  addExperiment: (experiment: Experiment) => void;
  updateExperiment: (id: string, data: Partial<Experiment>) => void;
  deleteExperiment: (id: string) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [intents, setIntents] = useState<Intent[]>(MOCK_INTENTS);
  const [intentVersions, setIntentVersions] = useState<IntentVersion[]>(MOCK_INTENT_VERSIONS);
  const [testSets, setTestSets] = useState<TestSet[]>(MOCK_TEST_SETS);
  const [evaluators, setEvaluators] = useState<Evaluator[]>(MOCK_EVALUATORS);
  const [models, setModels] = useState<ModelConfig[]>(MOCK_MODELS);
  const [experiments, setExperiments] = useState<Experiment[]>(MOCK_EXPERIMENTS);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);

  const addIntent = (intent: Intent) => setIntents((prev) => [intent, ...prev]);
  const updateIntent = (id: string, data: Partial<Intent>) =>
    setIntents((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
  const deleteIntent = (id: string) => setIntents((prev) => prev.filter((i) => i.id !== id));

  const addIntentVersion = (version: IntentVersion) => setIntentVersions((prev) => [version, ...prev]);
  const updateIntentVersion = (id: string, data: Partial<IntentVersion>) =>
    setIntentVersions((prev) => prev.map((v) => (v.id === id ? { ...v, ...data } : v)));
  const deleteIntentVersion = (id: string) => setIntentVersions((prev) => prev.filter((v) => v.id !== id));

  const addTestSet = (testSet: TestSet) => setTestSets((prev) => [testSet, ...prev]);
  const updateTestSet = (id: string, data: Partial<TestSet>) =>
    setTestSets((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
  const deleteTestSet = (id: string) => setTestSets((prev) => prev.filter((t) => t.id !== id));

  const addEvaluator = (evaluator: Evaluator) => setEvaluators((prev) => [evaluator, ...prev]);
  const updateEvaluator = (id: string, data: Partial<Evaluator>) =>
    setEvaluators((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
  const deleteEvaluator = (id: string) => setEvaluators((prev) => prev.filter((e) => e.id !== id));

  const addModel = (model: ModelConfig) => setModels((prev) => [model, ...prev]);
  const deleteModel = (id: string) => setModels((prev) => prev.filter((m) => m.id !== id));

  const addExperiment = (experiment: Experiment) => setExperiments((prev) => [experiment, ...prev]);
  const updateExperiment = (id: string, data: Partial<Experiment>) =>
    setExperiments((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
  const deleteExperiment = (id: string) => setExperiments((prev) => prev.filter((e) => e.id !== id));

  return (
    <AppContext.Provider
      value={{
        intents,
        intentVersions,
        testSets,
        evaluators,
        models,
        experiments,
        selectedExperimentId,
        setSelectedExperimentId,
        addIntent,
        updateIntent,
        deleteIntent,
        addIntentVersion,
        updateIntentVersion,
        deleteIntentVersion,
        addTestSet,
        updateTestSet,
        deleteTestSet,
        addEvaluator,
        updateEvaluator,
        deleteEvaluator,
        addModel,
        deleteModel,
        addExperiment,
        updateExperiment,
        deleteExperiment,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
