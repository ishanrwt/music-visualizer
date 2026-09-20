export type TestTrack = {
  id: string
  name: string
  url: string
  albumArtUrl: string
  /** Path to a synced .lrc file. Omit if no lyrics are available for the track. */
  lyricsUrl?: string
}

export const TEST_TRACKS: TestTrack[] = [
  {
    id: 'e85',
    name: 'Don Toliver - E85',
    url: `/audio/${encodeURI('Don Toliver - E85 [Official Visualizer].mp3')}`,
    albumArtUrl: '/albums/e85.jpg',
    lyricsUrl: '/lyrics/e85.lrc',
  },
  {
    id: 'walk-it-talk-it',
    name: 'Migos - Walk It Talk It ft. Drake',
    url: `/audio/${encodeURI('Migos - Walk It Talk It ft. Drake (Audio) [A_xWDAbnBSU].mp3')}`,
    albumArtUrl: '/albums/walk-it-talk-it.png',
    lyricsUrl: '/lyrics/walk-it-talk-it.lrc',
  },
  {
    id: 'stronger',
    name: 'Stronger',
    url: `/audio/${encodeURI('Stronger [3mwiO5st-us].mp3')}`,
    albumArtUrl: '/albums/stronger.jpg',
    lyricsUrl: '/lyrics/stronger.lrc',
  },
  {
    id: 'stateside',
    name: 'PinkPantheress - Stateside + Zara Larsson',
    url: `/audio/${encodeURI('PinkPantheress - Stateside + Zara Larsson.mp3')}`,
    albumArtUrl: '/albums/stateside.jpg',
    lyricsUrl: '/lyrics/stateside.lrc',
  },
  {
    id: 'bass-drone',
    name: 'Bass Drone',
    url: '/audio/bass-drone.wav',
    albumArtUrl: '/albums/bass-drone.png',
  },
  {
    id: 'full-spectrum',
    name: 'Full Spectrum',
    url: '/audio/full-spectrum.wav',
    albumArtUrl: '/albums/full-spectrum.png',
  },
]
