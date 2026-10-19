import { AppHeader } from "@/components/app-header";

const block = "animate-pulse rounded-3xl bg-line/60";

export function PageSkeleton({ variant = "page" }: { variant?: "home" | "page" | "admin" }) {
  return (
    <>
      <AppHeader />
      <div role="status" aria-label="Caricamento" className="flex flex-1 flex-col">
        {variant === "home" ? (
          <div className="flex flex-1 flex-col bg-brand-deep">
            <div className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 pt-4">
              <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-white/15" />
              <div className="h-5 w-4/5 animate-pulse rounded-full bg-white/10" />
              <div className="mt-2 flex h-36 items-end gap-1.5">
                {[18, 27, 36, 45, 54, 62, 72].map((height) => (
                  <div key={height} style={{ height: `${height}%` }} className="flex-1 animate-pulse rounded-t-lg bg-white/15" />
                ))}
              </div>
            </div>
            <div className="flex flex-1 flex-col rounded-t-[28px] bg-canvas">
              <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
                <div className={`h-44 ${block}`} />
                <div className={`h-72 ${block}`} />
              </div>
            </div>
          </div>
        ) : (
          <main
            className={`mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 ${variant === "admin" ? "max-w-5xl" : "max-w-xl"}`}
          >
            <div className="h-9 w-1/2 animate-pulse rounded-2xl bg-line/60" />
            {variant === "admin" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={`h-40 ${block}`} />
                <div className={`h-40 ${block}`} />
              </div>
            ) : (
              <div className={`h-96 ${block}`} />
            )}
          </main>
        )}
      </div>
    </>
  );
}
