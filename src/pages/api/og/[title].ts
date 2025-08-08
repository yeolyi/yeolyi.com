import type { APIRoute } from "astro";
import satori from "satori";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

export const prerender = false;

const fontFile = await fs.readFile(
  path.resolve("./public/fonts/Pretendard-Bold.woff"),
);

const options = {
  width: 1200,
  height: 630,
  fonts: [
    {
      name: "Pretendard",
      data: fontFile,
    },
  ],
};

export const GET: APIRoute = async ({ params }) => {
  if (!params.title) return new Response("Not found", { status: 404 });

  const svg = await satori(
    // @ts-expect-error TODO: satri 타입이 이상하네
    {
      type: "div",
      props: {
        children: decodeURIComponent(params.title),
        style: {
          color: "black",
          fontFamily: "Pretendard",
          fontSize: 120,
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "white",
          textAlign: "center",
          padding: "8px",
        },
      },
    },
    options,
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  // @ts-expect-error TODO: fix this
  return new Response(png, {
    headers: { "Content-Type": "image/png" },
  });
};
