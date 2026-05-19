import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const TABLE = "Addresses";

export async function loadAddresses() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function insertAddresses(entries) {
  const rows = entries.map(({ id, name, street, city, state, zip, country, label }) => ({
    id, name, street, city, state, zip, country, label,
  }));
  const { error } = await supabase.from(TABLE).insert(rows);
  if (error) throw error;
}

export async function deleteAddress(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAddresses(ids) {
  if (!ids.length) return;
  const { error } = await supabase.from(TABLE).delete().in("id", ids);
  if (error) throw error;
}
