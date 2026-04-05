"use client";

import dynamic from "next/dynamic";

const AdventureLogView = dynamic(
  () => import("./adventure-log-view").then((m) => m.AdventureLogView),
  { ssr: false }
);

type AdventureLog = {
  quest_id: string;
  god_type: string;
  god_name: string;
  mission_text: string;
  mission_type: string;
  start_area_name: string;
  start_lat: number;
  start_lng: number;
  goal_lat: number;
  goal_lng: number;
  route_log: { lat: number; lng: number; timestamp: string }[];
  started_at: string;
  completed_at: string | null;
  item_name: string | null;
  item_description: string | null;
  item_image_url: string | null;
  item_rarity: number | null;
};

export function AdventureLogWrapper({ logs }: { logs: AdventureLog[] }) {
  return <AdventureLogView logs={logs} />;
}
