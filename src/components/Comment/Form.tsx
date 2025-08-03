"use client";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/i18n/utils";
import { getProfileFromDB } from "@/db/auth";
import { createCommentInDB } from "@/db/comment/create";

type CommentFormProps = {
  lang: string;
  postId: string;
  isCommentEmpty: boolean;
  refresh: () => Promise<void>;
};

export default function CommentForm({
  lang,
  postId,
  isCommentEmpty,
  refresh,
}: CommentFormProps) {
  const t = useTranslations(lang)("Comment");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async () => {
    if (isLoading) return;

    setIsLoading(true);

    const profile = await getProfileFromDB();
    if (!profile) {
      setIsLoading(false);
      return;
    }

    await createCommentInDB(postId, content, profile.id);
    await refresh();
    setContent("");

    setIsLoading(false);
  };

  return (
    <div className="relative">
      <Textarea
        name="content"
        placeholder={`${t.placeholder} ${isCommentEmpty ? t.noComments : ""}`}
        className="min-h-32 resize-none"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />
      <Button
        type="button"
        variant="secondary"
        disabled={isLoading}
        className="absolute right-4 bottom-4"
        onClick={onSubmit}
      >
        <Pencil />
        {isLoading ? t.submitting : t.submit}
      </Button>
    </div>
  );
}
