"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-fantasy px-4">
      <p className="text-5xl">😥</p>
      <h2 className="text-gold mt-4 text-lg font-bold">
        エラーが発生しました
      </h2>
      <p className="mt-2 text-center text-sm text-[var(--color-text-sub)]">
        {error.message || "予期しないエラーです。もう一度お試しください。"}
      </p>
      <button onClick={reset} className="btn-primary mt-6">
        もう一度試す
      </button>
    </div>
  );
}
