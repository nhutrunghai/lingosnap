import React, { useEffect, useMemo, useState } from 'react';
import { VocaWord } from '../types';
import { enrichVocabularyWord } from '../services/openaiService';
import { deleteVocaWord, fetchVocaWords, isSupabaseConfigured, saveVocaWord } from '../services/supabaseService';

const emptyDraft: Partial<VocaWord> & { word: string } = {
  word: '',
  meaning: '',
  ipa: '',
  example: '',
  note: '',
};

type Accent = 'US' | 'UK';

const speakWord = (word: string, accent: Accent, onError: (message: string) => void) => {
  const cleanWord = word.trim();
  if (!cleanWord) {
    onError('Nh?p t? tr??c r?i m?i ph?t ?m ???c.');
    return;
  }

  if (!('speechSynthesis' in window)) {
    onError('Tr?nh duy?t n?y ch?a h? tr? ph?t ?m.');
    return;
  }

  const lang = accent === 'US' ? 'en-US' : 'en-GB';
  const utterance = new SpeechSynthesisUtterance(cleanWord);
  const voices = window.speechSynthesis.getVoices();
  utterance.lang = lang;
  utterance.rate = 0.86;
  utterance.pitch = 1;
  utterance.voice = voices.find(voice => voice.lang === lang) || voices.find(voice => voice.lang.toLowerCase().startsWith(lang.toLowerCase())) || null;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

const VocaDashboard: React.FC = () => {
  const [words, setWords] = useState<VocaWord[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState('');

  const filteredWords = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return words;
    return words.filter(item =>
      item.word.toLowerCase().includes(keyword) ||
      item.meaning.toLowerCase().includes(keyword) ||
      item.note.toLowerCase().includes(keyword)
    );
  }, [words, query]);

  const loadWords = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      setWords(await fetchVocaWords());
    } catch (error) {
      console.error(error);
      setMessage('Kh?ng t?i ???c kho Voca. Ki?m tra b?ng voca_words trong Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
    window.speechSynthesis?.getVoices();
  }, []);

  const updateDraft = (field: keyof VocaWord, value: string) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const fillByAi = async () => {
    if (!draft.word.trim()) {
      setMessage('Nh?p t? v?ng tr??c r?i h?y b?m AI ?i?n.');
      return;
    }

    setAiLoading(true);
    setMessage('');
    try {
      const enriched = await enrichVocabularyWord(draft.word);
      setDraft(prev => ({
        ...prev,
        meaning: prev.meaning?.trim() ? prev.meaning : enriched.meaning,
        ipa: enriched.ipa,
        example: prev.example?.trim() ? prev.example : enriched.example,
      }));
      setMessage('AI ?? ?i?n ngh?a, IPA v? v? d?. B?n v?n c? th? s?a tay tr??c khi l?u.');
    } catch (error) {
      console.error(error);
      setMessage('AI ch?a ?i?n ???c. B?n c? th? nh?p ngh?a th? c?ng r?i l?u.');
    } finally {
      setAiLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!draft.word.trim()) {
      setMessage('T? v?ng kh?ng ???c ?? tr?ng.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const saved = await saveVocaWord(draft);
      setWords(prev => [saved, ...prev.filter(item => item.id !== saved.id)]);
      setDraft(emptyDraft);
      setMessage('?? l?u v?o Voca.');
    } catch (error) {
      console.error(error);
      setMessage('Kh?ng l?u ???c. N?u m?i th?m t?nh n?ng n?y, h?y ch?y SQL t?o b?ng voca_words tr??c.');
    } finally {
      setSaving(false);
    }
  };

  const editWord = (item: VocaWord) => {
    setDraft(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeWord = async (id: string) => {
    if (!confirm('X?a t? n?y kh?i Voca?')) return;
    try {
      await deleteVocaWord(id);
      setWords(prev => prev.filter(item => item.id !== id));
      if (draft.id === id) setDraft(emptyDraft);
    } catch (error) {
      console.error(error);
      setMessage('Kh?ng x?a ???c t? n?y.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl shadow-slate-300/50">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Personal Voca</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Kho t? v?ng ri?ng c?a b?n</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">Ch? c?n nh?p t? ti?ng Anh, AI c? th? t? d?ch ngh?a ti?ng Vi?t, th?m IPA v? t?o v? d?. N?u mu?n ki?m so?t ch?nh x?c h?n, b?n t? s?a ngh?a tr??c khi l?u.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-3xl bg-white/10 p-4 text-center backdrop-blur">
            <div><div className="text-2xl font-black">{words.length}</div><div className="text-xs font-bold text-slate-300">T? ?? l?u</div></div>
            <div><div className="text-2xl font-black">{words.filter(item => item.ipa).length}</div><div className="text-xs font-bold text-slate-300">C? IPA</div></div>
            <div><div className="text-2xl font-black">{words.filter(item => item.example).length}</div><div className="text-xs font-bold text-slate-300">C? v? d?</div></div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white p-5 shadow-xl shadow-slate-200/70">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black">{draft.id ? 'S?a t? v?ng' : 'Th?m t? m?i'}</h3>
              <p className="text-sm font-semibold text-slate-500">Nh?p t? l? ??, c?c ? kh?c c? th? ?? AI ?i?n.</p>
            </div>
            {draft.id && <button onClick={() => setDraft(emptyDraft)} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">T?o m?i</button>}
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input value={draft.word} onChange={event => updateDraft('word', event.target.value)} placeholder="T? v?ng, v? d?: resilient" className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
              <button type="button" onClick={() => speakWord(draft.word, 'US', setMessage)} title="Ph?t ?m gi?ng M?" className="rounded-2xl bg-blue-50 px-3 text-xs font-black text-blue-600 transition hover:bg-blue-100 disabled:opacity-50" disabled={!draft.word.trim()}><i className="fa-solid fa-volume-high mr-1" />US</button>
              <button type="button" onClick={() => speakWord(draft.word, 'UK', setMessage)} title="Ph?t ?m gi?ng Anh" className="rounded-2xl bg-violet-50 px-3 text-xs font-black text-violet-600 transition hover:bg-violet-100 disabled:opacity-50" disabled={!draft.word.trim()}><i className="fa-solid fa-volume-high mr-1" />UK</button>
            </div>
            <input value={draft.ipa || ''} onChange={event => updateDraft('ipa', event.target.value)} placeholder="IPA, v? d?: /r??z?li?nt/" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
            <textarea value={draft.meaning || ''} onChange={event => updateDraft('meaning', event.target.value)} placeholder="Ngh?a ti?ng Vi?t" rows={3} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
            <textarea value={draft.example || ''} onChange={event => updateDraft('example', event.target.value)} placeholder="V? d?" rows={3} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
            <textarea value={draft.note || ''} onChange={event => updateDraft('note', event.target.value)} placeholder="Ghi ch? c? nh?n, m?o nh?..." rows={2} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={fillByAi} disabled={aiLoading || !draft.word.trim()} className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"><i className={`fa-solid ${aiLoading ? 'fa-spinner animate-spin' : 'fa-wand-magic-sparkles'} mr-2`} />AI ?i?n</button>
            <button onClick={saveDraft} disabled={saving || !draft.word.trim()} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-600 disabled:opacity-50">{saving ? '?ang l?u...' : 'L?u Voca'}</button>
          </div>

          {message && <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{message}</div>}
          {!isSupabaseConfigured && <div className="mt-4 rounded-2xl bg-orange-50 p-3 text-sm font-bold text-orange-700">Ch?a c?u h?nh Supabase n?n Voca ch?a ??ng b? ???c.</div>}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-[2rem] border border-white/70 bg-white p-4 shadow-xl shadow-slate-200/70 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black">Danh s?ch t?</h3>
              <p className="text-sm font-semibold text-slate-500">D? li?u ??ng b? ?? m? ?i?n tho?i v?n th?y.</p>
            </div>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="T?m t? ho?c ngh?a..." className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold outline-none focus:border-blue-400 sm:w-72" />
          </div>

          {loading ? (
            <div className="rounded-[2rem] bg-white p-8 text-center font-black text-slate-400 shadow-xl shadow-slate-200/70">?ang t?i Voca...</div>
          ) : filteredWords.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-8 text-center font-bold text-slate-400">Ch?a c? t? n?o. Th?m t? ??u ti?n ? form b?n tr?i nh?.</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredWords.map(item => (
                <article key={item.id} className="rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-lg shadow-slate-200/60 transition hover:-translate-y-0.5 hover:shadow-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-black text-slate-950">{item.word}</h4>
                      {item.ipa && <p className="mt-1 font-mono text-sm font-bold text-blue-600">{item.ipa}</p>}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button onClick={() => speakWord(item.word, 'US', setMessage)} title="Ph?t ?m gi?ng M?" className="grid h-9 min-w-9 place-items-center rounded-xl bg-blue-50 px-2 text-xs font-black text-blue-600"><span><i className="fa-solid fa-volume-high mr-1" />US</span></button>
                      <button onClick={() => speakWord(item.word, 'UK', setMessage)} title="Ph?t ?m gi?ng Anh" className="grid h-9 min-w-9 place-items-center rounded-xl bg-violet-50 px-2 text-xs font-black text-violet-600"><span><i className="fa-solid fa-volume-high mr-1" />UK</span></button>
                      <button onClick={() => editWord(item)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><i className="fa-solid fa-pen" /></button>
                      <button onClick={() => removeWord(item.id)} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600"><i className="fa-solid fa-trash" /></button>
                    </div>
                  </div>
                  <p className="mt-4 whitespace-pre-line text-sm font-bold leading-6 text-slate-700">{item.meaning || 'Ch?a c? ngh?a.'}</p>
                  {item.example && <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-500">{item.example}</p>}
                  {item.note && <p className="mt-3 text-xs font-bold text-amber-600"><i className="fa-solid fa-note-sticky mr-2" />{item.note}</p>}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default VocaDashboard;
