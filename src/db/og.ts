import supabase from "@/db";

export const insertOgShortLink = async (title: string, description: string) => {
  const { data } = await supabase
    .rpc("insert_og_short_link", {
      _title: title,
      _description: description,
    })
    .throwOnError();

  return data;
};

export const getOgShortLink = async (shortLink: string) => {
  const { data } = await supabase
    .from("og_short_links")
    .select("*")
    .eq("slug", shortLink)
    .single()
    .throwOnError();

  return data;
};

export const getOgShortLinkCount = async () => {
  const { count } = await supabase
    .from("og_short_links")
    .select("*", { count: "exact", head: true })
    .throwOnError();

  return count;
};
