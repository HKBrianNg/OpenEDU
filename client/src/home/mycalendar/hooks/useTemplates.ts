import { useEffect, useState } from 'react';
import type { TemplateItem } from '../types';
import { loadTemplates } from '../api';

export const useTemplates = () => {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates()
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch((err) => console.warn('CalendarTemplate.json 加载失败', err))
      .finally(() => setLoading(false));
  }, []);

  return { templates, loading };
};