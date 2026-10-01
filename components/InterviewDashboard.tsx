import React, { useEffect, useMemo, useRef, useState } from 'react';
import { InterviewItem } from '../types';
import { deleteInterviewItem, fetchInterviewItems, isSupabaseConfigured, saveInterviewItem } from '../services/supabaseService';
import MarkdownRenderer from './MarkdownRenderer';
import { handleSmartPaste } from '../services/clipboardService';

const emptyDraft: Partial<InterviewItem> & { question: string; answer: string; note: string } = {
  question: '',
  answer: '',
  note: '',
  tags: [],
  reviewed: false,
};

const InterviewDashboard: React.FC = () => {
  const [items, setItems] = useState<InterviewItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState<'write' | 'preview'>('write');
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [filter, setFilter] = useState<'all' | 'reviewed' | 'pending'>('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [hideAnswerMode, setHideAnswerMode] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  const answerInputRef = useRef<HTMLTextAreaElement>(null);

  const selected = items.find(item => item.id === selectedId) || null;

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach(item => (item.tags || []).forEach(tag => tagSet.add(tag.trim())));
    return Array.from(tagSet).filter(Boolean);
  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter(item => {
      const matchesFilter =
        filter === 'all' || (filter === 'reviewed' ? item.reviewed : !item.reviewed);
      const matchesTag =
        selectedTag === 'all' || (item.tags || []).some(t => t.toLowerCase() === selectedTag.toLowerCase());
      const matchesSearch =
        !keyword ||
        [item.question, item.answer, item.note, ...(item.tags || [])].some(value =>
          (value || '').toLowerCase().includes(keyword)
        );
      return matchesFilter && matchesTag && matchesSearch;
    });
  }, [items, query, filter, selectedTag]);

  const loadItems = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const data = await fetchInterviewItems();
      setItems(data);
      setSelectedId(current => current || data[0]?.id || null);
    } catch (error) {
      console.error(error);
      setMessage('Không tải được dữ liệu phỏng vấn. Hãy kiểm tra Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Reset answer revealed state when selection changes
  useEffect(() => {
    setIsAnswerRevealed(false);
  }, [selectedId]);

  const startNew = () => {
    setDraft(emptyDraft);
    setSelectedId(null);
    setEditing(true);
    setEditTab('write');
    setMessage('');
  };

  const startEdit = (item: InterviewItem) => {
    setDraft({ ...item });
    setSelectedId(item.id);
    setEditing(true);
    setEditTab('write');
    setMessage('');
  };

  const saveDraft = async () => {
    if (!draft.question.trim()) {
      setMessage('Hãy nhập câu hỏi trước khi lưu.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const saved = await saveInterviewItem({
        ...draft,
        question: draft.question.trim(),
        answer: draft.answer || '',
        note: draft.note || '',
        tags: draft.tags || [],
      });
      setItems(previous => [saved, ...previous.filter(item => item.id !== saved.id)]);
      setSelectedId(saved.id);
      setDraft(saved);
      setEditing(false);
      setMessage('Đã lưu câu hỏi phỏng vấn.');
    } catch (error) {
      console.error(error);
      setMessage('Không lưu được dữ liệu phỏng vấn.');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (id: string) => {
    if (!confirm('Xóa câu hỏi phỏng vấn này?')) return;
    try {
      await deleteInterviewItem(id);
      const remaining = items.filter(item => item.id !== id);
      setItems(remaining);
      if (selectedId === id) {
        setSelectedId(remaining[0]?.id || null);
        setEditing(false);
        setDraft(emptyDraft);
      }
    } catch (error) {
      console.error(error);
      setMessage('Không xóa được mục này.');
    }
  };

  const toggleReviewed = async (item: InterviewItem) => {
    try {
      const saved = await saveInterviewItem({ ...item, reviewed: !item.reviewed });
      setItems(previous => previous.map(current => (current.id === saved.id ? saved : current)));
      if (selectedId === saved.id) setDraft(saved);
    } catch (error) {
      console.error(error);
      setMessage('Không cập nhật được trạng thái ôn tập.');
    }
  };

  const updateTags = (value: string) => {
    setDraft(previous => ({
      ...previous,
      tags: value.split(',').map(tag => tag.trim()).filter(Boolean),
    }));
  };

  const copyAnswer = () => {
    if (!selected?.answer) return;
    navigator.clipboard.writeText(selected.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to insert markdown tokens at cursor in answer textarea
  const insertTextAtCursor = (prefix: string, suffix: string = '') => {
    const textarea = answerInputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = draft.answer || '';
    const selectedText = currentVal.substring(start, end);

    const replacement = `${prefix}${selectedText || 'nội dung'}${suffix}`;
    const nextVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

    setDraft(prev => ({ ...prev, answer: nextVal }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText ? selectedText.length : 8));
    }, 50);
  };

  const reviewedCount = items.filter(item => item.reviewed).length;

  return (
    <div className="grid min-h-[78vh] gap-5 xl:grid-cols-[380px_1fr]">
      {/* Sidebar: Question List */}
      <aside className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Header Controls */}
        <div className="border-b border-slate-100 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-violet-600" />
                <h2 className="text-base font-bold text-slate-900">Ôn Phỏng Vấn</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Lưu câu trả lời &amp; mẹo ghi điểm</p>
            </div>
            <button
              onClick={startNew}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-600"
            >
              <i className="fa-solid fa-plus text-[10px]" />
              <span>Thêm câu</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs font-semibold">
            <div className="rounded-lg bg-slate-100 py-1.5 text-slate-700">
              Tổng cộng: <strong className="text-slate-900">{items.length}</strong>
            </div>
            <div className="rounded-lg bg-emerald-50 py-1.5 text-emerald-700">
              Đã ôn: <strong className="text-emerald-800">{reviewedCount}</strong> ({items.length ? Math.round((reviewedCount / items.length) * 100) : 0}%)
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Tìm theo câu hỏi, từ khóa, tag..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
            />
          </div>

          {/* Review Filter */}
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-[11px] font-semibold">
            {(
              [
                ['all', 'Tất cả'],
                ['pending', `Chưa ôn (${items.length - reviewedCount})`],
                ['reviewed', `Đã ôn (${reviewedCount})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`flex-1 rounded-md py-1 text-center transition ${
                  filter === value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              <button
                onClick={() => setSelectedTag('all')}
                className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${
                  selectedTag === 'all'
                    ? 'bg-violet-600 text-white'
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
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Question List Scroll */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[60vh] xl:max-h-[68vh]">
          {loading && <div className="p-6 text-center text-xs font-medium text-slate-400">Đang tải câu hỏi...</div>}
          {!loading && filteredItems.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400">
              Không tìm thấy câu hỏi phù hợp.
            </div>
          )}
          {filteredItems.map(item => {
            const isCurrent = selectedId === item.id && !editing;
            return (
              <article
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setDraft(item);
                  setEditing(false);
                  setMessage('');
                }}
                className={`group cursor-pointer p-3.5 transition ${
                  isCurrent
                    ? 'bg-violet-50/70 border-l-4 border-violet-600'
                    : 'hover:bg-slate-50 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      toggleReviewed(item);
                    }}
                    title={item.reviewed ? 'Đã ôn - Nhấn để bỏ' : 'Đánh dấu đã ôn'}
                    className="mt-0.5 flex-shrink-0 text-slate-300 hover:text-emerald-600 transition"
                  >
                    <i
                      className={`fa-solid ${
                        item.reviewed
                          ? 'fa-circle-check text-emerald-500'
                          : 'fa-circle text-slate-300 group-hover:text-slate-400'
                      } text-sm`}
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-xs font-bold text-slate-900 group-hover:text-violet-900">
                      {item.question}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                      {item.answer ? item.answer.replace(/[*#>`]/g, '') : 'Chưa có câu trả lời mẫu.'}
                    </p>
                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map(tag => (
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
                </div>
              </article>
            );
          })}
        </div>
      </aside>

      {/* Main Workspace: Viewer / Editor */}
      <main className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Header Action Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {editing ? 'Chế độ chỉnh sửa' : 'Ôn tập câu hỏi'}
            </span>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">
              {editing
                ? draft.question ? draft.question : 'Soạn câu hỏi mới'
                : selected ? selected.question : 'Chọn một câu hỏi bên trái'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selected && !editing && (
              <>
                <button
                  onClick={() => setHideAnswerMode(prev => !prev)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    hideAnswerMode
                      ? 'border-violet-300 bg-violet-50 text-violet-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Chế độ luyện phản xạ: Ẩn câu trả lời để bạn tự nhẩm trước"
                >
                  <i className={`fa-solid ${hideAnswerMode ? 'fa-eye' : 'fa-eye-slash'}`} />
                  <span>{hideAnswerMode ? 'Đang ẩn câu trả lời' : 'Luyện phản xạ'}</span>
                </button>

                <button
                  onClick={copyAnswer}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  title="Sao chép toàn bộ câu trả lời"
                >
                  <i className={`fa-solid ${copied ? 'fa-check text-emerald-500' : 'fa-copy'}`} />
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>

                <button
                  onClick={() => toggleReviewed(selected)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    selected.reviewed
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  <i className={`fa-solid ${selected.reviewed ? 'fa-circle-check' : 'fa-check'}`} />
                  <span>{selected.reviewed ? 'Đã thuộc / Đã ôn' : 'Đánh dấu đã ôn'}</span>
                </button>

                <button
                  onClick={() => startEdit(selected)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-600"
                >
                  <i className="fa-solid fa-pen-to-square" />
                  <span>Chỉnh sửa</span>
                </button>

                <button
                  onClick={() => removeItem(selected.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                  title="Xóa câu này"
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        {editing ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Question Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Câu hỏi phỏng vấn <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={draft.question}
                onChange={event => setDraft(prev => ({ ...prev, question: event.target.value }))}
                onPaste={e => {
                  handleSmartPaste(e, md => {
                    setDraft(prev => ({ ...prev, question: (prev.question ? prev.question + '\n' : '') + md }));
                  });
                }}
                placeholder="Ví dụ: Thiết kế hệ thống Real-time Chat như thế nào? hoặc Design Pattern là gì?"
                rows={2}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400 focus:bg-white"
              />
            </div>

            {/* Answer Editor with Smart Paste & Formatting Toolbar */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Câu trả lời mẫu &amp; ví dụ thực chiến
                </label>
                {/* Write / Preview Tab */}
                <div className="flex gap-1 rounded-md bg-slate-100 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setEditTab('write')}
                    className={`rounded px-2.5 py-1 transition ${
                      editTab === 'write' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Soạn thảo
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTab('preview')}
                    className={`rounded px-2.5 py-1 transition ${
                      editTab === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Xem trước (Preview)
                  </button>
                </div>
              </div>

              {/* Formatting Toolbar */}
              <div className="mt-2 flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-slate-200 bg-slate-100/80 px-2.5 py-1.5 text-xs">
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
                  onClick={() => insertTextAtCursor('`', '`')}
                  className="rounded px-2 py-1 font-mono text-slate-700 hover:bg-slate-200"
                  title="Code / Thuật ngữ"
                >
                  &lt;/&gt;
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor('\n> ')}
                  className="rounded px-2 py-1 text-slate-700 hover:bg-slate-200 font-semibold"
                  title="Khung trích dẫn / Blockquote (như trong ảnh mẫu)"
                >
                  <i className="fa-solid fa-quote-left text-xs mr-1" />
                  Trích dẫn
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor('\n1. ')}
                  className="rounded px-2 py-1 text-slate-700 hover:bg-slate-200 font-semibold"
                  title="Danh sách đánh số (1. 2. 3.)"
                >
                  1.
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor('\n- ')}
                  className="rounded px-2 py-1 text-slate-700 hover:bg-slate-200 font-semibold"
                  title="Danh sách gạch đầu dòng"
                >
                  •
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor('\nMẹo phỏng vấn: ')}
                  className="rounded px-2 py-1 text-amber-700 hover:bg-amber-100 font-semibold"
                  title="Thêm khung Mẹo phỏng vấn"
                >
                  💡 Mẹo
                </button>

                <div className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <span className="flex items-center gap-1 rounded bg-violet-50 px-2 py-0.5 text-violet-700 border border-violet-200">
                    <i className="fa-solid fa-paste text-[10px]" />
                    Hỗ trợ Paste tự động giữ format (Word/Web)
                  </span>
                </div>
              </div>

              {editTab === 'write' ? (
                <textarea
                  ref={answerInputRef}
                  value={draft.answer}
                  onChange={event => setDraft(prev => ({ ...prev, answer: event.target.value }))}
                  onPaste={e => {
                    handleSmartPaste(e, md => {
                      const textarea = answerInputRef.current;
                      if (!textarea) return;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const current = draft.answer || '';
                      const next = current.substring(0, start) + md + current.substring(end);
                      setDraft(prev => ({ ...prev, answer: next }));
                    });
                  }}
                  placeholder="Dán câu trả lời từ Word, web hoặc ChatGPT vào đây (tự động nhận diện bold, danh sách số, code, trích dẫn)..."
                  rows={9}
                  className="w-full rounded-b-lg border border-slate-200 bg-slate-50/50 p-3.5 text-sm font-medium leading-relaxed text-slate-900 outline-none focus:border-violet-400 focus:bg-white"
                />
              ) : (
                <div className="min-h-[220px] rounded-b-lg border border-slate-200 bg-white p-4">
                  <MarkdownRenderer content={draft.answer} />
                </div>
              )}
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Ghi chú cá nhân / Điểm cần lưu ý khi trả lời
              </label>
              <textarea
                value={draft.note}
                onChange={event => setDraft(prev => ({ ...prev, note: event.target.value }))}
                onPaste={e => {
                  handleSmartPaste(e, md => {
                    setDraft(prev => ({ ...prev, note: (prev.note ? prev.note + '\n' : '') + md }));
                  });
                }}
                placeholder="Ví dụ: Điểm quan trọng là nhấn mạnh loose-coupling và kinh nghiệm thực chiến với Singleton..."
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-amber-50/40 p-3 text-sm font-medium text-slate-800 outline-none focus:border-violet-400 focus:bg-white"
              />
            </div>

            {/* Tags Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Thẻ phân loại (ngăn cách bằng dấu phẩy)
              </label>
              <input
                value={(draft.tags || []).join(', ')}
                onChange={event => updateTags(event.target.value)}
                placeholder="Ví dụ: System Design, Frontend, React, Behavior, Architecture"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-violet-400 focus:bg-white"
              />
            </div>

            {/* Bottom Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  if (selected) setDraft(selected);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-600 disabled:opacity-50"
              >
                <i className="fa-solid fa-floppy-disk" />
                <span>{saving ? 'Đang lưu...' : 'Lưu câu hỏi'}</span>
              </button>
            </div>
          </div>
        ) : selected ? (
          /* View Mode */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Question Heading */}
            <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600">
                  Câu hỏi phỏng vấn
                </span>
                <span className="text-xs font-medium text-slate-400">
                  Cập nhật: {new Date(selected.updatedAt || selected.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <div className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-snug">
                {selected.question}
              </div>
              {selected.tags && selected.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.tags.map(tag => (
                    <span
                      key={tag}
                      className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Answer Section with Mock Mode & Rich Markdown */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Câu trả lời mẫu &amp; Kiến trúc giải pháp
                </h3>
              </div>

              {hideAnswerMode && !isAnswerRevealed ? (
                <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/40 p-8 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <i className="fa-solid fa-brain text-xl" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Chế độ luyện phản xạ phỏng vấn</h4>
                    <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                      Hãy tự nhẩm hoặc trả lời thành tiếng câu hỏi trên trước khi mở đáp án để rèn luyện trí nhớ và phản xạ thực chiến.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAnswerRevealed(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700"
                  >
                    <i className="fa-solid fa-eye" />
                    <span>Hiện câu trả lời mẫu</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <MarkdownRenderer content={selected.answer} />
                </div>
              )}
            </section>

            {/* Personal Notes */}
            {selected.note && (
              <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-2">
                  <i className="fa-solid fa-bookmark text-amber-600" />
                  <span>Ghi chú riêng &amp; Lưu ý khi phỏng vấn</span>
                </div>
                <div className="text-sm text-slate-800 leading-relaxed">
                  <MarkdownRenderer content={selected.note} />
                </div>
              </section>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <i className="fa-solid fa-comments text-2xl" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              Chọn câu hỏi để ôn tập hoặc thêm câu mới
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Dán câu trả lời từ Word, web hoặc tài liệu vào đây để tự động giữ định dạng trích dẫn, danh sách số, thuật ngữ và ví dụ.
            </p>
            <button
              onClick={startNew}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-700"
            >
              <i className="fa-solid fa-plus text-xs" />
              <span>Thêm câu hỏi mới</span>
            </button>
          </div>
        )}

        {/* Global Feedback Banner */}
        {message && (
          <div className="border-t border-violet-100 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-800">
            {message}
          </div>
        )}
      </main>
    </div>
  );
};

export default InterviewDashboard;
