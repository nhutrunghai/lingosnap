import { ExerciseItem, ExerciseType } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-4o-mini';

const getOpenAIConfig = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  const model = (import.meta.env.VITE_OPENAI_MODEL as string | undefined) || DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error('Chưa cấu hình VITE_OPENAI_API_KEY.');
  }

  return { apiKey, model };
};

const cleanJson = (text: string) => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
};

const normalizeType = (type: string): ExerciseType => {
  const allowed: ExerciseType[] = ['VOCAB', 'MATCHING', 'FILL_BLANK', 'REWRITE', 'MULTIPLE_CHOICE'];
  return allowed.includes(type as ExerciseType) ? type as ExerciseType : 'VOCAB';
};

export const extractExercisesFromImage = async (base64Image: string): Promise<ExerciseItem[]> => {
  const { apiKey, model } = getOpenAIConfig();

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_output_tokens: 1800,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Đọc ảnh bài tập tiếng Anh và trả về duy nhất JSON array.
Mỗi phần tử có schema:
{
  "type": "VOCAB" | "MATCHING" | "FILL_BLANK" | "REWRITE" | "MULTIPLE_CHOICE",
  "instruction": "hướng dẫn ngắn bằng tiếng Việt",
  "question": "câu hỏi/từ/câu tiếng Anh trong ảnh",
  "answer": "đáp án đúng",
  "options": ["các lựa chọn nếu có"]
}
Quy tắc:
- Không markdown, không giải thích, chỉ JSON array hợp lệ.
- Giữ câu hỏi tiếng Anh như trong ảnh.
- Nếu chỉ là từ vựng, dùng type VOCAB.
- Nếu không có lựa chọn, options là [].`,
            },
            {
              type: 'input_image',
              image_url: base64Image,
              detail: 'low',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI request failed: ${message}`);
  }

  const payload = await response.json();
  const outputText = payload.output_text || payload.output?.flatMap((item: any) => item.content || []).map((content: any) => content.text || '').join('') || '[]';
  const data = JSON.parse(cleanJson(outputText));

  if (!Array.isArray(data)) return [];

  return data.map((item: any) => ({
    id: crypto.randomUUID(),
    listId: '',
    type: normalizeType(String(item.type || 'VOCAB')),
    instruction: String(item.instruction || 'Làm bài tập'),
    question: String(item.question || ''),
    answer: String(item.answer || ''),
    options: Array.isArray(item.options) ? item.options.map(String) : [],
    dateLearned: new Date().toLocaleDateString('vi-VN'),
  })).filter(item => item.question || item.answer);
};
