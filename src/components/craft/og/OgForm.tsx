import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getOgShortLinkCount, insertOgShortLink } from "@/db/og";
import { debounce } from "es-toolkit";
import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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

  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const count = await getOgShortLinkCount();
      setCount(count ?? 0);
    };
    updateCount();

    const polling = setInterval(updateCount, 3000);
    return () => clearInterval(polling);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const shortLink = await insertOgShortLink(title, description);
    const url = `${location.origin}/craft/og/${shortLink}`;
    await navigator.clipboard.writeText(url);

    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 1000);

    const count = await getOgShortLinkCount();
    setCount(count ?? 0);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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

        <div className="flex items-center gap-4 self-end">
          <p className="text-muted-foreground text-sm">
            {count}
            {lang === "ko"
              ? "개의 링크가 지금까지 만들어졌어요!"
              : " links created so far!"}
          </p>
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
        </div>
      </form>

      <Separator />

      <div className="space-y-4">
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
    </>
  );
}
