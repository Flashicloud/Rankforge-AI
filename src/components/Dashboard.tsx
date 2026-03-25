import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { FileText, Trash2, Clock, Search, Sparkles, FileEdit, AlertCircle, Download, FileDown, FileCode2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import { marked } from 'marked';
import WordPressExportModal from './WordPressExportModal';

interface Article {
  id: string;
  userId: string;
  keyword: string;
  content: string;
  seoScore?: any;
  mode: 'generate' | 'optimize';
  createdAt: string;
}

export default function Dashboard({ onViewArticle }: { onViewArticle: (article: Article) => void }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState<string | null>(null);
  const [wpModalOpen, setWpModalOpen] = useState(false);
  const [selectedArticleForWp, setSelectedArticleForWp] = useState<{title: string, content: string} | null>(null);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `users/${auth.currentUser.uid}/articles`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedArticles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Article[];
      setArticles(fetchedArticles);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching articles:', err);
      setError('Failed to load articles.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const confirmDelete = async () => {
    if (!auth.currentUser || !articleToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/articles`, articleToDelete));
      setArticleToDelete(null);
    } catch (err) {
      console.error('Error deleting article:', err);
      setError('Failed to delete article.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async (article: Article, format: 'pdf' | 'word' | 'wp', e: React.MouseEvent) => {
    e.stopPropagation();
    setExportMenuOpen(null);
    
    const htmlContent = await marked.parse(article.content);
    const styledHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #111; border-bottom: 1px solid #eee; padding-bottom: 10px;">${article.keyword}</h1>
        ${htmlContent}
      </div>
    `;

    if (format === 'pdf') {
      const element = document.createElement('div');
      element.innerHTML = styledHtml;
      html2pdf().set({
        margin: 10,
        filename: `${article.keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(element).save();
    } else if (format === 'word') {
      const blob = new Blob(['\ufeff', styledHtml], {
        type: 'application/msword'
      });
      saveAs(blob, `${article.keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.doc`);
    } else if (format === 'wp') {
      setSelectedArticleForWp({
        title: article.keyword,
        content: htmlContent
      });
      setWpModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-4 text-red-200 max-w-2xl mx-auto mt-8">
          <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0 text-red-400" />
          <div>
            <h3 className="font-bold text-red-400">Error Loading Dashboard</h3>
            <p className="text-sm mt-1 opacity-80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const articlesWithScore = articles.filter(a => a.seoScore != null);
  const averageScore = articlesWithScore.length > 0 
    ? Math.round(articlesWithScore.reduce((acc, curr) => {
        const score = typeof curr.seoScore === 'object' && curr.seoScore !== null 
          ? (curr.seoScore as any).seo_score 
          : curr.seoScore;
        return acc + (score || 0);
      }, 0) / articlesWithScore.length) 
    : 0;
    
  const generatedCount = articles.filter(a => a.mode === 'generate').length;
  const optimizedCount = articles.filter(a => a.mode === 'optimize').length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Your Dashboard</h2>
          <p className="text-zinc-400">Manage and analyze your AI-generated content.</p>
        </div>
      </div>

      {articles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center gap-3 text-zinc-400 mb-4">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span className="font-medium uppercase tracking-wider text-xs">Total Articles</span>
            </div>
            <div className="text-4xl font-black text-white">{articles.length}</div>
          </div>
          
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center gap-3 text-zinc-400 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span className="font-medium uppercase tracking-wider text-xs">Avg SEO Score</span>
            </div>
            <div className="flex items-end gap-2">
              <div className={`text-4xl font-black ${averageScore >= 80 ? 'text-emerald-400' : averageScore >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                {averageScore}
              </div>
              <div className="text-zinc-500 text-sm mb-1">/ 100</div>
            </div>
          </div>

          <div className="md:col-span-2 bg-zinc-900/50 border border-white/5 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-10 -mt-10"></div>
            <div className="flex items-center gap-3 text-zinc-400 mb-4 relative z-10">
              <FileEdit className="w-5 h-5 text-blue-400" />
              <span className="font-medium uppercase tracking-wider text-xs">Content Distribution</span>
            </div>
            <div className="flex items-center gap-8 relative z-10">
              <div>
                <div className="text-2xl font-bold text-white mb-1">{generatedCount}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Generated</div>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">{optimizedCount}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Optimized</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Recent Documents</h3>
      </div>

      {articles.length === 0 ? (
        <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No articles yet</h3>
          <p className="text-zinc-400 max-w-md mx-auto">
            You haven't saved any articles to your dashboard yet. Generate or optimize an article and click "Save to Dashboard" to see it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={article.id}
              onClick={() => onViewArticle(article)}
              className="bg-zinc-900/40 border border-white/5 hover:border-indigo-500/30 rounded-2xl p-6 cursor-pointer transition-all group hover:bg-zinc-900/60"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${article.mode === 'generate' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {article.mode === 'generate' ? <Sparkles className="w-5 h-5" /> : <FileEdit className="w-5 h-5" />}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExportMenuOpen(exportMenuOpen === article.id ? null : article.id);
                    }}
                    className="text-zinc-500 hover:text-indigo-400 transition-colors p-2 hover:bg-indigo-400/10 rounded-lg"
                    title="Export Article"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  
                  <AnimatePresence>
                    {exportMenuOpen === article.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setExportMenuOpen(null); }} />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className="absolute right-0 top-10 z-50 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
                        >
                          <div className="p-1">
                            <button onClick={(e) => handleExport(article, 'pdf', e)} className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2">
                              <FileText className="w-4 h-4 text-red-400" /> Export as PDF
                            </button>
                            <button onClick={(e) => handleExport(article, 'word', e)} className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2">
                              <FileDown className="w-4 h-4 text-blue-400" /> Export as Word
                            </button>
                            <button onClick={(e) => handleExport(article, 'wp', e)} className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2">
                              <FileCode2 className="w-4 h-4 text-indigo-400" /> Send to WordPress
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setArticleToDelete(article.id);
                    }}
                    className="text-zinc-500 hover:text-red-400 transition-colors p-2 hover:bg-red-400/10 rounded-lg"
                    title="Delete Article"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2 line-clamp-2" title={article.keyword}>
                {article.keyword}
              </h3>
              
              <div className="flex items-center gap-4 text-sm text-zinc-400 mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {new Date(article.createdAt).toLocaleDateString()}
                </div>
                {article.seoScore != null && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <div className={`w-2 h-2 rounded-full ${
                      (typeof article.seoScore === 'object' && article.seoScore !== null ? (article.seoScore as any).seo_score : article.seoScore) >= 80 ? 'bg-emerald-500' : 
                      (typeof article.seoScore === 'object' && article.seoScore !== null ? (article.seoScore as any).seo_score : article.seoScore) >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}></div>
                    Score: {typeof article.seoScore === 'object' && article.seoScore !== null ? (article.seoScore as any).seo_score : article.seoScore}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {articleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-4 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Delete Article</h3>
            </div>
            <p className="text-zinc-400 mb-8">
              Are you sure you want to delete this article? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setArticleToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-2"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <WordPressExportModal
        isOpen={wpModalOpen}
        onClose={() => {
          setWpModalOpen(false);
          setSelectedArticleForWp(null);
        }}
        article={selectedArticleForWp}
      />
    </div>
  );
}
