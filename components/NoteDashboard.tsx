import React, { useEffect, useMemo, useState } from 'react';
import { NoteItem } from '../types';
import { deleteNote, fetchNotes, isSupabaseConfigured, saveNote } from '../services/supabaseService';

const text = {
  pageTitle: 'Notebook c\u00e1 nh\u00e2n',
  pageDesc: 'L\u01b0u ghi ch\u00fa, \u00fd t\u01b0\u1edfng, checklist h\u1ecdc t\u1eadp. M\u1ed7i note c\u00f3 th\u1ec3 xem d\u1ea1ng Markdown ho\u1eb7c plain text.',
  newNote: 'Note m\u1edbi',
  edit: 'Ch\u1ec9nh note',
  view: 'Xem note',
  title: 'Ti\u00eau \u0111\u1ec1',
  content: 'N\u1ed9i dung ghi ch\u00fa',
  tags: 'Tags, ng\u0103n c\u00e1ch b\u1eb1ng d\u1ea5u ph\u1ea9y',
  markdown: 'Markdown',
  plain: 'Plain text',
  save: 'L\u01b0u note',
  saving: '\u0110ang l\u01b0u...',
  saved: '\u0110\u00e3 l\u01b0u note.',
  saveFail: 'Kh\u00f4ng l\u01b0u \u0111\u01b0\u1ee3c. H\u00e3y ch\u1ea1y SQL t\u1ea1o b\u1ea3ng notes tr\u01b0\u1edbc.',
  loadFail: 'Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c notes.',
  deleteConfirm: 'X\u00f3a note n\u00e0y?',
  deleteFail: 'Kh\u00f4ng x\u00f3a \u0111\u01b0\u1ee3c note.',
  noSupabase: 'Ch\u01b0a c\u1ea5u h\u00ecnh Supabase n\u00ean Note ch\u01b0a \u0111\u1ed3ng b\u1ed9 \u0111\u01b0\u1ee3c.',
  search: 'T\u00ecm theo ti\u00eau \u0111\u1ec1, n\u1ed9i dung, tag...',
  empty: 'Ch\u01b0a c\u00f3 note n\u00e0o.',
  untitled: 'Untitled note',
  selectHint: 'Ch\u1ecdn note b\u00ean tr\u00e1i \u0111\u1ec3 xem. B\u1ea5m Ch\u1ec9nh note n\u1ebfu mu\u1ed1n s\u1eeda.',
  previewEmpty: 'Note n\u00e0y ch\u01b0a c\u00f3 n\u1ed9i dung.',
};

