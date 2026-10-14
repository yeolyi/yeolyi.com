export const saveJSONToFile = (json: string, filename: string) => {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const selectJSONFromFile = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new DOMException("File selection cancelled", "AbortError"));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    };

    input.addEventListener("cancel", () =>
      reject(new DOMException("File selection cancelled", "AbortError")),
    );

    input.click();
    input.remove();
  });
};
