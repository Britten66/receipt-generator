import { supabase } from "../lib/supabase";

export const fetchProfile = () =>
  supabase.functions.invoke("profile", { method: "GET" }).then(({ data }) => data);

export const saveProfile = (data) =>
  supabase.functions.invoke("profile", {
    method: "PUT",
    body: data,
  }).then(({ data: result }) => result);
