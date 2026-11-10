import { SongsPage } from '../shared/SongsPage';
import { SONG_CATEGORY } from '../shared/categories';

export function ChineseNursery() {
  return (
    <SongsPage
      courseId="ChineseSongs"
      category={SONG_CATEGORY.nursery}
      titleKey="music.chineseNursery.title"
      subtitleKey="music.chineseNursery.subtitle"
    />
  )
}