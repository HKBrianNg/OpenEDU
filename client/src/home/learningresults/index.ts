// client/src/home/learningresults/index.ts
import HomeManager from '../../utils/HomeManager';
import type { HomeEntry } from '../../utils/HomeManager';
import LearningResults from './LearningResults';

const LearningResultsEntry: HomeEntry = {
  id: 'LearningResults',
  title: (t: (key: string) => string) => t('learningresults.title'),
  description: (t: (key: string) => string) => t('learningresults.description'),
  icon: '🏆',
  component: LearningResults,
};

HomeManager.register(LearningResultsEntry);

export default LearningResults;
