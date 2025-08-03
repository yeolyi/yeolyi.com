import { useTranslations } from "@/i18n/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Info } from "lucide-react";

export default function InstagramPopOver({ lang }: { lang: string }) {
  const t = useTranslations(lang)("MainPage");

  return (
    <Popover>
      <PopoverTrigger className="-translate-y-0.5 align-middle">
        <Info className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent>
        <p dangerouslySetInnerHTML={{ __html: t.instagramDescription }} />
      </PopoverContent>
    </Popover>
  );
}
