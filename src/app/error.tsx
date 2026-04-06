"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#FFF8F0] px-4">
      <p className="text-4xl">😥</p>
      <h2 className="mt-4 text-lg font-bold text-[#6B8E7B]">
        エラーが発生しました
      </h2>
      <p className="mt-2 text-center text-sm text-[#8B7E6A]">
        {error.message || "予期しないエラーです。もう一度お試しください。"}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-xl bg-[#6B8E7B] px-6 py-3 font-medium text-white"
      >
        もう一度試す
      </button>
    </div>
  );
}
