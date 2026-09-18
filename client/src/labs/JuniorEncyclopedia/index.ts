import LabManager from '../../utils/LabManager';
import type { LabEntry } from '../../utils/LabManager';
import JuniorEncyclopediaLab from './JuniorEncyclopediaLab';

const juniorEncyclopediaEntry: LabEntry = {
  id: 'JuniorEncyclopediaLab',
  title: (t: (key: string) => string) => t('lab.juniorEncyclopedia.title'),
  description: (t: (key: string) => string) => t('lab.juniorEncyclopedia.description'),
  icon: '🤖',
  component: JuniorEncyclopediaLab,
};

LabManager.register(juniorEncyclopediaEntry);

export default JuniorEncyclopediaLab;