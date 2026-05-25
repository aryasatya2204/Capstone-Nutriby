export default function FooterDashboard() {
  return (
    <footer className="mt-auto w-full bg-white py-6 text-center shadow-inner">
      <p className="text-sm font-medium text-gray-500">
        <a
          href="https://mail.google.com/mail/?view=cm&to=nutribyadmin@gmail.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray/80 hover:text-[#8B1E1E] transition-colors md:text-[12px]"
          aria-label="Email support"
        >
          ✉ nutribyadmin@gmail.com
        </a>
        <br></br>
        &copy; 2026 NutriBy. All rights reserved.
      </p>
    </footer>
  );
}
