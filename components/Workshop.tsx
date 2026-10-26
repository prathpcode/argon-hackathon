"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Braces, Brain, Check, ChevronLeft, ChevronRight, ClipboardList, Eye, FilePen, FilePlus, FileText, Film, FolderSearch, Gamepad2, Globe, Hammer,
  Keyboard, ListPlus, MessageSquare, Search, Video, Pause, Play, RotateCw, Scale, ShieldCheck, Sparkles, Users, Wrench, X, type LucideIcon,
} from "lucide-react";
import { clock, compact, duration } from "@/lib/format";
import { youtubeId } from "@/lib/links";
import { YtClip } from "./YtClip";
import type { Act, Agent, RunState, StageState, Verify, VerifyRule } from "@/lib/run-types";

const TOOL_ICON: Record<string, LucideIcon> = {
  read: FileText, write: FilePlus, edit: FilePen, ls: FolderSearch, find: FolderSearch, grep: FolderSearch,
  check_game: ShieldCheck, open_game: Gamepad2, input: Keyboard, look: Eye, inspect: Braces, ask_footage: Film, report: ClipboardList,
  search: Search, verify: Video,
};

/** One line on what an agent is doing right now, from its latest step, so a working agent never shows a placeholder. */
function doing(a: Agent): string {
  const tool = [...a.acts].reverse().find((x) => x.kind === "tool" && x.status === "running");
  if (tool?.label) return tool.label;
  const last = a.acts.at(-1);
  if (!last) return a.brief;
  if (last.kind === "think") return last.title || last.text || a.brief;
  if (last.kind === "note") return `Found ${last.text}`;
  if (last.kind === "say") return last.text ?? a.brief;
  return last.label ?? a.brief;
}
const FOCUS_ICON = { fun: Sparkles, faithful: Scale, together: Users } as const;

function agentIcon(a: Agent): LucideIcon {
  if (a.role === "tester") return FOCUS_ICON[a.focus ?? "fun"] ?? Gamepad2;
  return { researcher: Globe, watcher: Eye, builder: Hammer, fixer: Wrench, verifier: Film, squad: Gamepad2 }[a.role] ?? Hammer;
}

const file = (run: RunState, p: string) => `/api/revivals/${run.id}/file?p=${encodeURIComponent(p)}`;

/** The three phases people see; the pipeline's four stages fold into them. */
function phases(run: RunState) {
  const { find, watch, build, playtest } = run.stages;
  const collect: StageState =
    find.status === "error" || watch.status === "error" ? { status: "error", detail: watch.detail ?? find.detail }
    : watch.status === "done" ? { status: "done", detail: watch.detail, startedAt: find.startedAt, endedAt: watch.endedAt }
    : find.status === "waiting" ? { status: "waiting" }
    : { status: "running", detail: find.status === "running" ? "Finding footage" : "Watching the footage", startedAt: find.startedAt };
  const r = run.rounds.at(-1);
  const playDetail = playtest.status === "running" && r ? `${r.status === "fixing" ? "Fixing" : r.status === "testing" ? "Agents reviewing" : "Reviewed"}${run.rounds.length > 1 ? ` · ${r.round}` : ""}` : playtest.detail;
  return [
    { key: "collect", name: "Collect", state: collect },
    { key: "remake", name: "Remake", state: build },
    { key: "playtest", name: "Playtest", state: { ...playtest, detail: playDetail } },
  ] as const;
}

type PhaseKey = ReturnType<typeof phases>[number]["key"];
const PHASE_STAGES: Record<PhaseKey, string[]> = { collect: ["find", "watch"], remake: ["build"], playtest: ["playtest"] };
const phaseOf = (a: Agent) => (Object.keys(PHASE_STAGES) as PhaseKey[]).find((k) => PHASE_STAGES[k].includes(a.stage)) ?? null;

