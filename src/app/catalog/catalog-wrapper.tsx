"use client";

import dynamic from "next/dynamic";
import type { Database } from "@/types/database";

type Item = Database["public"]["Tables"]["items"]["Row"];

const CatalogView = dynamic(
  () => import("./catalog-view").then((m) => m.CatalogView),
  { ssr: false }
);

export function CatalogWrapper({ items }: { items: Item[] }) {
  return <CatalogView items={items} />;
}
