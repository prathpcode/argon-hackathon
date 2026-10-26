"use client";

import { useEffect, useRef, useState } from "react";
import { ytThumb } from "@/lib/links";

/**
 * One YouTube player that stays mounted and loops start–end. Moving to another moment seeks (or swaps the
 * video) over the iframe API's postMessage protocol instead of reloading the player, which is what made it lag.
 * The cover stays on top until the player reports it is playing.
 */
export function YtClip({ id, start, end, title }: { id: string; start: number; end: number; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const readyRef = useRef(false);
  readyRef.current = ready;
  const loaded = useRef(id); // the video the player has
  const clip = useRef({ start, end });
  clip.current = { start, end };
  // The first video and start go in the URL; later moments are sent to the same player.
  const [src] = useState(() => `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&autoplay=1&mute=1&rel=0&playsinline=1&iv_load_policy=3&start=${Math.floor(start)}`);

  const send = (func: string, args: unknown[] = []) =>
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || typeof e.data !== "string") return;
      let m: { event?: string; info?: { playerState?: number; currentTime?: number } };
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.event === "onReady" || m.event === "initialDelivery") setReady(true);
      const info = m.info;
      if (!info) return;
      if (info.playerState === 1) setPlaying(true);
      const { start, end } = clip.current;
      // Loop the moment; an ended video (state 0) also goes back to the start.
      if ((info.currentTime !== undefined && info.currentTime >= end) || info.playerState === 0) {
        send("seekTo", [start, true]);
        send("playVideo");
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (loaded.current !== id) {
      loaded.current = id;
      setPlaying(false);
      send("loadVideoById", [{ videoId: id, startSeconds: start }]);
    } else {
      send("seekTo", [start, true]);
      send("playVideo");
    }
  }, [ready, id, start]);

  // Ask the player to report its state; it ignores this until it has loaded, so repeat until it answers.
  function listen() {
    let n = 0;
    const tick = () => {
      frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
      if (++n < 20 && !readyRef.current) setTimeout(tick, 250);
    };
    tick();
  }
  return (
    <>
      <iframe ref={frame} src={src} title={title} onLoad={listen} referrerPolicy="strict-origin-when-cross-origin"
        allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      <img className={`yt-cover${playing ? " gone" : ""}`} src={ytThumb(id)} alt="" />
    </>
  );
}