export function Workshop({ initial }: { initial: RunState }) {
  const [run, setRun] = useState(initial);
  const [now, setNow] = useState(() => Date.now() / 1000);
  const [pinned, setPinned] = useState<string | null>(null);
  const [tab, setTab] = useState<PhaseKey | "parity" | null>(null);
  const [busy, setBusy] = useState(false);
  const live = run.status === "running";

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const res = await fetch(`/api/revivals/${run.id}`, { cache: "no-store" }).catch(() => null);
      if (!stop && res?.ok) setRun(await res.json());
    };
    const poll = setInterval(tick, live ? 1500 : 8000);
    const clockTimer = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => {
      stop = true;
      clearInterval(poll);
      clearInterval(clockTimer);
    };
  }, [run.id, live]);

  // Follow whoever is working, most recently active first, unless an agent is pinned.
  const followed = useMemo(() => {
    const working = run.agents.filter((a) => a.status === "running").sort((a, b) => b.updatedAt - a.updatedAt);
    return working[0] ?? [...run.agents].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
  }, [run.agents]);
  // A phase tab shows that phase's agents: the pinned one, else whoever there worked last.
  const inTab = tab ? run.agents.filter((a) => phaseOf(a) === tab) : [];
  const tabLead = [...inTab].sort((a, b) => (a.status === "running" ? 1 : 0) - (b.status === "running" ? 1 : 0) || a.updatedAt - b.updatedAt).at(-1) ?? null;
  const focus = (pinned && run.agents.find((a) => a.id === pinned)) || (tab ? tabLead : followed);
  const pick = (id: string) => {
    const a = run.agents.find((x) => x.id === id);
    setPinned(id);
    setTab(a ? phaseOf(a) : null);
  };
  const followLive = () => {
    setPinned(null);
    setTab(null);
  };
  const working = run.agents.filter((a) => a.status === "running");
  const check = parityCheck(run);
  const tokens = run.agents.reduce((n, a) => n + (a.tokens_in ?? 0) + (a.tokens_out ?? 0), 0);
  // A paused run's clocks stop at its last event; the log still says its agents are running.
  const clockAt = live ? now : (run.updatedAt ?? now);
  const elapsed = run.startedAt ? clockAt - run.startedAt : 0;

  async function control(action: "resume" | "stop" | "play") {
    setBusy(true);
    const tab = action === "play" ? window.open("", "_blank") : null;
    const res = await fetch(`/api/revivals/${run.id}/control`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const data = await res.json().catch(() => ({}));
    if (tab) {
      if (data.port) tab.location.href = `http://${location.hostname}:${data.port}/?name=Player`;
      else tab.close();
    }
    setBusy(false);
    if (action !== "play") setRun({ ...run, status: action === "resume" ? "running" : "stopped" });
  }

  return (
    <div className="workshop">
      <header className="ws-head">
        <div className="ws-title">
          <h1>{run.revival.name}</h1>
          <p>
            {run.title ? <>Revived as <b>{run.title}</b> · </> : null}
            {run.startedAt ? duration(elapsed) : "Not started"}
            {tokens > 0 && <> · {compact(tokens)} tokens</>}
            {live && working.length > 0 && <> · <span className="live-count"><i className="pulse" aria-hidden /> {working.length} at work</span></>}
          </p>
        </div>
        <div className="ws-actions">
          {live ? (
            <button className="btn-ghost" onClick={() => control("stop")} disabled={busy}><Pause aria-hidden /> Pause</button>
          ) : run.status !== "done" ? (
            <button className="btn-ghost" onClick={() => control("resume")} disabled={busy}><RotateCw aria-hidden /> {run.startedAt ? "Resume" : "Start"}</button>
          ) : null}
          {run.hasGame && <button className="btn-violet" onClick={() => control("play")} disabled={busy}><Play aria-hidden /> Play</button>}
        </div>
      </header>

      <div className={`phases${check ? " with-parity" : ""}`} role="tablist" aria-label="Phases">
        {phases(run).map((p, i) => {
          const t = p.state.startedAt ? (p.state.endedAt && p.state.status !== "running" ? p.state.endedAt : clockAt) - p.state.startedAt : null;
          // Collect can be done with no agent in the log (footage kept from an earlier run); its tab then shows the footage.
          const has = run.agents.some((a) => phaseOf(a) === p.key) || (p.key === "collect" && run.footageList.length > 0);
          const selected = (tab ?? (focus ? phaseOf(focus) : null)) === p.key;
          return (
            <button key={p.key} role="tab" aria-selected={selected} disabled={!has} className={`phase ${p.state.status}`}
              onClick={() => { setPinned(null); setTab(p.key); }}>
              <span className="phase-no">{p.state.status === "done" ? <Check aria-hidden /> : p.state.status === "error" ? <X aria-hidden /> : i + 1}</span>
              <div>
                <b>{p.name}</b>
                <span>{p.state.detail && p.state.detail !== "kept from the last run" ? p.state.detail : p.state.status === "waiting" ? "Waiting" : p.state.status === "done" ? "Done" : "Working"}{t && p.state.status === "running" ? ` · ${duration(t)}` : ""}</span>
              </div>
            </button>
          );
        })}
        {check && (
          <button role="tab" aria-selected={tab === "parity"} className="phase parity" onClick={() => { setPinned(null); setTab("parity"); }}>
            <span className="phase-no"><Scale aria-hidden /></span>
            <div>
              <b>Parity</b>
              <span>Original beside revival</span>
            </div>
          </button>
        )}
      </div>

      {run.error && !live && (
        <div className="error-card">
          <AlertTriangle aria-hidden />
          <span>{run.error}</span>
          <button className="btn-ghost" onClick={() => control("resume")} disabled={busy}>Resume</button>
        </div>
      )}

      <div className="ws-grid">
        <div className="ws-main">
          {tab === "parity" && check ? <ParityView key={check.round} run={run} check={check} /> : tab === "collect" && !inTab.length ? <CollectView run={run} /> : <>
          {working.filter((a) => a.shot).length > 1 && (
            <div className="wall">
              {working.filter((a) => a.shot).map((a) => (
                <button key={a.id} className="wall-tile" aria-pressed={focus?.id === a.id} onClick={() => pick(a.id)}>
                  <Screen src={a.live?.length ? `${file(run, a.live[0])}&v=${Math.floor(now)}` : file(run, a.shot!)} />
                  <span className="wall-name">{a.name}</span>
                </button>
              ))}
            </div>
          )}
          {tab && inTab.length > 1 && (
            <div className="tab-agents" role="group" aria-label="Agents in this phase">
              {inTab.map((a) => {
                const Icon = agentIcon(a);
                return (
                  <button key={a.id} className={`tab-agent ${a.status}`} aria-pressed={focus?.id === a.id} onClick={() => setPinned(a.id)}>
                    <Icon aria-hidden /> {a.name}{a.round && run.rounds.length > 1 ? ` · ${a.round}` : ""}
                  </button>
                );
              })}
            </div>
          )}
          {focus ? <Desk key={focus.id} run={run} agent={focus} now={clockAt} following={!pinned && !tab} onFollow={followLive} /> : <p className="empty-note">The agents start in a moment.</p>}
          </>}
        </div>
        <aside className="ws-side">
          <Roster run={run} focus={focus?.id ?? null} now={clockAt} onPick={pick} />
          <AgentReview run={run} onPick={pick} onParity={check ? () => { setPinned(null); setTab("parity"); } : undefined} />
          <FootageList run={run} />
        </aside>
      </div>
    </div>
  );
}

