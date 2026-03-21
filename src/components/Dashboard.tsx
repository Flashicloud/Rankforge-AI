import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { FileText, Trash2, Clock, Search, Sparkles, FileEdit, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface Article {
  id: string;
  userId: string;
  keyword: string;
  content: string;
  seoScore?: number;
  mode: 'generate' | 'optimize';
  createdAt: string;
}

export default function Dashboard({ onViewArticle }: { onViewArticle: (article: Article) => void }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Your Articles</h2>
          <p className="text-zinc-400">Manage and view your generated and optimized content.</p>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-lg px-4 py-2 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <span className="text-white font-medium">{articles.length} Total</span>
        </div>
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setArticleToDelete(article.id);
                  }}
                  className="text-zinc-500 hover:text-red-400 transition-colors p-2 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100"
                  title="Delete Article"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2 line-clamp-2" title={article.keyword}>
                {article.keyword}
              </h3>
              
              <div className="flex items-center gap-4 text-sm text-zinc-400 mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {new Date(article.createdAt).toLocaleDateString()}
                </div>
                {article.seoScore !== undefined && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <div className={`w-2 h-2 rounded-full ${article.seoScore >= 80 ? 'bg-emerald-500' : article.seoScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                    Score: {article.seoScore}
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
    </div>
  );
}
