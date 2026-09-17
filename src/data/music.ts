export const musicChannels = ["trip", "electro", "fred"] as const;
export type MusicChannel = (typeof musicChannels)[number];
export const defaultMusicChannel: MusicChannel = "trip";

export function musicEmbedUrl(channel: MusicChannel) {
  return `https://zoff.me/embed/${channel}?player=true&autoplay=true&playlist=false&skip=false&vote=false&theme=light`;
}
