import { SongsPage } from '../shared/SongsPage';
import { SONG_CATEGORY } from '../shared/categories';

export function EnglishNursery() {
  return (
    <SongsPage
      courseId="EnglishSongs"
      category={SONG_CATEGORY.nursery}
      titleKey="music.englishNursery.title"
      subtitleKey="music.englishNursery.subtitle"
    />
  )
}