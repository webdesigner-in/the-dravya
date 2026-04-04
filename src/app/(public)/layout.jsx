import Navbar from "@/components/layout/Navbar";

export default function PublicLayout({ children }) {
  return (
    <div className="mx-auto w-full max-w-[100vw] box-border px-3 pt-2 pb-6 sm:px-4 md:px-6 md:pb-8 [padding-left:max(0.75rem,env(safe-area-inset-left))] [padding-right:max(0.75rem,env(safe-area-inset-right))]">
      <Navbar />
      {children}
    </div>
  );
}
