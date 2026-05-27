const STORAGE_KEY = "newspaper_companion_daily_record_v2";

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function loadRecord() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveRecord(record) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}
