import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNews } from '@/lib/firebaseSixth';
import { NAUKRI_MINIS } from '@/assets/naukri_news_data';
import Header from '@/components/Header';
import LinkifiedText from '@/components/LinkifiedText';
import ItemShareModal from '@/components/ItemShareModal';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Share2, ShieldCheck, ArrowUp, Calendar } from 'lucide-react';

export default function NewsDetailPage() {
  const { newsId } = useParams();
  const navigate = useNavigate();
  
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      try {
        const staticItem = NAUKRI_MINIS.find(n => n.id === newsId);
        if (staticItem) {
          setItem(staticItem);
        } else {
          const data = await getNews(newsId);
          setItem(data);
        }
      } catch (err) {
        console.error('Error fetching news detail:', err);
      } finally {
        setLoading(false);
      }
    };
    if (newsId) {
      fetchItem();
    }
  }, [newsId]);

  // SEO & GEO Optimization for dynamic news details
  useEffect(() => {
    if (!item) return;

    const originalTitle = document.title;
    document.title = `${item.title} | Discuss Tech News`;

    const updateOrCreateMeta = (nameOrProperty, content, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${nameOrProperty}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, nameOrProperty);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const description = item.description ? item.description.substring(0, 160).replace(/\n/g, ' ') : '';
    const authorName = item.author || 'Discuss Team';
    const currentUrl = window.location.href;

    updateOrCreateMeta('description', description);
    updateOrCreateMeta('author', authorName);
    updateOrCreateMeta('creator', authorName);
    updateOrCreateMeta('keywords', `Discuss, Tech News, ${item.tag || 'Naukri Mini'}, ${item.title}`);
    
    // Open Graph
    updateOrCreateMeta('og:title', item.title, true);
    updateOrCreateMeta('og:description', description, true);
    updateOrCreateMeta('og:url', currentUrl, true);
    updateOrCreateMeta('og:type', 'article', true);
    if (item.image) {
      updateOrCreateMeta('og:image', item.image, true);
    }

    // Twitter Card
    updateOrCreateMeta('twitter:title', item.title);
    updateOrCreateMeta('twitter:description', description);
    if (item.image) {
      updateOrCreateMeta('twitter:image', item.image);
    }

    // Inject JSON-LD Schema (Structured Data for search & AI engines)
    let jsonLdScript = document.getElementById('news-detail-jsonld');
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.id = 'news-detail-jsonld';
      jsonLdScript.type = 'application/ld+json';
      document.head.appendChild(jsonLdScript);
    }

    const schemaData = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": item.title,
      "description": description,
      "datePublished": item.createdAt || new Date().toISOString(),
      "dateModified": item.createdAt || new Date().toISOString(),
      "author": {
        "@type": "Person",
        "name": authorName,
        "url": "https://discussit.in"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Discuss",
        "logo": {
          "@type": "ImageObject",
          "url": "https://discussit.in/favicon-new.png"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": currentUrl
      }
    };
    if (item.image) {
      schemaData.image = [item.image];
    }
    jsonLdScript.textContent = JSON.stringify(schemaData);

    return () => {
      document.title = originalTitle;
      const schemaScript = document.getElementById('news-detail-jsonld');
      if (schemaScript) {
        schemaScript.remove();
      }
    };
  }, [item]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#121212] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB] discuss:text-[#EF4444]" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#121212] flex flex-col">
        <Header />
        <div className="w-full max-w-3xl mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
          <div className="text-center py-16 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-2xl border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] shadow-card">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] mb-4">
              News Not Found
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] mb-6">
              The tech news post you are looking for does not exist or has been removed.
            </p>
            <Button 
              onClick={() => navigate('/news')}
              className="bg-[#2563EB] discuss:bg-[#EF4444] text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to News Feed
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#121212] pb-28">
      <Header />
      
      <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-6 pb-32">
        {/* Back navigation */}
        <button
          onClick={() => navigate('/news')}
          className="flex items-center gap-2 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] hover:text-[#2563EB] discuss:hover:text-[#EF4444] font-medium transition-colors mb-6 group text-sm"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to News Feed
        </button>

        {/* Dedicated Premium News Card */}
        <article className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-3xl border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] shadow-card overflow-hidden">
          {item.image && (
            <div className="w-full h-64 md:h-[400px] bg-neutral-100 dark:bg-neutral-900 discuss:bg-[#000] relative overflow-hidden flex items-center justify-center">
              <img 
                src={item.image} 
                alt={item.title} 
                className="w-full h-full object-contain relative z-10 select-none" 
              />
              <div 
                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30 select-none scale-110 pointer-events-none" 
                style={{ backgroundImage: `url(${item.image})` }} 
              />
            </div>
          )}
          
          <div className="p-6 md:p-10">
            {/* Header Meta info */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full uppercase tracking-wider shadow-sm select-none">
                <ShieldCheck className="w-3.5 h-3.5" /> Created by {item.author || 'Discuss Team'}
              </span>
              {item.tag && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded uppercase tracking-wider select-none">
                  {item.tag}
                </span>
              )}
              <span className="text-neutral-300 dark:text-neutral-700 discuss:text-[#333333] hidden md:inline">|</span>
              <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF]">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(item.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-4xl font-extrabold text-neutral-900 dark:text-neutral-50 discuss:text-white tracking-tight leading-tight mb-6">
              {item.title}
            </h1>

            {/* Description / Body */}
            <div className="text-neutral-700 dark:text-neutral-300 discuss:text-[#D4D4D4] text-base leading-relaxed whitespace-pre-wrap font-normal border-t border-neutral-100 dark:border-neutral-700 discuss:border-[#262626] pt-6 md:pt-8 min-h-[150px]">
              <LinkifiedText text={item.description} />
            </div>

            {/* Footer and sharing */}
            <div className="flex justify-between items-center mt-10 pt-6 border-t border-neutral-100 dark:border-neutral-700 discuss:border-[#262626]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#2563EB] discuss:bg-[#EF4444] flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm select-none">
                  {item.author ? item.author.charAt(0) : 'D'}
                </div>
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 discuss:text-[#F5F5F5]">
                  {item.author || 'Discuss Team'}
                </span>
              </div>
              
              <Button 
                onClick={() => setShowShareModal(true)}
                className="bg-[#2563EB] discuss:bg-[#EF4444] text-white hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-sm"
              >
                <Share2 className="w-4 h-4 mr-2" /> Share News
              </Button>
            </div>
          </div>
        </article>
      </div>

      {showShareModal && (
        <ItemShareModal
          open={showShareModal}
          onClose={() => setShowShareModal(false)}
          item={item}
          type="news"
        />
      )}

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-32 md:bottom-12 right-6 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:scale-110 transition-transform z-50 group flex items-center justify-center border border-white/20 animate-fade-in"
          title="Scroll to top"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
        </button>
      )}
    </div>
  );
}
