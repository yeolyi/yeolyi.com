import supabase from "@/db";

export const insertOgShortLink = async (
  title: string,
  description: string,
  redirectUrl: string,
) => {
  const { data } = await supabase
    .rpc("insert_og_short_link_v2", {
      _title: title,
      _description: description,
      _redirect_url: redirectUrl,
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
