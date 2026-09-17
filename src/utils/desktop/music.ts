import { defaultMusicChannel, musicChannels, musicEmbedUrl, type MusicChannel } from "../../data/music";
import { safeWrap } from "../wrap";

const storageKey = "kasperrt-music-channel";

function readChannel() {
  const [error, saved] = safeWrap(() => localStorage.getItem(storageKey));
  if (error) {
    return new Error("Could not restore the music channel.", { cause: error });
  }
  return musicChannels.find((channel) => channel === saved) ?? defaultMusicChannel;
}

function saveChannel(channel: MusicChannel) {
  const [error] = safeWrap(() => localStorage.setItem(storageKey, channel));
  if (error) {
    return new Error("Could not save the music channel.", { cause: error });
  }
  return null;
}

export function initMusicPlayer(signal: AbortSignal) {
  const player = document.querySelector<HTMLElement>('[data-window="music"]');
  const frame = player?.querySelector<HTMLIFrameElement>("[data-app-frame]");
  if (!player || !frame) {
    return;
  }
  const buttons = player.querySelectorAll<HTMLButtonElement>("[data-music-channel]");

  const selectChannel = (channel: MusicChannel) => {
    const source = musicEmbedUrl(channel);
    frame.dataset.src = source;
    frame.title = `Zoff room ${channel}`;
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.musicChannel === channel));
    }
    // Closed windows stay unloaded until the desktop opens them again.
    if (frame.hasAttribute("src") && frame.getAttribute("src") !== source) {
      frame.src = source;
    }
  };

  const savedChannel = readChannel();
  if (savedChannel instanceof Error) {
    console.warn(savedChannel);
  }
  if (!(savedChannel instanceof Error)) {
    selectChannel(savedChannel);
  }

  for (const button of buttons) {
    button.addEventListener(
      "click",
      () => {
        const channel = musicChannels.find((candidate) => candidate === button.dataset.musicChannel);
        if (!channel) {
          return;
        }
        selectChannel(channel);
        const error = saveChannel(channel);
        if (error) {
          console.warn(error);
        }
      },
      { signal },
    );
  }
}
