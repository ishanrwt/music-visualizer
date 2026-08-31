export type TestTrack = {
  id: string
  name: string
  url: string
  albumArtUrl: string
}

export const TEST_TRACKS: TestTrack[] = [
  {
    id: 'stateside',
    name: 'PinkPantheress - Stateside + Zara Larsson',
    url: `/audio/${encodeURI('PinkPantheress - Stateside + Zara Larsson.mp3')}`,
    albumArtUrl: '/albums/stateside.png',
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