const emptyDraft: Partial<NoteItem> & { title: string; content: string } = {
  title: '',
  content: '',
  mode: 'markdown',
  tags: [],
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const linkifyText = (value: string) => escapeHtml(value).replace(/\b((?:https?:\/\/|www\.)[^\s<]+)/gi, match => {
  const trailing = match.match(/[.,!?;:)]+$/)?.[0] || '';
  const cleanMatch = trailing ? match.slice(0, -trailing.length) : match;
  const href = cleanMatch.startsWith('www.') ? `https://${cleanMatch}` : cleanMatch;
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="font-black text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800">${cleanMatch}</a>${trailing}`;
});

const renderInlineMarkdown = (value: string) => linkifyText(value)
  .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 text-[0.9em] font-mono">$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>');

const markdownToHtml = (markdown: string) => {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let inList = false;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      html.push('<br />');
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      const level = heading[1].length;
      const className = level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : 'text-lg';
      html.push(`<h${level} class="${className} mt-4 mb-2 font-black text-slate-950">${renderInlineMarkdown(heading[2])}</h${level}>`);
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (!inList) {
        html.push('<ul class="my-3 list-disc space-y-1 pl-5">');
        inList = true;
      }
      html.push(`<li>${renderInlineMarkdown(bullet[1])}</li>`);
      return;
    }

    if (inList) {
      html.push('</ul>');
      inList = false;
    }
    html.push(`<p class="my-2 leading-7">${renderInlineMarkdown(trimmed)}</p>`);
  });

  if (inList) html.push('</ul>');
  return html.join('');
};

const NoteDashboard: React.FC = () => {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [listCollapsed, setListCollapsed] = useState(false);

  const selectedNote = notes.find(note => note.id === selectedId) || null;

  const filteredNotes = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return notes;
    return notes.filter(note =>
      note.title.toLowerCase().includes(keyword) ||
      note.content.toLowerCase().includes(keyword) ||
      note.tags.some(tag => tag.toLowerCase().includes(keyword))
    );
  }, [notes, query]);

  const loadNotes = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const data = await fetchNotes();
      setNotes(data);
      setSelectedId(current => current || data[0]?.id || null);
    } catch (error) {
      console.error(error);
      setMessage(text.loadFail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const startNew = () => {
    setDraft(emptyDraft);
    setSelectedId(null);
    setEditing(true);
    setMessage('');
  };

  const startEdit = (note: NoteItem) => {
    setDraft(note);
    setSelectedId(note.id);
    setEditing(true);
    setMessage('');
  };

  const selectNote = (note: NoteItem) => {
    setSelectedId(note.id);
    setEditing(false);
    setDraft(note);
    setMessage('');
  };

  const saveDraft = async () => {
    setSaving(true);
    setMessage('');
    try {
      const saved = await saveNote({
        ...draft,
        title: draft.title.trim() || text.untitled,
        content: draft.content || '',
        tags: typeof draft.tags === 'string' ? [] : draft.tags,
      });
      setNotes(prev => [saved, ...prev.filter(note => note.id !== saved.id)]);
      setSelectedId(saved.id);
      setDraft(saved);
      setEditing(false);
      setMessage(text.saved);
    } catch (error) {
      console.error(error);
      setMessage(text.saveFail);
    } finally {
      setSaving(false);
    }
  };

  const removeNote = async (id: string) => {
    if (!confirm(text.deleteConfirm)) return;
    try {
      await deleteNote(id);
      setNotes(prev => prev.filter(note => note.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setDraft(emptyDraft);
        setEditing(false);
      }
    } catch (error) {
      console.error(error);
      setMessage(text.deleteFail);
    }
  };

  const updateTags = (value: string) => {
    setDraft(prev => ({ ...prev, tags: value.split(',').map(tag => tag.trim()).filter(Boolean) }));
  };

  const activeContent = editing ? draft.content : selectedNote?.content || '';
  const activeMode = editing ? draft.mode || 'markdown' : selectedNote?.mode || 'markdown';

  return (
    <div className={`grid min-h-[70vh] gap-5 ${listCollapsed ? 'xl:grid-cols-[0_1fr]' : 'xl:grid-cols-[330px_1fr]'}`}>
      <aside className={`overflow-hidden border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition-all ${listCollapsed ? 'pointer-events-none w-0 border-0 opacity-0' : 'opacity-100'}`}>
        <div className="border-b border-slate-100 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-500">Note</p>
              <h2 className="text-xl font-black text-slate-950">{text.pageTitle}</h2>
            </div>
            <button onClick={startNew} className="bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-blue-600">+ {text.newNote}</button>
          </div>
          <p className="mb-4 text-sm font-semibold leading-6 text-slate-500">{text.pageDesc}</p>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder={text.search} className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-400" />
        </div>

        <div className="max-h-[62vh] overflow-y-auto">
          {loading ? <div className="p-5 text-sm font-bold text-slate-400">Loading...</div> : null}
          {filteredNotes.length === 0 ? <div className="p-5 text-sm font-bold text-slate-400">{text.empty}</div> : null}
          {filteredNotes.map(note => (
            <article key={note.id} className={`group relative border-b border-slate-100 p-4 transition hover:bg-slate-50 ${selectedId === note.id && !editing ? 'bg-blue-50' : 'bg-white'}`}>
              <button onClick={() => selectNote(note)} className="block w-full pr-9 text-left">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="line-clamp-1 font-black text-slate-950">{note.title || text.untitled}</h3>
                  <span className="shrink-0 bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">{note.mode}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{note.content || text.previewEmpty}</p>
                {note.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{note.tags.map(tag => <span key={tag} className="bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">#{tag}</span>)}</div>}
              </button>
              <button onClick={() => removeNote(note.id)} title={'X\u00f3a nhanh'} className="absolute right-3 top-4 grid h-8 w-8 place-items-center text-slate-300 opacity-100 transition hover:bg-rose-50 hover:text-rose-600 md:opacity-0 md:group-hover:opacity-100">
                <i className="fa-solid fa-trash-can" />
              </button>
            </article>
          ))}
        </div>
      </aside>

      <main className="border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{editing ? text.edit : text.view}</p>
            <h2 className="truncate text-2xl font-black text-slate-950">{editing ? draft.title || text.untitled : selectedNote?.title || text.selectHint}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setListCollapsed(value => !value)} title={listCollapsed ? 'Hi\u1ec7n danh s\u00e1ch note' : '\u1ea8n danh s\u00e1ch note'} className="bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-200"><i className={`fa-solid ${listCollapsed ? 'fa-table-columns' : 'fa-up-right-and-down-left-from-center'} mr-2`} />{listCollapsed ? 'Hi\u1ec7n list' : 'T\u1eadp trung'}</button>
            {selectedNote && !editing && <button onClick={() => startEdit(selectedNote)} className="bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700"><i className="fa-solid fa-pen mr-2" />{text.edit}</button>}
            {selectedNote && <button onClick={() => removeNote(selectedNote.id)} className="bg-rose-50 px-4 py-2 text-sm font-black text-rose-600 hover:bg-rose-100"><i className="fa-solid fa-trash mr-2" />Delete</button>}
          </div>
        </div>

        {editing ? (
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr]">
            <section className="space-y-3">
              <input value={draft.title} onChange={event => setDraft(prev => ({ ...prev, title: event.target.value }))} placeholder={text.title} className="w-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
              <div className="grid grid-cols-2 border border-slate-200 text-sm font-black">
                <button onClick={() => setDraft(prev => ({ ...prev, mode: 'markdown' }))} className={`py-2.5 ${draft.mode !== 'plain' ? 'bg-slate-950 text-white' : 'bg-white text-slate-500'}`}>{text.markdown}</button>
                <button onClick={() => setDraft(prev => ({ ...prev, mode: 'plain' }))} className={`py-2.5 ${draft.mode === 'plain' ? 'bg-slate-950 text-white' : 'bg-white text-slate-500'}`}>{text.plain}</button>
              </div>
              <textarea value={draft.content} onChange={event => setDraft(prev => ({ ...prev, content: event.target.value }))} placeholder={text.content} rows={18} className="w-full resize-none border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-blue-400" />
              <input value={(draft.tags || []).join(', ')} onChange={event => updateTags(event.target.value)} placeholder={text.tags} className="w-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setEditing(false); if (selectedNote) setDraft(selectedNote); }} className="bg-slate-100 px-4 py-3 text-sm font-black text-slate-600">Cancel</button>
                <button onClick={saveDraft} disabled={saving} className="bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-600 disabled:opacity-50">{saving ? text.saving : text.save}</button>
              </div>
            </section>
            <section className="border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-slate-400">Preview</p>
              <NotePreview content={activeContent} mode={activeMode} />
            </section>
          </div>
        ) : (
          <div className="p-5">
            {selectedNote ? <NotePreview content={activeContent} mode={activeMode} /> : <div className="grid min-h-[45vh] place-items-center text-center text-sm font-bold text-slate-400">{text.selectHint}</div>}
          </div>
        )}

        {message && <div className="mx-4 mb-4 border-l-4 border-blue-400 bg-blue-50 p-3 text-sm font-bold text-blue-700">{message}</div>}
        {!isSupabaseConfigured && <div className="mx-4 mb-4 border-l-4 border-orange-400 bg-orange-50 p-3 text-sm font-bold text-orange-700">{text.noSupabase}</div>}
      </main>
    </div>
  );
};

const NotePreview: React.FC<{ content: string; mode: 'markdown' | 'plain' }> = ({ content, mode }) => {
  if (!content.trim()) return <div className="text-sm font-bold text-slate-400">{text.previewEmpty}</div>;
  if (mode === 'plain') return <div className="whitespace-pre-wrap font-sans text-sm font-semibold leading-7 text-slate-700" dangerouslySetInnerHTML={{ __html: linkifyText(content) }} />;
  return <div className="text-sm font-semibold text-slate-700" dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />;
};

export default NoteDashboard;
