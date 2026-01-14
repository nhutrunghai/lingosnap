
import { ExerciseItem, ExerciseType } from "../types";
import { CONFIG } from "../config";

const getScriptUrl = () => {
  return localStorage.getItem('lingosnap_script_url') || CONFIG.GOOGLE_SCRIPT_URL;
};

// Hàm hỗ trợ làm sạch dữ liệu từ Sheet (loại bỏ chuỗi "undefined")
const cleanValue = (val: any): string => {
  if (val === undefined || val === null) return "";
  const s = String(val).trim();
  return (s.toLowerCase() === "undefined" || s.toLowerCase() === "null") ? "" : s;
};

export const fetchSheetData = async (): Promise<ExerciseItem[]> => {
  const url = getScriptUrl();
  try {
    const response = await fetch(`${url}?cache=${Date.now()}`);
    if (!response.ok) throw new Error("Network response was not ok");
    
    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      // Xử lý an toàn cột options
      let parsedOptions: string[] = [];
      try {
        const optionsStr = cleanValue(item.options);
        if (optionsStr && optionsStr !== "[]") {
          parsedOptions = JSON.parse(optionsStr);
        } else if (Array.isArray(item.options)) {
          parsedOptions = item.options;
        }
      } catch (e) {
        parsedOptions = [];
      }

      // Lấy giá kỳ giá trị nào có sẵn (ưu tiên key mới, fallback key cũ)
      const question = cleanValue(item.question) || cleanValue(item.english);
      const answer = cleanValue(item.answer) || cleanValue(item.vietnamese);
      const type = (cleanValue(item.type) || 'VOCAB') as ExerciseType;

      return {
        id: Math.random().toString(36).substr(2, 9),
        listId: cleanValue(item.listId) || "default",
        type: type,
        instruction: cleanValue(item.instruction) || (type === 'VOCAB' ? 'Dịch từ vựng' : 'Làm bài tập'),
        question: question,
        answer: answer,
        options: parsedOptions,
        dateLearned: cleanValue(item.dateLearned) || new Date().toLocaleDateString('vi-VN')
      };
    });
  } catch (error) {
    console.error("Lỗi đọc Google Sheets:", error);
    return [];
  }
};

export const saveToSheet = async (items: ExerciseItem[]): Promise<boolean> => {
  if (items.length === 0) return true;
  const url = getScriptUrl();
  
  try {
    // Đóng gói dữ liệu cực kỳ an toàn
    const payload = {
      action: 'ADD',
      data: items.map(i => ({
        // Luôn đảm bảo có giá trị chuỗi, không bao giờ để undefined
        question: String(i.question || "").trim(),
        answer: String(i.answer || "").trim(),
        dateLearned: String(i.dateLearned || new Date().toLocaleDateString('vi-VN')),
        listId: String(i.listId || "default").trim(),
        type: String(i.type || "VOCAB"),
        instruction: String(i.instruction || "").trim(),
        options: JSON.stringify(i.options || []),
        
        // Gửi kèm cả key cũ để tương thích với mọi phiên bản Script
        english: String(i.question || "").trim(),
        vietnamese: String(i.answer || "").trim()
      }))
    };

    // Sử dụng fetch với text/plain để tránh lỗi CORS phức tạp của Google Apps Script
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    
    return true;
  } catch (error) {
    console.error("Lỗi ghi Google Sheets:", error);
    return false;
  }
};

export const deleteListFromSheet = async (listId: string): Promise<boolean> => {
  const url = getScriptUrl();
  try {
    const payload = {
      action: 'DELETE',
      listId: String(listId).trim() 
    };

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    
    return true;
  } catch (error) {
    console.error("Lỗi xóa trên Google Sheets:", error);
    return false;
  }
};
