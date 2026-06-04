import { createClient } from '@supabase/supabase-js';
import { ExerciseItem, PomodoroSession } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

export const getCurrentUserId = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
};

const ownerId = async () => {
  const id = await getCurrentUserId();
  if (!id) throw new Error('Bạn cần đăng nhập Supabase trước.');
  return id;
};

const normalizeExercise = (item: any): ExerciseItem => ({
  id: String(item.id || crypto.randomUUID()),
  listId: String(item.list_id || item.listId || 'default'),
  type: item.type || 'VOCAB',
  imageB64: item.image_b64 || item.imageB64 || '',
  instruction: item.instruction || '',
  question: item.question || '',
  answer: item.answer || '',
  options: Array.isArray(item.options) ? item.options : [],
  dateLearned: item.date_learned || item.dateLearned || new Date().toLocaleDateString('vi-VN'),
});

export const fetchVocabulary = async (): Promise<ExerciseItem[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('exercise_items')
    .select('*')
    .eq('owner_id', await ownerId())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeExercise);
};

export const saveVocabularyList = async (items: ExerciseItem[]): Promise<boolean> => {
  if (!supabase || items.length === 0) return false;

  const userId = await ownerId();
  const { error } = await supabase.from('exercise_items').upsert(
    items.map(item => ({
      id: item.id || crypto.randomUUID(),
      owner_id: userId,
      list_id: item.listId || 'default',
      type: item.type || 'VOCAB',
      image_b64: (item as any).imageB64 || '',
  imageB64: item.image_b64 || item.imageB64 || '',
      instruction: item.instruction || '',
      question: item.question || '',
      answer: item.answer || '',
      options: item.options || [],
      date_learned: item.dateLearned || new Date().toLocaleDateString('vi-VN'),
    })),
    { onConflict: 'id' }
  );

  if (error) throw error;
  return true;
};

export const deleteVocabularyList = async (listId: string): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase
    .from('exercise_items')
    .delete()
    .eq('owner_id', await ownerId())
    .eq('list_id', listId);

  if (error) throw error;
  return true;
};

export const fetchPomodoroSessions = async (): Promise<PomodoroSession[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('*')
    .eq('owner_id', await ownerId())
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    completedAt: row.completed_at,
    studyDate: row.study_date,
    minutes: row.minutes,
  }));
};

export const savePomodoroSession = async (minutes: number): Promise<PomodoroSession> => {
  if (!supabase) throw new Error('Supabase is not configured');

  const completedAt = new Date();
  const userId = await ownerId();
  const session = {
    owner_id: userId,
    completed_at: completedAt.toISOString(),
    study_date: completedAt.toLocaleDateString('sv-SE'),
    minutes,
  };

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .insert(session)
    .select('*')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    completedAt: data.completed_at,
    studyDate: data.study_date,
    minutes: data.minutes,
  };
};




