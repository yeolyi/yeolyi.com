const TEMP_USER_ID_KEY = "temp_user_id";

function getTempUserId(): string {
  if (typeof window === "undefined") {
    return "temp-server-user";
  }

  const existingId = localStorage.getItem(TEMP_USER_ID_KEY);

  if (existingId) {
    return existingId;
  }

  const newId = crypto.randomUUID();
  localStorage.setItem(TEMP_USER_ID_KEY, newId);

  return newId;
}

export const tempUserId = getTempUserId();
