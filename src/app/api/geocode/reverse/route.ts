import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }

  const result = await reverseGeocode(lat, lng);
  return NextResponse.json(result);
}