/** The game as it plays: each player's screencast frame, refetched a few times a second. */
function LiveScreen({ run, frames, doing }: { run: RunState; frames: string[]; doing?: string }) {
  const [player, setPlayer] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 300);
    return () => clearInterval(t);
  }, []);
  const p = Math.min(player, frames.length - 1);
  const src = (f: string) => `${file(run, f)}&v=${tick}`;
  return (
    <div className="desk-screen live">
      <Screen src={src(frames[p])} alt={`Player ${p + 1}, live`} />
      <span className="live-badge"><i aria-hidden /> Live{frames.length > 1 ? ` · Player ${p + 1}` : ""}</span>
      {doing && <div className="now-doing"><i className="pulse" aria-hidden /> {doing}</div>}
      {frames.length > 1 && (
        <div className="players">
          {frames.map((f, i) => (
            <button key={f} aria-pressed={i === p} onClick={() => setPlayer(i)} aria-label={`Watch player ${i + 1}`}>
              <img src={`${file(run, f)}&v=${Math.floor(tick / 3)}`} alt="" />
              <span>P{i + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** A screen that crossfades to each new frame once it has loaded, so live play reads as motion, not flicker. */
function Screen({ src, alt = "" }: { src: string; alt?: string }) {
  const [frames, setFrames] = useState<{ cur: string; prev: string | null }>({ cur: src, prev: null });
  useEffect(() => {
    if (src === frames.cur) return;
    const img = new Image();
    img.onload = () => setFrames((f) => ({ cur: src, prev: f.cur }));
    img.src = src;
  }, [src, frames.cur]);
  return (
    <div className="screen">
      {frames.prev && <img src={frames.prev} alt="" aria-hidden />}
      <img key={frames.cur} src={frames.cur} alt={alt} className="screen-in" />
    </div>
  );
}

function Desk({ run, agent: a, now, following, onFollow }: { run: RunState; agent: Agent; now: number; following: boolean; onFollow: () => void }) {
  const [scrub, setScrub] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const codeAct = (pick && a.acts.find((x) => x.id === pick)) || [...a.acts].reverse().find((x) => x.code);
  const feed = useRef<HTMLOListElement>(null);
  const stick = useRef(true);
  const Icon = agentIcon(a);
  const secs = a.status === "running" ? now - a.startedAt : a.secs ?? 0;
  const current = [...a.acts].reverse().find((x) => x.kind === "tool" && x.status === "running");
  const shot = scrub ?? a.shot;
  const report = a.role === "tester" && a.round ? run.rounds.find((r) => r.round === a.round)?.reports.find((r) => r.tester === a.focus) : undefined;

  useLayoutEffect(() => {
    const el = feed.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [a.acts.length, a.acts.at(-1)?.status]);

  return (
    <section className={`desk ${a.status}`}>
      <div className="desk-head">
        <span className="desk-icon"><Icon aria-hidden /></span>
        <div className="desk-who">
          <b>{a.name}{a.round && run.rounds.length > 1 ? <i> · round {a.round}</i> : null}</b>
          <span>{a.brief}</span>
        </div>
        <div className="desk-state">
          {a.status === "running" ? <><i className="pulse" aria-hidden /> {duration(secs)}</> : a.status === "done" ? <><Check aria-hidden /> {duration(secs)}</> : <><X aria-hidden /> Stopped</>}
          {following ? <span className="follow on">Following live</span> : <button className="follow" onClick={onFollow}>Follow live</button>}
        </div>
      </div>

      {a.status === "running" && a.live?.length && !scrub ? (
        <LiveScreen run={run} frames={a.live} doing={current?.label} />
      ) : shot ? (
        <div className="desk-screen">
          <Screen src={file(run, shot)} alt={`What ${a.name} sees`} />
          {current && !scrub && <div className="now-doing"><i className="pulse" aria-hidden /> {current.label}</div>}
          {scrub && <button className="back-live" onClick={() => setScrub(null)}>Back to live</button>}
        </div>
      ) : a.role === "watcher" || a.role === "researcher" ? (
        <FootageWall run={run} active={a.status === "running"} agent={a} />
      ) : (
        <div className="desk-screen blank">
          <span>{a.status === "running" ? <><i className="pulse" aria-hidden /> {doing(a)}</> : a.detail ?? doing(a)}</span>
        </div>
      )}

      {a.status === "running" && <LiveThought run={run} agent={a} />}
      {codeAct?.code && <CodeView key={codeAct.id} run={run} act={codeAct} live={!pick} onLive={() => setPick(null)} />}

      {report && <ReportCard report={report} />}

      {a.acts.length > 0 && (
        <ol className="feed" ref={feed} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}>
          {a.actCount > a.acts.length && <li className="feed-more">{a.actCount - a.acts.length} earlier steps</li>}
          {a.acts.map((x) => <FeedRow key={x.id} act={x} start={a.startedAt} run={run} active={scrub === x.img} onShot={setScrub} picked={codeAct?.id === x.id} onCode={() => setPick(x.id)} />)}
        </ol>
      )}

      {a.videos?.length ? (
        <div className="replays">
          {a.videos.map((v, i) => (
            <figure key={v}>
              <video src={file(run, v)} controls muted playsInline preload="metadata" />
              <figcaption>Player {i + 1}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FeedRow({ act: x, start, run, active, onShot, picked, onCode }: { act: Act; start: number; run: RunState; active: boolean; onShot: (img: string) => void; picked: boolean; onCode: () => void }) {
  const at = clock(Math.max(0, x.t - start));
  if (x.kind === "think") {
    return (
      <li className="row think">
        <time>{at}</time>
        <Brain aria-hidden />
        <details className="row-text">
          <summary>{x.title || "Reasoning"}</summary>
          {x.text && <p>{x.text}</p>}
        </details>
      </li>
    );
  }
  if (x.kind === "note") {
    return (
      <li className="row note">
        <time>{at}</time>
        <ListPlus aria-hidden />
        <div className="row-text"><span>{x.text}</span></div>
      </li>
    );
  }
  if (x.kind === "say") {
    return (
      <li className="row say">
        <time>{at}</time>
        <MessageSquare aria-hidden />
        <p>{x.text}</p>
      </li>
    );
  }
  const Icon = TOOL_ICON[x.tool ?? ""] ?? Braces;
  return (
    <li className={`row ${x.status ?? ""} t-${x.tool}`}>
      <time>{at}</time>
      <Icon aria-hidden />
      {x.code ? (
        <button className="row-text row-code" aria-pressed={picked} onClick={onCode} title="Show the code">
          <span>{x.label}</span>
          {x.detail && <small>{x.detail}</small>}
        </button>
      ) : (
        <div className="row-text">
          <span>{x.label}</span>
          {x.detail && <small>{x.detail}</small>}
        </div>
      )}
      {x.img && (
        <button className="row-shot" aria-pressed={active} onClick={() => onShot(x.img!)} aria-label="Show this frame">
          <img src={file(run, x.img)} alt="" loading="lazy" />
        </button>
      )}
    </li>
  );
}

/** Poll a run file while `on`; null until it exists. */
function usePolled<T>(url: string, ms: number, on = true): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    if (!on) return;
    let stop = false;
    const tick = async () => {
      const res = await fetch(url, { cache: "no-store" }).catch(() => null);
      if (!stop && res?.ok) setData(await res.json().catch(() => null));
    };
    tick();
    const t = ms ? setInterval(tick, ms) : null;
    return () => {
      stop = true;
      if (t) clearInterval(t);
    };
  }, [url, ms, on]);
  return data;
}

/** The agent's thinking as it streams, shown while it works out what to do next. */
function LiveThought({ run, agent }: { run: RunState; agent: Agent }) {
  const live = usePolled<{ text: string; t: number }>(file(run, `live/${agent.id.replace(/[^\w-]/g, "_")}.json`), 700);
  const box = useRef<HTMLDivElement>(null);
  const text = live?.text?.trim() ?? "";
  useLayoutEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [text]);
  if (!text) return null;
  const m = /^\*\*(.+?)\*\*\s*([\s\S]*)$/.exec(text);
  return (
    <div className="thought">
      <div className="thought-head"><Brain aria-hidden /> {m ? m[1] : "Thinking"}</div>
      <div className="thought-body" ref={box}>{(m ? m[2] : text).slice(-1600)}<i className="caret" aria-hidden /></div>
    </div>
  );
}

type Code = { path: string; content?: string; edits?: { oldText: string; newText: string }[] };

/** Exactly what a write or edit put in the file: the whole file for a write, a red/green diff for an edit. */
function CodeView({ run, act, live, onLive }: { run: RunState; act: Act; live: boolean; onLive: () => void }) {
  const code = usePolled<Code>(file(run, act.code!), 0);
  const lines = (s: string) => s.replace(/\n$/, "").split("\n");
  return (
    <div className={`code ${act.status ?? ""}`}>
      <div className="code-head">
        {act.tool === "edit" ? <FilePen aria-hidden /> : <FilePlus aria-hidden />}
        <b>{code?.path ?? act.label}</b>
        <span>{act.tool === "edit" ? `${code?.edits?.length ?? ""} edit${code?.edits?.length === 1 ? "" : "s"}` : code?.content ? `${lines(code.content).length} lines` : ""}</span>
        {live ? <em className="code-live">{act.status === "running" ? "Writing now" : "Latest"}</em> : <button className="follow" onClick={onLive}>Latest</button>}
      </div>
      {code ? (
        <pre className="code-body">
          {code.content !== undefined
            ? lines(code.content).map((l, i) => <span key={i} className="ln"><i>{i + 1}</i>{l || " "}</span>)
            : code.edits?.map((e, k) => (
                <span key={k} className="hunk">
                  {lines(e.oldText).map((l, i) => <span key={`o${i}`} className="ln del"><i>−</i>{l || " "}</span>)}
                  {lines(e.newText).map((l, i) => <span key={`n${i}`} className="ln add"><i>+</i>{l || " "}</span>)}
                </span>
              ))}
        </pre>
      ) : (
        <div className="code-body loading"><i className="pulse" aria-hidden /> {act.label}</div>
      )}
    </div>
  );
}

function ReportCard({ report: r }: { report: { fun: number; faithful: number; summary: string; best: string[] } }) {
  return (
    <div className="report">
      <div className="report-scores">
        <Score label="Fun" value={r.fun} />
        <Score label="Faithful" value={r.faithful} />
      </div>
      <p>{r.summary}</p>
      {r.best.length > 0 && <ul className="keep">{r.best.slice(0, 4).map((b) => <li key={b}>{b}</li>)}</ul>}
    </div>
  );
}

function Score({ label, value }: { label: string; value?: number }) {
  return (
    <div className={`score ${label.toLowerCase()}`}>
      <span>{label}</span>
      <b>{value ?? "–"}</b>
      <div className="blocks" aria-hidden>{Array.from({ length: 10 }, (_, i) => <i key={i} className={value !== undefined && i < Math.round(value) ? "on" : ""} style={{ animationDelay: `${i * 40}ms` }} />)}</div>
    </div>
  );
}

function FootageWall({ run, active, agent }: { run: RunState; active: boolean; agent: Agent }) {
  const found = agent.acts.filter((x) => x.kind === "note").slice(-6);
  return (
    <div className={`footage-wall ${active ? "active" : ""}`}>
      {run.footageList.length ? run.footageList.map((f) => {
        const id = youtubeId(f.url);
        return (
          <a key={f.key} href={f.url} target="_blank" rel="noreferrer" className="fw-tile">
            {id && <img src={`/api/yt/${id}?f=hqdefault`} alt="" />}
            <span>{f.key}{f.seconds ? ` · ${clock(f.seconds)}` : ""}</span>
          </a>
        );
      }) : (
        <div className="fw-empty">
          <span><i className="pulse" aria-hidden /> {doing(agent)}</span>
          {found.length > 0 && <ol className="fw-found">{found.map((x) => <li key={x.id}>{x.text}</li>)}</ol>}
        </div>
      )}
    </div>
  );
}

function Roster({ run, focus, now, onPick }: { run: RunState; focus: string | null; now: number; onPick: (id: string) => void }) {
  const groups = useMemo(() => {
    const out: { name: string; agents: Agent[] }[] = [];
    const add = (name: string, agents: Agent[]) => agents.length && out.push({ name, agents });
    add("Collect", run.agents.filter((a) => a.stage === "find" || a.stage === "watch"));
    add("Remake", run.agents.filter((a) => a.stage === "build"));
    const rounds = [...new Set(run.agents.filter((a) => a.stage === "playtest").map((a) => a.round ?? 0))].sort((a, b) => a - b);
    for (const r of rounds) add(rounds.length > 1 ? `Agent review ${r}` : "Agent review", run.agents.filter((a) => a.stage === "playtest" && a.round === r).sort((a, b) => (a.role === "fixer" ? 1 : 0) - (b.role === "fixer" ? 1 : 0)));
    return out;
  }, [run.agents]);
  if (!groups.length) return null;
  return (
    <section className="panel roster">
      <h2>Agents</h2>
      {groups.map((g) => (
        <div key={g.name} className="roster-group">
          <h3>{g.name}</h3>
          {g.agents.map((a) => {
            const Icon = agentIcon(a);
            const rep = a.role === "tester" ? run.rounds.find((r) => r.round === a.round)?.reports.find((r) => r.tester === a.focus) : null;
            return (
              <button key={a.id} className={`mate ${a.status}`} aria-pressed={focus === a.id} onClick={() => onPick(a.id)}>
                <span className="mate-icon"><Icon aria-hidden /></span>
                <span className="mate-text">
                  <b>{a.name}</b>
                  <small>{a.status === "running" ? doing(a) : a.status === "error" ? "Stopped" : rep ? `Fun ${rep.fun} · Faithful ${rep.faithful}` : duration(a.secs ?? now - a.startedAt)}</small>
                </span>
                {a.shot ? <img className="mate-shot" src={file(run, a.shot)} alt="" /> : <span className="mate-dot" />}
              </button>
            );
          })}
        </div>
      ))}
    </section>
  );
}

/** How the agents reviewed the latest round: the overall scores, then each reviewer's own scores and verdict. */
function AgentReview({ run, onPick, onParity }: { run: RunState; onPick: (id: string) => void; onParity?: () => void }) {
  const scored = run.rounds.filter((r) => r.fun !== undefined);
  const latest = scored.at(-1);
  const round = latest ?? run.rounds.at(-1);
  const check = parityCheck(run);
  const reviewers = run.agents.filter((a) => a.role === "tester" && a.round === round?.round);
  const squad = Object.entries(round?.squad?.agents ?? {});
  if (!latest && !check && !reviewers.length && !squad.length) return null;
  return (
    <section className="panel review">
      <h2>Agent review</h2>
      {latest && (
        <div className="report-scores">
          <Score label="Fun" value={latest.fun} />
          <Score label="Faithful" value={latest.faithful} />
        </div>
      )}
      {scored.length > 1 && (
        <div className="trend">
          {scored.map((r) => (
            <div key={r.round} className={`trend-col ${run.best?.round === r.round ? "best" : ""}`} title={`Round ${r.round}: fun ${r.fun}, faithful ${r.faithful}`}>
              <div className="trend-bars">
                <i className="f" style={{ height: `${(r.fun ?? 0) * 10}%` }} />
                <i className="a" style={{ height: `${(r.faithful ?? 0) * 10}%` }} />
              </div>
              <span>{r.round}</span>
            </div>
          ))}
        </div>
      )}
      {check && (
        <button className="review-parity" onClick={onParity}>
          <Scale aria-hidden /> <span>Original beside revival</span>
        </button>
      )}
      {(reviewers.length > 0 || squad.length > 0) && (
        <ul className="review-list">
          {reviewers.map((a) => {
            const Icon = agentIcon(a);
            const rep = round?.reports.find((r) => r.tester === a.focus);
            return (
              <li key={a.id}>
                <button className={`mate ${a.status}`} onClick={() => onPick(a.id)}>
                  <span className="mate-icon"><Icon aria-hidden /></span>
                  <span className="mate-text">
                    <b>{a.name}</b>
                    <small>{rep ? `Fun ${rep.fun} · Faithful ${rep.faithful}` : a.status === "running" ? "Playing" : "No score"}</small>
                  </span>
                </button>
                {rep?.summary && <p>{rep.summary}</p>}
              </li>
            );
          })}
          {squad.map(([name, a]) => (
            <li key={name}>
              <div className="mate done">
                <span className="mate-icon"><Gamepad2 aria-hidden /></span>
                <span className="mate-text">
                  <b>{name}</b>
                  <small>{a.findings.length} found</small>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Every footage rule, played in the rebuild and judged against its moment in the original footage. */
/** The footage check people judge a revival by (the best round's, else the latest), cut to the rules that match. */
function parityCheck(run: RunState): Verify | null {
  const checked = run.rounds.filter((r) => r.verify);
  const check = (checked.find((r) => r.round === run.best?.round) ?? checked.at(-1))?.verify;
  const rules = check?.rules.filter((r) => r.pass) ?? [];
  return check && rules.length ? { ...check, rules } : null;
}

const VERDICT = { ok: "Match", no: "Differs", unsure: "Unclear" } as const;
const verdictOf = (r: VerifyRule): keyof typeof VERDICT => (r.pass ? "ok" : r.verdict === "mismatch" ? "no" : "unsure");

/** Each footage rule as a pair: the moment in the original video beside the same moment played in the revival. */
function ParityView({ run, check }: { run: RunState; check: Verify }) {
  const [i, setI] = useState(0);
  const rules = check.rules;
  const r = rules[Math.min(i, rules.length - 1)];
  const yt = youtubeId(r.original_url);
  const v = verdictOf(r);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, rules.length - 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rules.length]);

  return (
    <section className="parity-view">

      <div className="parity-pair">
        <figure>
          <figcaption>Original<a href={r.original_url} target="_blank" rel="noreferrer">{r.original.video} · {clock(r.original.start)} ↗</a></figcaption>
          <div className="pair-screen">
            {yt ? <YtClip id={yt} start={r.original.start} end={r.original.end} title="Original footage" />
              : <a href={r.original_url} target="_blank" rel="noreferrer" className="pair-empty">Open the original</a>}
          </div>
          <p key={r.id}>{r.original_shows}</p>
        </figure>
        <figure key={r.id}>
          <figcaption>Revival{run.rounds.length > 1 && <span>round {check.round}</span>}</figcaption>
          <div className="pair-screen">
            {r.video ? <video src={file(run, r.video)} autoPlay muted loop playsInline controls /> : <span className="pair-empty">No recording</span>}
          </div>
          <p>{r.rebuild_shows}</p>
        </figure>
      </div>

      <div className={`parity-rule ${v}`} key={`${r.id}-rule`}>
        <span className="parity-verdict">{v === "ok" ? <Check aria-hidden /> : v === "no" ? <X aria-hidden /> : null}{VERDICT[v]}</span>
        <h3>{r.rule}</h3>
        {v !== "ok" && r.difference && <p>{r.difference}</p>}
        <nav className="parity-step">
          <button className="btn-ghost" onClick={() => setI(i - 1)} disabled={i === 0} aria-label="Previous rule"><ChevronLeft aria-hidden /></button>
          <button className="btn-ghost" onClick={() => setI(i + 1)} disabled={i === rules.length - 1} aria-label="Next rule"><ChevronRight aria-hidden /></button>
        </nav>
      </div>
    </section>
  );
}

function CollectView({ run }: { run: RunState }) {
  return (
    <div className="desk done collect-view">
      <div className="footage-wall active">
        {run.footageList.map((f) => {
          const id = youtubeId(f.url);
          return (
            <a key={f.key} href={f.url} target="_blank" rel="noreferrer" className="fw-tile" title={f.title}>
              {id && <img src={`/api/yt/${id}?f=hqdefault`} alt="" />}
              <span>{f.key}{f.seconds ? ` · ${clock(f.seconds)}` : ""}</span>
            </a>
          );
        })}
      </div>
      {run.rules > 0 && <p className="empty-note">{run.rules} rules · {run.areas} areas from the footage</p>}
    </div>
  );
}

function FootageList({ run }: { run: RunState }) {
  if (!run.footageList.length) return null;
  return (
    <section className="panel">
      <h2>Footage<span className="total">{run.footageList.length} video{run.footageList.length === 1 ? "" : "s"} · {clock(run.footageList.reduce((n, f) => n + (f.seconds ?? 0), 0))}</span></h2>
      <ul className="footage">
        {run.footageList.map((f) => {
          const id = youtubeId(f.url);
          return (
            <li key={f.key}>
              <a href={f.url} target="_blank" rel="noreferrer">
                {id && <img src={`/api/yt/${id}?f=hqdefault`} alt="" />}
                <span><b>{f.key} · {f.title ?? f.url}</b>{f.seconds ? clock(f.seconds) : ""}{f.channel ? ` · ${f.channel}` : ""}</span>
              </a>
            </li>
          );
        })}
      </ul>
      {run.rules > 0 && <p className="muted small">{run.rules} rules · {run.areas} areas from the footage</p>}
    </section>
  );
}
