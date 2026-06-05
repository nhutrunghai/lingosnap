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
      setMessage('Không tải được kho Voca. Kiểm tra bảng voca_words trong Supabase.');
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
      setMessage('Nhập từ vựng trước rồi hãy bấm AI điền.');
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
      setMessage('AI đã điền nghĩa, IPA và ví dụ. Bạn vẫn có thể sửa tay trước khi lưu.');
    } catch (error) {
      console.error(error);
      setMessage('AI chưa điền được. Bạn có thể nhập nghĩa thủ công rồi lưu.');
    } finally {
      setAiLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!draft.word.trim()) {
      setMessage('Từ vựng không được để trống.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const saved = await saveVocaWord(draft);
      setWords(prev => [saved, ...prev.filter(item => item.id !== saved.id)]);
      setDraft(emptyDraft);
      setMessage('Đã lưu vào Voca.');
    } catch (error) {
      console.error(error);
      setMessage('Không lưu được. Nếu mới thêm tính năng này, hãy chạy SQL tạo bảng voca_words trước.');
    } finally {
      setSaving(false);
    }
  };

  const editWord = (item: VocaWord) => {
    setDraft(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeWord = async (id: string) => {
    if (!confirm('Xóa từ này khỏi Voca?')) return;
    try {
      await deleteVocaWord(id);
      setWords(prev => prev.filter(item => item.id !== id));
      if (draft.id === id) setDraft(emptyDraft);
    } catch (error) {
      console.error(error);
      setMessage('Không xóa được từ này.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl shadow-slate-300/50">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Personal Voca</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Kho từ vựng riêng của bạn</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">Chỉ cần nhập từ tiếng Anh, AI có thể tự dịch nghĩa tiếng Việt, thêm IPA và tạo ví dụ. Nếu muốn kiểm soát chính xác hơn, bạn tự sửa nghĩa trước khi lưu.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-3xl bg-white/10 p-4 text-center backdrop-blur">
            <div><div className="text-2xl font-black">{words.length}</div><div className="text-xs font-bold text-slate-300">Từ đã lưu</div></div>
            <div><div className="text-2xl font-black">{words.filter(item => item.ipa).length}</div><div className="text-xs font-bold text-slate-300">Có IPA</div></div>
            <div><div className="text-2xl font-black">{words.filter(item => item.example).length}</div><div className="text-xs font-bold text-slate-300">Có ví dụ</div></div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white p-5 shadow-xl shadow-slate-200/70">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black">{draft.id ? 'Sửa từ vựng' : 'Thêm từ mới'}</h3>
              <p className="text-sm font-semibold text-slate-500">Nhập từ là đủ, các ô khác có thể để AI điền.</p>
            </div>
            {draft.id && <button onClick={() => setDraft(emptyDraft)} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">Tạo mới</button>}
          </div>

          <div className="space-y-3">
            <input value={draft.word} onChange={event => updateDraft('word', event.target.value)} placeholder="Từ vựng, ví dụ: resilient" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
            <input value={draft.ipa || ''} onChange={event => updateDraft('ipa', event.target.value)} placeholder="IPA, ví dụ: /rɪˈzɪliənt/" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
            <textarea value={draft.meaning || ''} onChange={event => updateDraft('meaning', event.target.value)} placeholder="Nghĩa tiếng Việt" rows={3} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
            <textarea value={draft.example || ''} onChange={event => updateDraft('example', event.target.value)} placeholder="Ví dụ" rows={3} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
            <textarea value={draft.note || ''} onChange={event => updateDraft('note', event.target.value)} placeholder="Ghi chú cá nhân, mẹo nhớ..." rows={2} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={fillByAi} disabled={aiLoading || !draft.word.trim()} className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"><i className={`fa-solid ${aiLoading ? 'fa-spinner animate-spin' : 'fa-wand-magic-sparkles'} mr-2`} />AI điền</button>
            <button onClick={saveDraft} disabled={saving || !draft.word.trim()} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-600 disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu Voca'}</button>
          </div>

          {message && <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{message}</div>}
          {!isSupabaseConfigured && <div className="mt-4 rounded-2xl bg-orange-50 p-3 text-sm font-bold text-orange-700">Chưa cấu hình Supabase nên Voca chưa đồng bộ được.</div>}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-[2rem] border border-white/70 bg-white p-4 shadow-xl shadow-slate-200/70 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black">Danh sách từ</h3>
              <p className="text-sm font-semibold text-slate-500">Dữ liệu đồng bộ để mở điện thoại vẫn thấy.</p>
            </div>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm từ hoặc nghĩa..." className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold outline-none focus:border-blue-400 sm:w-72" />
          </div>

          {loading ? (
            <div className="rounded-[2rem] bg-white p-8 text-center font-black text-slate-400 shadow-xl shadow-slate-200/70">Đang tải Voca...</div>
          ) : filteredWords.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-8 text-center font-bold text-slate-400">Chưa có từ nào. Thêm từ đầu tiên ở form bên trái nhé.</div>
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
                  <p className="mt-4 whitespace-pre-line text-sm font-bold leading-6 text-slate-700">{item.meaning || 'Chưa có nghĩa.'}</p>
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
