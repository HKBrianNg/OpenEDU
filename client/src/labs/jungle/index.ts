console.log('jungle lab registering...');
import LabManager from '../../utils/LabManager';
import type { LabEntry } from '../../utils/LabManager';
import JungleLab from './JungleLab';

const selfplayEntry: LabEntry = {
  id: 'jungle.selfplay',
  title: (t: (key: string) => string) => t('lab.jungle.title'),
  description: (t: (key: string) => string) => t('lab.jungle.desc'),
  icon: '🤖',
  component: JungleLab,
};

LabManager.register(selfplayEntry);

export default JungleLab;