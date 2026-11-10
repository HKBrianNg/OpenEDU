import { SongsPage } from '../shared/SongsPage';
import { SONG_CATEGORY } from '../shared/categories';

export function EnglishPop() {
  return (
    <SongsPage
      courseId="EnglishSongs"
      category={SONG_CATEGORY.pop}
      titleKey="music.englishPop.title"
      subtitleKey="music.englishPop.subtitle"
    />
  )
}
