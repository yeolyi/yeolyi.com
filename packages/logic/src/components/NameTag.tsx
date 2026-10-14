import { useAtom } from "jotai";
import { Tag } from "lucide-react";
import { useState } from "react";
import type {
  OutputAtom,
  OutputValue,
} from "../model/type";

export default function NameTag({ atom }: { atom: OutputAtom }) {
  const [label, setLabel] = useAtom(atom);
  const [isEditing, setIsEditing] = useState(false);

  const handleLabelChange = (val: OutputValue) => {
    if (typeof val === "string") {
      setLabel(val);
      setIsEditing(false);
    }
  };

  return (
    <div className="absolute top-0 right-0 left-0 flex -translate-y-full">
      {isEditing ? (
        <input
          defaultValue={label?.toString() ?? ""}
          onBlur={(e) => handleLabelChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleLabelChange(e.currentTarget.value);
            }
          }}
          className="bg-background text-foreground h-4 w-full border-none px-1 outline-none"
          // biome-ignore lint/a11y/noAutofocus: TODO 대체제 찾기
          autoFocus
        />
      ) : (
        <button
          onClick={() => {
            setIsEditing(true);
          }}
          type="button"
          className="shrink-0 cursor-pointer"
        >
          {label ? (
            <span className="text-foreground min-w-fit font-mono">
              {label.toString()}
            </span>
          ) : (
            <Tag size={12} className="text-foreground" />
          )}
        </button>
      )}
    </div>
  );
}
