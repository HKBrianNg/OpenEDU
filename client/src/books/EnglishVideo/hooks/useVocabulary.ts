// client/src/books/EnglishVideo/hooks/useVocabulary.ts
//
// 加载生字表 vocabulary.json。
// 文件不存在（年级还没生成生字表）时退化成空数组，不影响其它功能。

import { useEffect, useState } from 'react';
import { getCourseAssetUrl } from '../../../utils/coursePath';
import type { VocabularyFile, VocabularyWord } from '../types';

const COURSE_ID = 'EnglishVideo';

export function useVocabulary(dir: string) {
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dir) return;
    let cancelled = false;
    setLoading(true);

    fetch(getCourseAssetUrl(COURSE_ID, `${dir}/vocabulary.json`))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VocabularyFile | null) => {
        if (!cancelled) setWords(data?.words || []);
      })
      .catch(() => {
        if (!cancelled) setWords([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dir]);

  return { words, loading };
}
