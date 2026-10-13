import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Copy, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MimoMascot } from '@/components/mimo-mascot';
import { memoryRepository } from '@/services/memory-repository';
import { captionTemplates, searchLocalMemories, tidyStory } from '@/lib/mimo-assistant';
import { detectLocalModelSupport, type LocalModelSupport } from '@/services/mimo-local-model';
import { memoryPath } from '@/lib/memory-path';
import { useMimo } from '@/stores/mimo';
import type { Memory } from '@/types/memory';
import type { MimoState } from '@/lib/mimo';

interface Exchange { id: number; query: string; response: string; results: Memory[]; shown: number }
const prompts = ['Show my beach memories', 'Show my favorite memories', 'Show all memories'];

export function MimoAssistant({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Memory | null>(null);
  const [tool, setTool] = useState<'caption' | 'story'>('caption');
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [support, setSupport] = useState<LocalModelSupport | null>(null);
  const [checking, setChecking] = useState(false);
  const [reactions, setReactions] = useState(true);
  const reactionsEnabled = useRef(true);
  const mounted = useRef(true);
  const request = useRef(0);
  const reaction = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  function react(state: MimoState, temporary = true) {
    if (!reactionsEnabled.current) return;
    const previous = useMimo.getState().requestId;
    useMimo.getState().play(state, temporary);
    reaction.current = useMimo.getState().requestId === previous ? null : useMimo.getState().requestId;
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- Request IDs are mutable lifecycle state, not DOM nodes.
      mounted.current = false; request.current++;
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- This is the latest owned animation ID, not a DOM ref.
      if (reaction.current !== null) useMimo.getState().finish(reaction.current);
    };
  }, []);
  useEffect(() => {
    conversation.current?.scrollTo({ top: conversation.current.scrollHeight, behavior: 'instant' });
  }, [exchanges.length, busy, selected?.id, tool]);

  async function search(text: string) {
    if (!text.trim() || busy) return;
    const id = ++request.current;
    setBusy(true); setError(''); setQuery(''); setSelected(null); setCopied(false);
    react('thinking', false);
    try {
      const [memories, collections] = await Promise.all([memoryRepository.listMemories(), memoryRepository.listCollections()]);
      if (!mounted.current || id !== request.current) return;
      const result = searchLocalMemories(memories, collections, text);
      const count = result.memories.length;
      const response = result.filters.error ?? (count ? `Found ${count} saved ${count === 1 ? 'memory' : 'memories'} on this device.` : 'No saved memories matched. Try a title, collection, mood, month and year, or favorites.');
      setExchanges((previous) => [...previous.slice(-11), { id, query: text, response, results: result.memories, shown: 10 }]);
      if (reaction.current !== null) useMimo.getState().finish(reaction.current);
      react(count ? 'happy' : 'wave');
    } catch {
      if (mounted.current && id === request.current) {
        setQuery(text); setError('I could not read your local scrapbook. Your memories have not been changed. Please try again.');
        if (reaction.current !== null) useMimo.getState().finish(reaction.current);
      }
    } finally { if (mounted.current && id === request.current) setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void search(query); }
  async function choose(memory: Memory, nextTool: 'caption' | 'story') {
    setError('');
    // Re-read before drafting so deleted or edited records are not treated as current facts.
    const id = ++request.current;
    try {
      const current = await memoryRepository.getMemory(memory.id);
      if (!mounted.current || id !== request.current) return;
      if (!current) { setError('That memory is no longer available. Try searching again.'); setSelected(null); return; }
      setSelected(current); setTool(nextTool); setCopied(false);
      setDraft(nextTool === 'story' ? tidyStory(current.description) : captionTemplates(current)[0]!);
      react(current.mood === 'adventurous' ? 'celebrate' : current.mood === 'peaceful' || current.mood === 'nostalgic' ? 'wave' : 'happy');
    } catch { if (mounted.current && id === request.current) setError('This memory could not be read. Please try again.'); }
  }
  async function copyDraft() {
    try { await navigator.clipboard.writeText(draft); if (mounted.current) setCopied(true); }
    catch { if (mounted.current) setError('Copy is unavailable here. Select the draft text and copy it manually.'); }
  }
  async function checkSupport() {
    if (checking) return;
    setChecking(true);
    try { const result = await detectLocalModelSupport(); if (mounted.current) setSupport(result); }
    finally { if (mounted.current) setChecking(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="mimo-assistant-panel" onOpenAutoFocus={(event) => { event.preventDefault(); input.current?.focus({ preventScroll: true }); }} onCloseAutoFocus={(event) => {
      event.preventDefault(); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-mimo-launcher]')?.focus({ preventScroll: true }));
    }}>
      <header className="mimo-assistant-header">
        <MimoMascot inline size={60} />
        <div><span className="mimo-assistant-kicker">YOUR LOCAL MEMORY COMPANION</span><DialogTitle>A little help from Mimo</DialogTitle><DialogDescription>Find saved moments. Give your words a little room.</DialogDescription></div>
      </header>
      <div className="mimo-assistant-privacy"><ShieldCheck size={15} /><span>On this device · Rule-based help · No AI model running</span></div>
      <div ref={conversation} className="mimo-assistant-conversation" aria-label="Conversation with Mimo" tabIndex={0}>
        <div className="mimo-message mimo-message-response"><p>Hello, memory maker. I can search your saved scrapbook and offer caption templates or gentle formatting help.</p><p className="mimo-assistant-note">These are local rules, not generative AI. Sample memories are not searched. This conversation clears when you close the panel.</p></div>
        {!exchanges.length && <div className="mimo-prompt-list">{prompts.map((text) => <button key={text} disabled={busy} onClick={() => void search(text)}>{text}<ArrowUpRight size={13} /></button>)}</div>}
        {exchanges.map((exchange) => <section className="mimo-exchange" key={exchange.id}>
          <p className="mimo-message mimo-message-user"><span className="sr-only">You: </span>{exchange.query}</p>
          <div className="mimo-message mimo-message-response"><p>{exchange.response}</p>
            {exchange.results.slice(0, exchange.shown).map((memory) => <article className="mimo-result-card" key={memory.id}>
              <Link to={memoryPath(memory)} onClick={onClose}><span><strong>{memory.title}</strong><small>{memory.memoryDate} · {memory.mood}{memory.favorite ? ' · Favorite' : ''}</small></span><ArrowUpRight size={16} /></Link>
              <p>{memory.description ? memory.description.slice(0, 140) : 'A moment in your scrapbook.'}</p>
              <div><button disabled={busy} onClick={() => void choose(memory, 'caption')}>Caption templates</button><button disabled={busy} onClick={() => void choose(memory, 'story')}>Tidy story</button></div>
            </article>)}
            {exchange.shown < exchange.results.length && <Button variant="ghost" size="sm" onClick={() => setExchanges((values) => values.map((item) => item.id === exchange.id ? { ...item, shown: item.shown + 10 } : item))}>Show more matches</Button>}
          </div>
        </section>)}
        {busy && <p className="mimo-message mimo-message-response" role="status">Looking through your saved memories…</p>}
        {selected && <section className="mimo-writing-workspace" aria-label="Writing workspace">
          <div className="mimo-writing-heading"><Sparkles size={16} /><h3>{tool === 'caption' ? 'Caption templates' : 'A gentle tidy'}</h3><button onClick={() => setSelected(null)} aria-label="Close writing workspace">×</button></div>
          <p><strong>{selected.title}</strong></p><span className="mimo-rule-label">Rule-based · {tool === 'caption' ? 'Uses your recorded title, mood and words' : 'Whitespace formatting only'}</span>
          {tool === 'caption' ? <div className="mimo-caption-options">{captionTemplates(selected).map((caption, index) => <button key={index} onClick={() => { setDraft(caption); setCopied(false); }}>Template {index + 1}<span>{caption}</span></button>)}</div> : <>
            <details><summary>Original story (unchanged)</summary><p className="mimo-original-story">{selected.description || 'No story has been saved yet.'}</p></details>
            <p className="mimo-assistant-note">I can tidy spacing and blank lines. I do not rewrite meaning or add people or events. {draft === selected.description && selected.description ? 'Your spacing already looks tidy.' : ''}</p>
            <p className="mimo-assistant-note">If you want to add more, use your own words: What happened? What do you want to remember about it?</p>
          </>}
          <label htmlFor="mimo-writing-draft">Review and edit your draft</label><textarea id="mimo-writing-draft" value={draft} maxLength={30000} onChange={(event) => { setDraft(event.target.value); setCopied(false); }} rows={5} />
          <Button variant="secondary" size="sm" disabled={!draft.trim()} onClick={() => void copyDraft()}><Copy size={14} />{copied ? 'Copied' : 'Copy draft'}</Button>
          <p className="mimo-assistant-note">Copying does not save or change your memory. You can paste this into the existing memory editor and review it before saving.</p>
        </section>}
      </div>
      {error && <p className="mimo-assistant-error" role="alert">{error}</p>}
      <div className="mimo-assistant-bottom">
        <label className="mimo-reactions-toggle"><input type="checkbox" checked={reactions} onChange={(event) => { reactionsEnabled.current = event.target.checked; setReactions(event.target.checked); if (!event.target.checked && reaction.current !== null) useMimo.getState().finish(reaction.current); }} />Mimo reactions</label>
        <form onSubmit={submit} className="mimo-assistant-search"><label className="sr-only" htmlFor="mimo-query">Ask Mimo to find memories</label><input ref={input} id="mimo-query" autoComplete="off" maxLength={400} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find memories from August 2026…" /><Button type="submit" size="icon" disabled={busy || !query.trim()} aria-label="Search with Mimo"><Search size={18} /></Button></form>
        <details className="mimo-model-options"><summary>Optional on-device AI</summary><p>No local model is installed or tested. Search and writing templates work offline without one.</p><p>A future model must show its download size and required storage before asking your consent. Nothing is downloaded by this panel.</p><Button variant="ghost" size="sm" disabled={checking} onClick={() => void checkSupport()}>{checking ? 'Checking…' : 'Check browser capabilities'}</Button>
          {support && <p role="status">WebGPU adapter: {support.webGpu ? 'available' : 'unavailable'}. WebAssembly: {support.wasm ? 'available' : 'unavailable'}. Estimated free site storage: {support.storageAvailableBytes === null ? 'unknown' : `${Math.round(support.storageAvailableBytes / 1024 / 1024)} MB`}. These checks do not validate a language model or guarantee installation space.</p>}
        </details>
      </div>
    </DialogContent>
  </Dialog>;
}
