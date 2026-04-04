export default function Home() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-1 text-center sm:min-h-[80vh]">
      <h1 className="mb-3 max-w-[min(100%,20rem)] break-words text-2xl font-bold sm:mb-4 sm:max-w-none sm:text-3xl md:text-4xl">
        Welcome to Dravya
      </h1>
      <p className="max-w-md px-1 text-sm text-muted-foreground sm:text-lg md:text-xl">
        Water Business Management System
      </p>
    </div>
  );
}
