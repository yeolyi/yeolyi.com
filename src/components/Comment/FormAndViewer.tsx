import CommentForm from "@/components/Comment/Form";
import { useCallback, useEffect, useState } from "react";
import { getCommentsFromDB } from "@/db/comment/read";
import type { Comment } from "@/types/helper.types";
import Viewer from "@/components/Comment/Viewer";
import { useTranslations } from "@/i18n/utils";
import { $sessionStore, login } from "@/stores/session";
import { useStore } from "@nanostores/react";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

interface FormAndViewerProps {
  lang: string;
  postId: string;
}

export default function FormAndViewer({ lang, postId }: FormAndViewerProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const { session } = useStore($sessionStore);

  const refresh = useCallback(async () => {
    const comments = await getCommentsFromDB(postId);
    setComments(comments);
  }, [postId]);

  useEffect(() => {
    // TODO: race condition 처리
    refresh();
  }, [refresh]);

  return (
    <>
      {session ? (
        <CommentForm
          lang={lang}
          postId={postId}
          isCommentEmpty={comments.length === 0}
          refresh={refresh}
        />
      ) : (
        <NeedLogin lang={lang} />
      )}
      <Viewer lang={lang} comments={comments} refresh={refresh} />
    </>
  );
}

function NeedLogin({ lang }: { lang: string }) {
  const t = useTranslations(lang)("Comment");
  const { isLoading } = useStore($sessionStore);

  return (
    <div className="flex items-center gap-2 border p-4">
      <p>{isLoading ? t.loading : t.loginRequired}</p>
      {!isLoading && (
        <Button onClick={login} variant="outline" size="icon">
          <LogIn />
        </Button>
      )}
    </div>
  );
}
