import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NoteItem } from '../types';
import { deleteNote, fetchNotes, isSupabaseConfigured, saveNote } from '../services/supabaseService';
import MarkdownRenderer from './MarkdownRenderer';
import { handleSmartPaste } from '../services/clipboardService';

const emptyDraft: Partial<NoteItem> & { title: string; content: string } = {
  title: '',
  content: '',
  mode: 'markdown',
  tags: [],
};

const NoteDashboard: React.FC = () => {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState(false);
  const [editViewMode, setEditViewMode] = useState<'split' | 'edit-only' | 'preview-only'>('split');
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [listCollapsed, setListCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedNote = notes.find(note => note.id === selectedId) || null;

  // Extract all tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => (note.tags || []).forEach(tag => tagSet.add(tag.trim())));
    return Array.from(tagSet).filter(Boolean);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const result = notes.filter(note => {
      const matchesTag =
        selectedTag === 'all' || (note.tags || []).some(t => t.toLowerCase() === selectedTag.toLowerCase());
      const matchesSearch =
        !keyword ||
        note.title.toLowerCase().includes(keyword) ||
        note.content.toLowerCase().includes(keyword) ||
        (note.tags || []).some(tag => tag.toLowerCase().includes(keyword));
      return matchesTag && matchesSearch;
    });

    // Pinned notes first
    return result.sort((a, b) => {
      const aPinned = (a.tags || []).includes('pinned');
      const bPinned = (b.tags || []).includes('pinned');
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [notes, query, selectedTag]);

  const loadNotes = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const data = await fetchNotes();
      setNotes(data);
      setSelectedId(current => current || data[0]?.id || null);
    } catch (error) {
      console.error(error);
      setMessage('Không tải được danh sách ghi chú.');
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
    setDraft({ ...note });
    setSelectedId(note.id);
    setEditing(true);
    setMessage('');
  };

  const selectNote = (note: NoteItem) => {
    setSelectedId(note.id);
    setEditing(false);
    setDraft({ ...note });
    setMessage('');
  };

  const saveDraft = async () => {
    setSaving(true);
    setMessage('');
    try {
      const saved = await saveNote({
        ...draft,
        title: draft.title.trim() || 'Ghi chú chưa đặt tên',
        content: draft.content || '',
        tags: Array.isArray(draft.tags) ? draft.tags : [],
      });
      setNotes(prev => [saved, ...prev.filter(note => note.id !== saved.id)]);
      setSelectedId(saved.id);
      setDraft(saved);
      setEditing(false);
      setMessage('Đã lưu ghi chú thành công.');
    } catch (error) {
      console.error(error);
      setMessage('Không lưu được ghi chú. Kiểm tra bảng notes trên Supabase.');
    } finally {
      setSaving(false);
    }
  };

  const removeNote = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa ghi chú này?')) return;
    try {
      await deleteNote(id);
      const remaining = notes.filter(note => note.id !== id);
      setNotes(remaining);
      if (selectedId === id) {
        setSelectedId(remaining[0]?.id || null);
        setDraft(remaining[0] || emptyDraft);
        setEditing(false);
      }
    } catch (error) {
      console.error(error);
      setMessage('Không xóa được ghi chú.');
    }
  };

  const updateTags = (value: string) => {
    setDraft(prev => ({
      ...prev,
      tags: value.split(',').map(tag => tag.trim()).filter(Boolean),
    }));
  };

  
  const togglePinNote = async (note: NoteItem) => {
    const isPinned = (note.tags || []).includes('pinned');
    const newTags = isPinned
      ? note.tags.filter(t => t !== 'pinned')
      : ['pinned', ...(note.tags || [])];
    try {
      const saved = await saveNote({ ...note, tags: newTags });
      setNotes(prev => [saved, ...prev.filter(n => n.id !== saved.id)]);
      if (selectedId === note.id) setDraft(saved);
      setMessage(isPinned ? 'Đã bỏ ghim note.' : 'Đã ghim note lên đầu!');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('Không cập nhật được trạng thái ghim.');
    }
  };

  const copyNoteContent = () => {
    const textToCopy = editing ? draft.content : selectedNote?.content;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const insertTextAtCursor = (prefix: string, suffix: string = '') => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = draft.content || '';
    const selectedText = currentVal.substring(start, end);

    const replacement = `${prefix}${selectedText || 'nội dung'}${suffix}`;
    const nextVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

    setDraft(prev => ({ ...prev, content: nextVal }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText ? selectedText.length : 8));
    }, 50);
  };

  return (
    <div className={`grid min-h-[78vh] gap-5 transition-all ${listCollapsed ? 'xl:grid-cols-[0_1fr]' : 'xl:grid-cols-[340px_1fr]'}`}>
      {/* Sidebar: Notes List */}
      <aside
        className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all ${
          listCollapsed ? 'pointer-events-none hidden opacity-0' : 'opacity-100'
        }`}
      >
        <div className="border-b border-slate-100 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Sổ Tay Ghi Chú</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Kiến thức, Cheat-sheet &amp; Checklist</p>
            </div>
            <button
              onClick={startNew}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600"
            >
              <i className="fa-solid fa-plus text-[10px]" />
              <span>Note mới</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Tìm theo tiêu đề, nội dung, tag..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white"
            />
          </div>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              <button
                onClick={() => setSelectedTag('all')}
                className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${
                  selectedTag === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả tag
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${
                    selectedTag === tag
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Note Items Scroll List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[60vh] xl:max-h-[68vh]">
          {loading && <div className="p-6 text-center text-xs font-medium text-slate-400">Đang tải ghi chú...</div>}
          {!loading && filteredNotes.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400">Chưa có ghi chú nào.</div>
          )}
          {filteredNotes.map(note => {
            const isSelected = selectedId === note.id && !editing;
            return (
              <article
                key={note.id}
                onClick={() => selectNote(note)}
                className={`group relative cursor-pointer p-3.5 transition ${
                  isSelected
                    ? 'bg-blue-50/70 border-l-4 border-blue-600'
                    : 'hover:bg-slate-50 border-l-4 border-transparent'
                }`}
              >
                <div className="pr-8">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="line-clamp-1 text-xs font-bold text-slate-900 group-hover:text-blue-900">
                      {note.title || 'Ghi chú chưa đặt tên'}
                    </h3>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                      {note.mode}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 leading-relaxed">
                    {note.content ? note.content.replace(/[*#>`]/g, '') : 'Ghi chú trống...'}
                  </p>
                  {note.tags && note.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {note.tags.map(tag => (
                        <span
                          key={tag}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    removeNote(note.id);
                  }}
                  title="Xóa nhanh"
                  className="absolute right-2.5 top-3 flex h-7 w-7 items-center justify-center rounded text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <i className="fa-solid fa-trash-can text-xs" />
                </button>
              </article>
            );
          })}
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Top Header */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {editing ? 'Chế độ soạn thảo' : 'Xem ghi chú'}
            </span>
            <h2 className="mt-0.5 truncate text-lg font-bold text-slate-900">
              {editing
                ? draft.title || 'Ghi chú mới'
                : selectedNote ? selectedNote.title : 'Chọn một ghi chú bên trái'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setListCollapsed(v => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              title={listCollapsed ? 'Hiện danh sách ghi chú' : 'Toàn màn hình tập trung'}
            >
              <i className={`fa-solid ${listCollapsed ? 'fa-table-columns' : 'fa-maximize'}`} />
              <span>{listCollapsed ? 'Hiện danh sách' : 'Tập trung'}</span>
            </button>

            {selectedNote && !editing && (
              <>
                <button
                  onClick={() => togglePinNote(selectedNote)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    (selectedNote.tags || []).includes('pinned')
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Ghim note lên đầu danh sách"
                >
                  <i className="fa-solid fa-thumbtack text-xs" />
                  <span>{(selectedNote.tags || []).includes('pinned') ? 'Đã ghim' : 'Ghim'}</span>
                </button>
                <button
                  onClick={copyNoteContent}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  title="Sao chép nội dung ghi chú"
                >
                  <i className={`fa-solid ${copied ? 'fa-check text-emerald-500' : 'fa-copy'}`} />
                  <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>

                <button
                  onClick={() => startEdit(selectedNote)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600"
                >
                  <i className="fa-solid fa-pen" />
                  <span>Chỉnh sửa</span>
                </button>

                <button
                  onClick={() => removeNote(selectedNote.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Workspace Body */}
        {editing ? (
          <div className="flex flex-1 flex-col overflow-hidden p-4 space-y-3">
            {/* Title & Mode controls */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={draft.title}
                onChange={event => setDraft(prev => ({ ...prev, title: event.target.value }))}
                placeholder="Tiêu đề ghi chú..."
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
              />

              <div className="flex items-center gap-2">
                <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, mode: 'markdown' }))}
                    className={`rounded px-2.5 py-1 transition ${
                      draft.mode !== 'plain' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, mode: 'plain' }))}
                    className={`rounded px-2.5 py-1 transition ${
                      draft.mode === 'plain' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Văn bản thuần
                  </button>
                </div>

                {/* Split / Edit / Preview Selector */}
                <div className="hidden lg:flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setEditViewMode('split')}
                    className={`rounded px-2 py-1 transition ${
                      editViewMode === 'split' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                    title="Chia đôi màn hình: Vừa gõ vừa xem"
                  >
                    Chia đôi
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditViewMode('edit-only')}
                    className={`rounded px-2 py-1 transition ${
                      editViewMode === 'edit-only' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Soạn thảo
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditViewMode('preview-only')}
                    className={`rounded px-2 py-1 transition ${
                      editViewMode === 'preview-only' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Xem trước
                  </button>
                </div>
              </div>
            </div>

            {/* Markdown Toolbar */}
            <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-slate-200 bg-slate-100/80 px-2.5 py-1.5 text-xs">
              <button
                type="button"
                onClick={() => insertTextAtCursor('**', '**')}
                className="rounded px-2 py-1 font-bold text-slate-700 hover:bg-slate-200"
                title="In đậm (Bold)"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => insertTextAtCursor('*', '*')}
                className="rounded px-2 py-1 italic font-serif text-slate-700 hover:bg-slate-200"
                title="In nghiêng (Italic)"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => insertTextAtCursor('### ')}
                className="rounded px-2 py-1 font-bold text-slate-700 hover:bg-slate-200"
                title="Tiêu đề H3"
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => insertTextAtCursor('`', '`')}
                className="rounded px-2 py-1 font-mono text-slate-700 hover:bg-slate-200"
                title="Code inline"
              >
                &lt;/&gt;
              </button>
              <button
                type="button"
                onClick={() => insertTextAtCursor('\n```javascript\n', '\n```\n')}
                className="rounded px-2 py-1 font-mono text-slate-700 hover:bg-slate-200"
                title="Khối mã (Code block)"
              >
                Khối Code
              </button>
              <button
                type="button"
                onClick={() => insertTextAtCursor('\n> ')}
                className="rounded px-2 py-1 text-slate-700 hover:bg-slate-200 font-semibold"
                title="Trích dẫn (Blockquote)"
              >
                <i className="fa-solid fa-quote-left text-xs mr-1" />
                Trích dẫn
              </button>
              <button
                type="button"
                onClick={() => insertTextAtCursor('\n1. ')}
                className="rounded px-2 py-1 text-slate-700 hover:bg-slate-200 font-semibold"
                title="Danh sách số"
              >
                1.
              </button>
              <button
                type="button"
                onClick={() => insertTextAtCursor('\n- ')}
                className="rounded px-2 py-1 text-slate-700 hover:bg-slate-200 font-semibold"
                title="Gạch đầu dòng"
              >
                •
              </button>
              <button
                type="button"
                onClick={() => insertTextAtCursor('\n- [ ] ')}
                className="rounded px-2 py-1 text-slate-700 hover:bg-slate-200 font-semibold"
                title="Task checklist"
              >
                ☑ Task
              </button>

              <div className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <span className="flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-blue-700 border border-blue-200">
                  <i className="fa-solid fa-paste text-[10px]" />
                  Paste giữ nguyên format (Word/Web)
                </span>
              </div>
            </div>

            {/* Split Editor / Preview Area */}
            <div className={`grid flex-1 gap-3 overflow-hidden ${
              editViewMode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'
            }`}>
              {(editViewMode === 'split' || editViewMode === 'edit-only') && (
                <textarea
                  ref={contentTextareaRef}
                  value={draft.content}
                  onChange={event => setDraft(prev => ({ ...prev, content: event.target.value }))}
                  onPaste={e => {
                    handleSmartPaste(e, md => {
                      const textarea = contentTextareaRef.current;
                      if (!textarea) return;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const current = draft.content || '';
                      const next = current.substring(0, start) + md + current.substring(end);
                      setDraft(prev => ({ ...prev, content: next }));
                    });
                  }}
                  placeholder="Gõ hoặc dán nội dung (hỗ trợ chuyển đổi tự động từ Word / ChatGPT sang Markdown)..."
                  rows={16}
                  className="h-full min-h-[320px] w-full resize-none rounded-b-lg border border-slate-200 bg-slate-50/50 p-4 font-mono text-xs leading-relaxed text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
                />
              )}

              {(editViewMode === 'split' || editViewMode === 'preview-only') && (
                <div className="h-full min-h-[320px] overflow-y-auto rounded-b-lg border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Xem trước kết quả:
                  </div>
                  {draft.mode === 'plain' ? (
                    <div className="whitespace-pre-wrap text-sm text-slate-800">{draft.content}</div>
                  ) : (
                    <MarkdownRenderer content={draft.content} />
                  )}
                </div>
              )}
            </div>

            {/* Tags and Action Bar */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={(draft.tags || []).join(', ')}
                onChange={event => updateTags(event.target.value)}
                placeholder="Tags, ngăn cách bằng dấu phẩy (vd: Golang, React, Architecture)..."
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    if (selectedNote) setDraft(selectedNote);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
                >
                  <i className="fa-solid fa-floppy-disk" />
                  <span>{saving ? 'Đang lưu...' : 'Lưu ghi chú'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : selectedNote ? (
          /* View Mode */
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Ngày tạo: {new Date(selectedNote.createdAt).toLocaleDateString('vi-VN')}</span>
                <span>Chế độ: {selectedNote.mode}</span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {selectedNote.title || 'Ghi chú chưa đặt tên'}
              </h1>
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedNote.tags.map(tag => (
                    <span
                      key={tag}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              {selectedNote.mode === 'plain' ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                  {selectedNote.content}
                </div>
              ) : (
                <MarkdownRenderer content={selectedNote.content} />
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <i className="fa-solid fa-note-sticky text-2xl" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              Chọn ghi chú hoặc tạo mới
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Hỗ trợ Markdown chuẩn, code syntax highlighting, copy 1-click và dán trực tiếp từ Word hoặc internet mà không vỡ format.
            </p>
            <button
              onClick={startNew}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              <i className="fa-solid fa-plus text-xs" />
              <span>Tạo note đầu tiên</span>
            </button>
          </div>
        )}

        {message && (
          <div className="border-t border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800">
            {message}
          </div>
        )}
      </main>
    </div>
  );
};

export default NoteDashboard;
