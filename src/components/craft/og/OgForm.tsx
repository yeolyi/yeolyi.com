import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { debounce } from "es-toolkit";
import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

interface OgFormProps {
  lang: string;
  initialTitle?: string;
  initialDescription?: string;
}

export default function OgForm({
  lang,
  initialTitle,
  initialDescription,
}: OgFormProps) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");

  const [previewTitle, setPreviewTitle] = useState(initialTitle ?? "");
  const debouncedSetPreviewTitle = useCallback(
    debounce(setPreviewTitle, 500),
    [],
  );

  const [isCopied, setIsCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const url = `${location.origin}/${lang}/craft/og/${encodeURIComponent(title)}/${encodeURIComponent(description)}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 1000);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h1 className="text-2xl font-bold">
          {lang === "ko" ? "미리보기 링크 생성기" : "Link Preview Generator"}
        </h1>

        <div className="space-y-2">
          <Label htmlFor="title">{lang === "ko" ? "제목" : "Title"}</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              debouncedSetPreviewTitle(e.target.value);
            }}
            placeholder={lang === "ko" ? "제목을 입력하세요" : "Enter title"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            {lang === "ko" ? "설명" : "Description"}
          </Label>
          <Input
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              lang === "ko" ? "설명을 입력하세요" : "Enter description"
            }
          />
        </div>

        <Button type="submit">
          {isCopied ? <Check /> : <Copy />}
          {isCopied
            ? lang === "ko"
              ? "복사 완료!"
              : "Copied!"
            : lang === "ko"
              ? "URL 복사"
              : "Copy URL"}
        </Button>
      </form>

      <Separator />

      <div className="space-y-4">
        <h2 className="font-bold">{lang === "ko" ? "미리보기" : "Preview"}</h2>

        <div className="border">
          <div className="aspect-[1.91/1] w-full overflow-hidden">
            {previewTitle && (
              <img
                src={`/api/og/${encodeURIComponent(previewTitle)}`}
                alt="OG Image Preview"
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <Separator />
          <div className="flex flex-col p-4">
            <p className="font-black">
              {title === "" ? (lang === "ko" ? "제목" : "Title") : title}
            </p>
            <p>
              {description === ""
                ? lang === "ko"
                  ? "설명"
                  : "Description"
                : description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
