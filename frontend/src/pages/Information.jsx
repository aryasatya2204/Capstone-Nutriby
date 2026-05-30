import NavbarDashboard from "../components/NavbarDashboard";
import FooterDashboard from "../components/FooterDashboard";
import articlesData from "../data/articles.json";

function ArticleCard({ article }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-300 group"
    >
      <div className="w-full aspect-[4/3] overflow-hidden">
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
      </div>

      <div className="p-3">
        <span className="text-[9px] font-bold text-[#8B1E1E] uppercase tracking-wider">
          {article.tag}
        </span>
        <h3 className="text-[13px] font-bold text-gray-800 leading-snug mt-0.5 mb-1 line-clamp-2">
          {article.title}
        </h3>
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 mb-3">
          {article.excerpt}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400 italic">
            Hanya {article.readTime}
          </span>
          <span className="text-[#8B1E1E] text-[18px] font-bold leading-none group-hover:translate-x-1 transition-transform duration-300">
            →
          </span>
        </div>
      </div>
    </a>
  );
}

export default function Information() {
  const { featuredArticle, dailyQuote, latestArticles } = articlesData;

  return (
    <div className="flex min-h-screen flex-col bg-[#F3EFEA] font-['Lato'] relative animate-[fadeIn_0.5s_ease-out]">
      <NavbarDashboard />

      <main className="flex-grow w-full max-w-2xl mx-auto px-4 py-6 animate-[slideUp_0.5s_ease-out_forwards]">
        <div className="mb-5 text-center">
          <h1 className="text-[38px] font-extrabold text-[#8B1E1E] uppercase tracking-wide">
            Info & Tips Si Kecil
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Temukan panduan nutrisi terbaik untuk tumbuh kembang si kecil
          </p>
        </div>

        {/* bagian artikel utama & quote box */}
        <div className="flex gap-3 mb-8 items-stretch">
          {/* featured article */}
          <a
            href={featuredArticle.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-2 bg-white rounded-2xl p-3 shadow-sm border border-gray-100 hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-300 flex-1 min-w-0"
          >
            <img
              src={featuredArticle.image}
              alt={featuredArticle.title}
              className="w-full h-[90px] rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex flex-col justify-between flex-1 min-w-0">
              <div>
                <h2 className="text-[12px] font-bold text-gray-800 leading-snug line-clamp-2 mb-1">
                  {featuredArticle.title}
                </h2>
                <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                  {featuredArticle.excerpt}
                </p>
              </div>
              <span className="mt-2 self-start text-[10px] font-bold text-[#8B1E1E] border border-[#8B1E1E] rounded-full px-2.5 py-0.5 hover:bg-[#8B1E1E] hover:text-white transition-colors duration-300 whitespace-nowrap">
                Baca Selengkapnya
              </span>
            </div>
          </a>

          {/* box mini quote harian orang tua */}
          <a
            href={dailyQuote.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col justify-between bg-[#8B1E1E] rounded-2xl p-3 shadow-sm w-[38%] flex-shrink-0 hover:opacity-90 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <div>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-wide mb-2">
                {dailyQuote.label}
              </p>
              <p className="text-[12px] font-bold text-white leading-snug">
                {dailyQuote.text}
              </p>
            </div>
            <span className="text-[11px] text-white/80 mt-3 font-semibold">
              {dailyQuote.cta}
            </span>
          </a>
        </div>

        <div>
          <h2 id="artikel" className="text-[15px] font-bold text-gray-800 mb-4">
            Artikel Terbaru
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {latestArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      </main>

      <FooterDashboard />
    </div>
  );
}
