import dayjs from "dayjs";
import { Check, Trash, X } from "lucide-react";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Comment } from "@/types/helper.types";
import { deleteCommentFromDB } from "@/db/comment/delete";
import { useTranslations } from "@/i18n/utils";
import { useStore } from "@nanostores/react";
import { $sessionStore } from "@/stores/session";

interface CommentListProps {
  lang: string;
  comments: Comment[];
  refresh: () => Promise<void>;
}

export default function Viewer({ lang, comments, refresh }: CommentListProps) {
  return (
    <div className="flex flex-col gap-4">
      {comments?.map((comment, index) => (
        <Fragment key={comment.id}>
          {index !== 0 && <Separator />}
          <CommentItem lang={lang} comment={comment} refresh={refresh} />
        </Fragment>
      ))}
    </div>
  );
}

const CommentItem = ({
  lang,
  comment,
  refresh,
}: {
  lang: string;
  comment: Comment;
  refresh: () => Promise<void>;
}) => {
  const { session } = useStore($sessionStore);

  const commentT = useTranslations(lang)("Comment");

  const githubId = comment.github_id;
  const githubUrl = githubId ? `https://github.com/${githubId}` : "#";
  const isAuthor = session?.user.id === comment.author_id;

  return (
    <div className="relative">
      <p>
        <Button variant="link" asChild className="pl-0">
          <a href={githubUrl} target="_blank" rel="noopener noreferrer">
            {commentT.developer(comment.developernumber)}
          </a>
        </Button>
        <span className="text-muted-foreground">
          {dayjs(comment.created_at).format(commentT.dateFormat)}
        </span>
      </p>

      <p>{comment.content}</p>

      {isAuthor && <DeleteButton commentId={comment.id} refresh={refresh} />}
    </div>
  );
};

const DeleteButton = ({
  commentId,
  refresh,
}: {
  commentId: string;
  refresh: () => Promise<void>;
}) => {
  const [asked, setAsked] = useState(false);

  if (asked) {
    return (
      <div className="absolute top-0 right-0 flex">
        <Button
          type="button"
          onClick={() => setAsked(false)}
          size="icon"
          variant="ghost"
        >
          <X />
        </Button>
        <Button
          type="button"
          onClick={async () => {
            await deleteCommentFromDB(commentId);
            await refresh();
          }}
          size="icon"
          variant="ghost"
        >
          <Check />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      onClick={() => setAsked(true)}
      variant="ghost"
      size="icon"
      className="absolute top-0 right-0"
    >
      <Trash />
    </Button>
  );
};
