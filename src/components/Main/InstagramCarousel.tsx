import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import meme1 from "@/assets/main/meme1.jpeg";
import meme2 from "@/assets/main/meme2.png";
import meme3 from "@/assets/main/meme3.jpeg";
import meme4 from "@/assets/main/meme4.png";
import mergeSort from "@/assets/main/merge-sort.webm";
import InstagramDescription from "@/components/Main/InstagramDescription";

export default function InstagramCarousel({ locale }: { locale: string }) {
  return (
    <Carousel opts={{ loop: true, align: "start" }}>
      <CarouselContent className="-pl-4">
        <CarouselItem className="basis-11/12 pl-4">
          <InstagramDescription locale={locale} />
        </CarouselItem>
        <CarouselItem className="aspect-[4/5] max-w-sm pl-4">
          <img
            src={meme1.src}
            alt=""
            className="h-full w-full object-contain"
          />
        </CarouselItem>
        <CarouselItem className="aspect-[4/5] max-w-sm pl-4">
          <video
            src={mergeSort}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-contain"
          />
        </CarouselItem>
        <CarouselItem className="aspect-[4/5] max-w-sm pl-4">
          <img
            src={meme2.src}
            alt=""
            className="h-full w-full object-contain"
          />
        </CarouselItem>
        <CarouselItem className="aspect-[4/5] max-w-sm pl-4">
          <img
            src={meme3.src}
            alt=""
            className="h-full w-full object-contain"
          />
        </CarouselItem>
        <CarouselItem className="aspect-[4/5] max-w-sm pl-4">
          <img
            src={meme4.src}
            alt=""
            className="h-full w-full object-contain"
          />
        </CarouselItem>
      </CarouselContent>
      <CarouselNext />
      <CarouselPrevious />
    </Carousel>
  );
}
