import { SongsPage } from '../shared/SongsPage';
import { SONG_CATEGORY } from '../shared/categories';

export function ChinesePop() {
  return (
    <SongsPage
      courseId="ChineseSongs"
      category={SONG_CATEGORY.pop}
      titleKey="music.chinesePop.title"
      subtitleKey="music.chinesePop.subtitle"
    />
  )
}