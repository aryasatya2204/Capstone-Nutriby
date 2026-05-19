import NavbarDashboard from "../components/NavbarDashboard";
import FooterDashboard from "../components/FooterDashboard";

export default function Information() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F3EFEA] font-['Lato']">
      <NavbarDashboard />
      
      <main className="flex-grow flex flex-col items-center justify-center p-6 text-center">
        <div className="rounded-3xl bg-white p-12 shadow-sm border border-gray-100 max-w-lg w-full">
          <div className="text-6xl mb-4">🚧</div>
          <h1 className="text-3xl font-bold text-[#8B2020] mb-2">Information</h1>
          <p className="text-gray-500 text-lg">
            Halaman ini sedang dalam tahap pengembangan (To be developed).
            Adoh mana ni Frontend Dev nya kok ngilang:v
          </p>
        </div>
      </main>

      <FooterDashboard />
    </div>
  );
}