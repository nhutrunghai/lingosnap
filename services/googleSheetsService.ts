
import { VocabItem } from "../types";
import { CONFIG } from "../config";

const getScriptUrl = () => {
  return localStorage.getItem('lingosnap_script_url') || CONFIG.GOOGLE_SCRIPT_URL;
};

export const fetchSheetData = async (): Promise<VocabItem[]> => {
  const url = getScriptUrl();
  try {
    const response = await fetch(`${url}?cache=${Date.now()}`);
    if (!response.ok) throw new Error("Network response was not ok");
    
    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      listId: String(item.listId || "default").trim(),
      english: String(item.english || ""),
      vietnamese: String(item.vietnamese || ""),
      dateLearned: String(item.dateLearned || new Date().toLocaleDateString('vi-VN'))
    }));
  } catch (error) {
    console.error("Lỗi đọc Google Sheets:", error);
    return [];
  }
};

export const saveToSheet = async (items: VocabItem[]): Promise<boolean> => {
  if (items.length === 0) return true;
  const url = getScriptUrl();
  
  try {
    const payload = {
      action: 'ADD',
      data: items.map(i => ({
        listId: String(i.listId).trim(),
        english: i.english,
        vietnamese: i.vietnamese,
        dateLearned: i.dateLearned
      }))
    };

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
