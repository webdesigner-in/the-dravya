import Navbar from "@/components/layout/Navbar";

export default function PublicLayout({ children }) {
  return (
    <div className="mx-8">
      <Navbar />
      {children}
    </div>
  );
}
