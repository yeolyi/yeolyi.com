import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getOgShortLinkCount, insertOgShortLink } from "@/db/og";
import { debounce } from "es-toolkit";
import { Blocks, Check, Copy, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface OgFormProps {
  lang: string;
  initialTitle?: string;
  initialDescription?: string;
  initialRedirectUrl?: string;
}

const getInitialPath = (url?: string) => {
  if (!url) {
    return "";
  }
  if (url.startsWith("https://")) {
    return url.substring(8);
  }
  if (url.startsWith("http://")) {
    return url.substring(7);
  }
  return url;
};

export default function OgForm({
  lang,
  initialTitle,
  initialDescription,
  initialRedirectUrl,
}: OgFormProps) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [protocol, setProtocol] = useState<"http://" | "https://">(
    initialRedirectUrl?.startsWith("http://") ? "http://" : "https://",
  );
  const [path, setPath] = useState(getInitialPath(initialRedirectUrl));

  const [previewTitle, setPreviewTitle] = useState(initialTitle ?? "");
  const debouncedSetPreviewTitle = useCallback(
    debounce(setPreviewTitle, 500),
    [],
  );

  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const isDisabled = title === "" || generatedLink !== null;

  const updateCount = useCallback(async () => {
    const count = await getOgShortLinkCount();
    setCount(count ?? 0);
  }, []);

  useEffect(() => {
    updateCount();
    const polling = setInterval(updateCount, 3000);
    return () => clearInterval(polling);
  }, [updateCount]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      const redirectUrl = path ? `${protocol}${path}` : "";
      const shortLink = await insertOgShortLink(
        title,
        description,
        redirectUrl,
      );
      const url = `${location.origin}/craft/og/${shortLink}`;
      setGeneratedLink(url);
      updateCount();
    } catch (error) {
      setError(error instanceof Error ? error.message : "에러가 발생했어요");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="space-y-2">
          <Label htmlFor="title">
            {lang === "ko" ? "제목" : "Title"}
            <span className="text-muted-foreground text-sm">
              {lang === "ko" ? "필수" : "Required"}
            </span>
          </Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setGeneratedLink(null);
              debouncedSetPreviewTitle(e.target.value);
            }}
            placeholder={lang === "ko" ? "점심 ㄱ?" : "Lunch?"}
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
            onChange={(e) => {
              setDescription(e.target.value);
              setGeneratedLink(null);
            }}
            placeholder={
              lang === "ko"
                ? "오늘 점심 돈까스래요"
                : "Today's lunch is burger & fries"
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="redirectUrl">URL</Label>
          <div className="flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">{protocol}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onSelect={() => {
                    setProtocol("https://");
                    setGeneratedLink(null);
                  }}
                >
                  https://
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setProtocol("http://");
                    setGeneratedLink(null);
                  }}
                >
                  http://
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Input
              id="redirectUrl"
              name="redirectUrl"
              type="text"
              value={path}
              onChange={(e) => {
                setPath(e.target.value);
                setGeneratedLink(null);
              }}
              className="rounded-l-none"
              placeholder="google.com"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 self-end">
          {error && <p className="text-red-500">{error}</p>}
          <p className="text-muted-foreground text-sm">
            {count}
            {lang === "ko"
              ? "개의 링크가 지금까지 만들어졌어요!"
              : " links created so far!"}
          </p>
          <Button type="submit" disabled={isDisabled}>
            <Blocks />
            {lang === "ko"
              ? generatedLink
                ? "생성 완료!"
                : "링크 생성"
              : generatedLink
                ? "Created"
                : "Create Link"}
          </Button>
        </div>

        {generatedLink && (
          <div className="flex items-center gap-4 self-end">
            <a
              href={generatedLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground text-sm underline"
            >
              {generatedLink}
            </a>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(generatedLink);
                setIsCopied(true);
                setTimeout(() => {
                  setIsCopied(false);
                }, 1500);
              }}
            >
              {isCopied ? <Check /> : <Copy />}
            </Button>
          </div>
        )}
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
