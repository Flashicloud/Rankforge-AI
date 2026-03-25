/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateSEOContent, optimizeSEOContent } from './services/gemini';
import { Search, Sparkles, FileText, AlertCircle, Copy, Check, Loader2, Layers, BarChart3, Target, Network, ShieldCheck, PenTool, ScanSearch, Zap, ChevronDown, ChevronUp, TrendingUp, BrainCircuit, Fingerprint, ArrowRight, Terminal, FileEdit, Brain, Globe, LogIn, LogOut, LayoutDashboard, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactQuill from 'react-quill-new';
import 'react-quill/dist/quill.snow.css';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { auth, db, logOut } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import StickyAssistant from './components/StickyAssistant';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface Option {
  value: string;
  label: string;
}

const CustomSelect = ({ value, onChange, options, placeholder, disabled }: { value: string, onChange: (val: string) => void, options: Option[], placeholder: string, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`block w-full text-left p-3 pr-10 bg-black/20 border border-white/5 rounded-lg text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black/40 cursor-pointer'}`}
      >
        <span className={selectedOption && selectedOption.value !== '' ? 'text-white' : 'text-zinc-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute z-50 w-full mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
            >
              <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${value === option.value ? 'bg-indigo-500/20 text-indigo-300 font-medium' : 'text-zinc-300 hover:bg-white/5 hover:text-white'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

function LandingPage({ onStart, onShowAuth, user }: { onStart: () => void, onShowAuth: () => void, user: User | null }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-50 selection:bg-indigo-500/30 font-sans overflow-x-hidden">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-200"></div>
              <div className="relative bg-black p-2 rounded-lg">
                <Brain className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <span className="text-xl font-bold tracking-wide text-white">RankForge AI</span>
          </div>
          <div className="flex items-center gap-4">
            {!user ? (
              <button onClick={onShowAuth} className="text-zinc-400 hover:text-white font-medium transition-colors">
                Sign In
              </button>
            ) : (
              <span className="text-zinc-400 text-sm hidden sm:block">
                Logged in as <strong className="text-white">{user.email}</strong>
              </span>
            )}
            <button onClick={onStart} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-lg font-medium transition-all">
              Go to App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-40 pb-20 lg:pt-56 lg:pb-32 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8">
            <Brain className="w-4 h-4" />
            The Next Generation of SEO Content
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            The Ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">AI Article Writer</span><br/> for SEO Dominance
          </h1>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            RankForge is not just another text generator. It's a comprehensive <strong>AI SEO content generator</strong> that analyzes live search results, maps semantic entities, and writes human-quality articles designed to rank on Google.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onStart} className="bg-white text-black hover:bg-indigo-50 px-8 py-4 rounded-full font-bold text-lg transition-all flex items-center gap-2 shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:shadow-[0_0_60px_rgba(99,102,241,0.5)] hover:scale-105">
              Start Writing for Free <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-zinc-900/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Our AI Writing Assistant?</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">Built for SEO professionals, marketers, and content creators who demand quality over quantity.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#0a0a0a] p-8 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-colors group">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Globe className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Live SERP Analysis</h3>
              <p className="text-zinc-400 leading-relaxed">Our <strong>AI article writer</strong> doesn't guess. It scrapes the top 10 Google results in real-time to understand exactly what search intent to target.</p>
            </div>
            
            <div className="bg-[#0a0a0a] p-8 rounded-3xl border border-white/5 hover:border-purple-500/30 transition-colors group">
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Surfer-Level NLP Pipeline</h3>
              <p className="text-zinc-400 leading-relaxed">Our premium engine acts like Surfer SEO on autopilot. It injects missing semantic entities, LSI keywords, and optimizes NLP scores to boost your topical authority.</p>
            </div>

            <div className="bg-[#0a0a0a] p-8 rounded-3xl border border-white/5 hover:border-pink-500/30 transition-colors group">
              <div className="w-14 h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">E-E-A-T Compliant</h3>
              <p className="text-zinc-400 leading-relaxed">Unlike basic <strong>AI content generators</strong>, RankForge structures content to highlight Experience, Expertise, Authoritativeness, and Trustworthiness.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Landing Page Content */}
      <div className="mt-20 pt-24 border-t border-white/5 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 tracking-tight">
            Beyond Standard AI. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Engineered for the SERPs.</span>
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Stop publishing generic AI content that gets penalized by Google. Whether you're generating net-new articles with our 7-phase semantic engine or rescuing underperforming pages with our 8-phase optimization architect, we build human-first, intent-optimized content that search engines reward.
          </p>
        </div>

        {/* Why Use This Tool Section */}
        <div className="mb-32">
          <div className="flex items-center gap-4 mb-12 justify-center">
            <div className="h-px bg-gradient-to-r from-transparent to-white/10 w-16 md:w-32"></div>
            <h3 className="text-xl font-bold text-white uppercase tracking-widest text-center">Why Use This Tool?</h3>
            <div className="h-px bg-gradient-to-l from-transparent to-white/10 w-16 md:w-32"></div>
          </div>
          
          <div className="mb-16">
            <h4 className="text-lg font-bold text-indigo-400 mb-6 flex items-center gap-2 justify-center"><Brain className="w-5 h-5" /> For Generating New Content</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-2xl hover:bg-zinc-900/50 transition-colors">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-6 border border-indigo-500/20">
                  <BrainCircuit className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Semantic Entity Mapping</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  We go beyond outdated keyword stuffing. The engine extracts LSI keywords and NLP entities from live SERP data, weaving them naturally into your document's architecture to build true topical authority.
                </p>
              </div>

              <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-2xl hover:bg-zinc-900/50 transition-colors">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/20">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Search Intent Alignment</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  Whether the query is informational, transactional, or commercial, our structural variation algorithms adapt the content hierarchy to give users exactly what they are searching for, reducing bounce rates.
                </p>
              </div>

              <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-2xl hover:bg-zinc-900/50 transition-colors">
                <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mb-6 border border-rose-500/20">
                  <Fingerprint className="w-6 h-6 text-rose-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Anti-Footprint Technology</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  Protect your site from algorithmic penalties. We utilize structural unpredictability, burstiness in sentence length, and E-E-A-T++ trust signals to create content that reads like a seasoned industry expert.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold text-emerald-400 mb-6 flex items-center gap-2 justify-center"><FileEdit className="w-5 h-5" /> For Optimizing Existing Content</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-2xl hover:bg-zinc-900/50 transition-colors">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6 border border-purple-500/20">
                  <ScanSearch className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Semantic Gap Detection</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  Identify missing entities, LSI keywords, and conceptual clusters that top-ranking competitors cover, ensuring your article achieves complete topical authority.
                </p>
              </div>

              <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-2xl hover:bg-zinc-900/50 transition-colors">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 border border-amber-500/20">
                  <ShieldCheck className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">E-E-A-T & Trust Audit</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  Evaluate your content for experience, expertise, authoritativeness, and trustworthiness signals, providing actionable recommendations to build credibility.
                </p>
              </div>

              <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-2xl hover:bg-zinc-900/50 transition-colors">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6 border border-cyan-500/20">
                  <Target className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">AI Overview Readiness</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  Restructure paragraphs and headings to capture Featured Snippets and SGE (AI Overviews) with concise, extractable answer blocks and logical formatting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-16 justify-center">
          <div className="h-px bg-gradient-to-r from-transparent to-white/10 w-16 md:w-32"></div>
          <h3 className="text-xl font-bold text-white uppercase tracking-widest text-center">How It Works</h3>
          <div className="h-px bg-gradient-to-l from-transparent to-white/10 w-16 md:w-32"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
          {/* Generation Timeline */}
          <div className="bg-zinc-900/20 p-8 rounded-3xl border border-white/5">
            <h4 className="text-xl font-bold text-indigo-400 mb-10 flex items-center gap-3"><Brain className="w-6 h-6" /> Content Generation Engine</h4>
            <div className="relative">
              <div className="absolute left-[27px] top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/50 via-purple-500/50 to-transparent"></div>
              <div className="space-y-12">
                <div className="relative flex items-start gap-6 group">
                  <div className="w-14 h-14 bg-[#0a0a0a] border-2 border-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 z-10 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
                    <Search className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="pt-3">
                    <h4 className="text-lg font-bold text-white mb-2">1. Input & Configure</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Enter your target keyword and configure the content type (Pillar, Cluster, etc.). Add optional context like your target audience or specific constraints.
                    </p>
                  </div>
                </div>
                <div className="relative flex items-start gap-6 group">
                  <div className="w-14 h-14 bg-[#0a0a0a] border-2 border-purple-500 rounded-full flex items-center justify-center flex-shrink-0 z-10 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all">
                    <Layers className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="pt-3">
                    <h4 className="text-lg font-bold text-white mb-2">2. 7-Phase Semantic Analysis</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Our multi-agent system analyzes live SERP data, maps semantic entities, enforces search intent, and builds an E-E-A-T compliant architecture.
                    </p>
                  </div>
                </div>
                <div className="relative flex items-start gap-6 group">
                  <div className="w-14 h-14 bg-[#0a0a0a] border-2 border-pink-500 rounded-full flex items-center justify-center flex-shrink-0 z-10 group-hover:scale-110 group-hover:bg-pink-500/20 transition-all">
                    <Check className="w-6 h-6 text-pink-400" />
                  </div>
                  <div className="pt-3">
                    <h4 className="text-lg font-bold text-white mb-2">3. Human-First Generation</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      The final phase generates a comprehensive, unique value article that exceeds competitor quality.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Optimization Timeline */}
          <div className="bg-zinc-900/20 p-8 rounded-3xl border border-white/5">
            <h4 className="text-xl font-bold text-emerald-400 mb-10 flex items-center gap-3"><FileEdit className="w-6 h-6" /> Content Optimization Architect</h4>
            <div className="relative">
              <div className="absolute left-[27px] top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/50 via-teal-500/50 to-transparent"></div>
              <div className="space-y-12">
                <div className="relative flex items-start gap-6 group">
                  <div className="w-14 h-14 bg-[#0a0a0a] border-2 border-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 z-10 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
                    <FileText className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="pt-3">
                    <h4 className="text-lg font-bold text-white mb-2">1. Paste & Audit</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Paste your underperforming article and target keyword. The architect audits your structure, intent alignment, and semantic depth against the live SERP.
                    </p>
                  </div>
                </div>
                <div className="relative flex items-start gap-6 group">
                  <div className="w-14 h-14 bg-[#0a0a0a] border-2 border-teal-500 rounded-full flex items-center justify-center flex-shrink-0 z-10 group-hover:scale-110 group-hover:bg-teal-500/20 transition-all">
                    <BarChart3 className="w-6 h-6 text-teal-400" />
                  </div>
                  <div className="pt-3">
                    <h4 className="text-lg font-bold text-white mb-2">2. Strategic Roadmap</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Receive a prioritized optimization roadmap detailing exactly where to add missing entities, expand thin sections, and inject trust signals.
                    </p>
                  </div>
                </div>
                <div className="relative flex items-start gap-6 group">
                  <div className="w-14 h-14 bg-[#0a0a0a] border-2 border-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 z-10 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                    <PenTool className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="pt-3">
                    <h4 className="text-lg font-bold text-white mb-2">3. Precision Upgrades</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      The engine surgically upgrades weak paragraphs and headings without unnecessarily rewriting your entire article, preserving your original voice.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-24 bg-zinc-900/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Generate high-ranking SEO content at a fraction of the cost of traditional agencies. Choose the plan that fits your growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="bg-[#111] border border-white/10 rounded-3xl p-8 hover:border-indigo-500/30 transition-all flex flex-col">
              <h3 className="text-xl font-bold text-white mb-2">Free</h3>
              <p className="text-zinc-400 text-sm mb-6">Test the waters and see the quality.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-zinc-500">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-zinc-300 text-sm">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span><strong>1</strong> Article per month</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300 text-sm">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Basic SEO Scoring</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300 text-sm">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Content Optimization Tool</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-500 text-sm">
                  <X className="w-5 h-5 flex-shrink-0" />
                  <span>Auto-Save to Dashboard</span>
                </li>
              </ul>
              <button 
                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); user ? onStart() : onShowAuth(); }}
                className="w-full py-3 rounded-xl font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              >
                Get Started
              </button>
            </div>

            {/* Starter Plan */}
            <div className="bg-gradient-to-b from-indigo-900/40 to-[#111] border border-indigo-500/50 rounded-3xl p-8 transform md:-translate-y-4 shadow-2xl shadow-indigo-500/10 flex flex-col relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
              <p className="text-indigo-200/70 text-sm mb-6">Perfect for bloggers and small sites.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$9</span>
                <span className="text-zinc-500">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-zinc-300 text-sm">
                  <Check className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <span><strong>10</strong> Articles per month</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300 text-sm">
                  <Check className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <span>Advanced SEO Scoring & Analysis</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300 text-sm">
                  <Check className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <span>Auto-Save to Dashboard</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300 text-sm">
                  <Check className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <span>Priority Email Support</span>
                </li>
              </ul>
              <button 
                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); user ? onStart() : onShowAuth(); }}
                className="w-full py-3 rounded-xl font-bold text-white bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/25 transition-all"
              >
                Start Starter Trial
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-[#111] border border-white/10 rounded-3xl p-8 hover:border-indigo-500/30 transition-all flex flex-col">
              <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
              <p className="text-zinc-400 text-sm mb-6">For serious marketers and niche sites.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$29</span>
                <span className="text-zinc-500">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-zinc-300 text-sm">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span><strong>50</strong> Articles per month</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300 text-sm">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span><strong>Surfer-Level NLP Pipeline</strong></span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300 text-sm">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Custom Brand Voice</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300 text-sm">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>API Access</span>
                </li>
                <li className="flex items-start gap-3 text-zinc-300 text-sm">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>24/7 Dedicated Support</span>
                </li>
              </ul>
              <button 
                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); user ? onStart() : onShowAuth(); }}
                className="w-full py-3 rounded-xl font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              >
                Get Pro
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 max-w-7xl mx-auto px-6">
        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 text-indigo-500/10">
            <Terminal className="w-64 h-64" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to scale your organic traffic?</h3>
            <p className="text-indigo-200/80 text-lg mb-0">
              Join forward-thinking SEOs, niche site builders, and SaaS content teams who are leaving generic AI writers behind.
            </p>
          </div>
          <div className="relative z-10 flex-shrink-0">
            <button 
              onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); onStart(); }}
              className="bg-white text-black hover:bg-indigo-50 px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-2"
            >
              Try RankForge AI <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#050505] pt-16 pb-8 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-200"></div>
                  <div className="relative bg-black p-1.5 rounded-lg">
                    <Brain className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
                <span className="text-lg font-bold text-white tracking-tight">RankForge AI</span>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed max-w-md">
                An advanced, multi-agent AI architecture designed to produce highly-ranked, human-quality SEO content by deeply analyzing search engine algorithms and user intent.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Product</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-zinc-500 hover:text-indigo-400 text-sm transition-colors">Features</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-indigo-400 text-sm transition-colors">Pricing</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-indigo-400 text-sm transition-colors">API Documentation</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-indigo-400 text-sm transition-colors">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-zinc-500 hover:text-indigo-400 text-sm transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-indigo-400 text-sm transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-indigo-400 text-sm transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="text-zinc-500 hover:text-indigo-400 text-sm transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-zinc-600 text-sm">
              © 2026 RankForge AI. Developed by <a href="https://www.linkedin.com/in/kaleemullah1/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">Kaleem</a>
            </p>
            <div className="flex items-center gap-6">
              <span className="text-zinc-600 text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                Systems Operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'landing' | 'app' | 'dashboard'>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [mode, setMode] = useState<'generate' | 'optimize'>('generate');
  const [keyword, setKeyword] = useState('');
  const [existingArticle, setExistingArticle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [includePhase0, setIncludePhase0] = useState(true);
  const [contentType, setContentType] = useState('');
  const [wordRange, setWordRange] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [phaseOutputs, setPhaseOutputs] = useState<Record<number, string>>({});
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({});
  const [seoScore, setSeoScore] = useState<any>(null);
  const [editableContent, setEditableContent] = useState('');
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthReady && !user && view !== 'landing') {
      setView('landing');
    }
  }, [user, isAuthReady, view]);

  const togglePhase = (id: number) => {
    setExpandedPhases(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (view === 'landing') {
    return (
      <>
        <LandingPage onStart={() => user ? setView('app') : setShowAuthModal(true)} onShowAuth={() => setShowAuthModal(true)} user={user} />
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsGenerating(true);
    setError(null);
    setContent(null);
    setSeoScore(null);
    setPhaseOutputs({});
    setExpandedPhases({});
    setStatusMessage('Initializing Agent...');

    try {
      let finalContent = "";
      let parsedScore: any = null;

      if (mode === 'generate') {
        const result = await generateSEOContent(keyword, contentType, wordRange, additionalContext, brandVoice, (status, partialOutput) => {
          setStatusMessage(status);
          
          // Extract phase ID from status message (e.g., "Completed Phase 1: ...")
          const match = status.match(/Phase (\d+)/);
          if (match && partialOutput) {
            const phaseId = parseInt(match[1]);
            setPhaseOutputs(prev => ({
              ...prev,
              [phaseId]: partialOutput
            }));
            // Auto-expand the new phase
            setExpandedPhases(prev => ({
              ...prev,
              [phaseId]: true
            }));
          }
        }, includePhase0);
        
        finalContent = result || "No content generated. Please try again.";
        
        // Try to parse JSON SEO score block
        const scoreMatch = finalContent.match(/```json\s*(\{[\s\S]*?"seo_score"[\s\S]*?\})\s*```/);
        if (scoreMatch) {
          try {
            parsedScore = JSON.parse(scoreMatch[1]);
            setSeoScore(parsedScore);
            finalContent = finalContent.replace(/```json\s*\{[\s\S]*?"seo_score"[\s\S]*?\}\s*```/, '').trim();
          } catch (e) {
            console.error("Failed to parse SEO score JSON", e);
            // Fallback to old format just in case
            const oldMatch = finalContent.match(/\[SEO_SCORE:\s*(\d+)\]/);
            if (oldMatch) {
              parsedScore = { seo_score: parseInt(oldMatch[1], 10) };
              setSeoScore(parsedScore);
              finalContent = finalContent.replace(/\[SEO_SCORE:\s*\d+\]/, '').trim();
            }
          }
        } else {
            // Fallback to old format just in case
            const oldMatch = finalContent.match(/\[SEO_SCORE:\s*(\d+)\]/);
            if (oldMatch) {
              parsedScore = { seo_score: parseInt(oldMatch[1], 10) };
              setSeoScore(parsedScore);
              finalContent = finalContent.replace(/\[SEO_SCORE:\s*\d+\]/, '').trim();
            }
        }
        setContent(finalContent);
        
        // Convert Markdown to HTML for the Rich Text Editor
        const html = await marked.parse(finalContent);
        const cleanHtml = DOMPurify.sanitize(html);
        setEditableContent(cleanHtml);
      } else {
        const result = await optimizeSEOContent(keyword, existingArticle, contentType, additionalContext, brandVoice, (status) => {
          setStatusMessage(status);
        });
        
        finalContent = result || "No content generated. Please try again.";
        
        // Try to parse JSON SEO score block
        const scoreMatch = finalContent.match(/```json\s*(\{[\s\S]*?"seo_score"[\s\S]*?\})\s*```/);
        if (scoreMatch) {
          try {
            parsedScore = JSON.parse(scoreMatch[1]);
            setSeoScore(parsedScore);
            finalContent = finalContent.replace(/```json\s*\{[\s\S]*?"seo_score"[\s\S]*?\}\s*```/, '').trim();
          } catch (e) {
            console.error("Failed to parse SEO score JSON", e);
            // Fallback to old format just in case
            const oldMatch = finalContent.match(/\[SEO_SCORE:\s*(\d+)\]/);
            if (oldMatch) {
              parsedScore = { seo_score: parseInt(oldMatch[1], 10) };
              setSeoScore(parsedScore);
              finalContent = finalContent.replace(/\[SEO_SCORE:\s*\d+\]/, '').trim();
            }
          }
        } else {
            // Fallback to old format just in case
            const oldMatch = finalContent.match(/\[SEO_SCORE:\s*(\d+)\]/);
            if (oldMatch) {
              parsedScore = { seo_score: parseInt(oldMatch[1], 10) };
              setSeoScore(parsedScore);
              finalContent = finalContent.replace(/\[SEO_SCORE:\s*\d+\]/, '').trim();
            }
        }
        setContent(finalContent);
        
        // Convert Markdown to HTML for the Rich Text Editor
        const html = await marked.parse(finalContent);
        const cleanHtml = DOMPurify.sanitize(html);
        setEditableContent(cleanHtml);
      }

      // Auto-save to dashboard
      if (user && finalContent && finalContent !== "No content generated. Please try again.") {
        try {
          await addDoc(collection(db, `users/${user.uid}/articles`), {
            userId: user.uid,
            keyword,
            content: finalContent,
            seoScore: parsedScore || null,
            mode,
            createdAt: new Date().toISOString()
          });
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
          console.error("Auto-save failed:", err);
        }
      }
    } catch (err) {
      setError("Failed to generate content. Please try again later.");
      console.error(err);
    } finally {
      setIsGenerating(false);
      setStatusMessage('');
    }
  };

  const handleHighlight = () => {
    if (!editableContent) return;
    
    const div = document.createElement('div');
    div.innerHTML = editableContent;
    
    // Check if already highlighted
    const existingHighlights = div.querySelectorAll('.highlight-long');
    if (existingHighlights.length > 0) {
      // Remove highlights
      existingHighlights.forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        }
      });
      setEditableContent(div.innerHTML);
      setIsHighlighted(false);
      return;
    }
    
    const textNodes: Node[] = [];
    const walk = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walk.nextNode())) {
      textNodes.push(node);
    }
    
    textNodes.forEach((textNode) => {
      const text = textNode.textContent || '';
      if (!text.trim()) return;
      
      // Split by sentences (approximated by punctuation followed by space)
      const parts = text.split(/([.?!]+[\s]+)/);
      let newHtml = '';
      let changed = false;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const wordCount = part.trim().split(/\s+/).length;
        
        // If it's a long sentence (e.g., > 20 words) and not just punctuation
        if (wordCount > 20 && !part.match(/^[.?!]+[\s]+$/)) {
          newHtml += `<span style="background-color: #fef08a; color: #854d0e;" class="highlight-long">${part}</span>`;
          changed = true;
        } else {
          // Escape HTML to prevent XSS or broken tags
          newHtml += part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
      }
      
      if (changed && textNode.parentNode) {
        const span = document.createElement('span');
        span.innerHTML = newHtml;
        textNode.parentNode.replaceChild(span, textNode);
      }
    });
    
    setEditableContent(div.innerHTML);
    setIsHighlighted(true);
  };

  const handleCopy = () => {
    if (editableContent) {
      const turndownService = new TurndownService();
      const markdown = turndownService.turndown(editableContent);
      navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generatePhases = [
    { id: 0, icon: Layers, title: "Structural Variation", desc: "Anti-Footprint Layer", color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20" },
    { id: 1, icon: BarChart3, title: "SERP Intelligence", desc: "Live Competitor Analysis", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    { id: 2, icon: Target, title: "Intent Enforcement", desc: "Search Intent Diagnosis", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
    { id: 3, icon: Network, title: "Semantic Architecture", desc: "Entity & Keyword Mapping", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
    { id: 4, icon: ShieldCheck, title: "E-E-A-T++ Framework", desc: "Trust & Authority Signals", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
    { id: 5, icon: PenTool, title: "Content Creation", desc: "Competitive Advantage Mode", color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20" },
    { id: 6, icon: ScanSearch, title: "AI Visibility Check", desc: "Snippet Optimization", color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20" },
  ];

  const optimizePhases = [
    { id: 1, icon: BarChart3, title: "SERP Benchmark", desc: "Competitor Intelligence", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    { id: 2, icon: Target, title: "Structure Audit", desc: "Intent & Health Check", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
    { id: 3, icon: Network, title: "Semantic Gap Analysis", desc: "Entity Coverage Evaluation", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
    { id: 4, icon: ScanSearch, title: "AI Overview Readiness", desc: "Snippet & SGE Optimization", color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20" },
    { id: 5, icon: ShieldCheck, title: "E-E-A-T Signal Audit", desc: "Trust & Credibility Check", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
    { id: 6, icon: Layers, title: "Optimization Strategy", desc: "Prioritized Action Plan", color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20" },
    { id: 7, icon: PenTool, title: "Precision Upgrades", desc: "Targeted Content Improvements", color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20" },
    { id: 8, icon: Check, title: "SEO Validation", desc: "Final Visibility Confirmation", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  ];

  const currentPhases = mode === 'generate' ? generatePhases : optimizePhases;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] opacity-40" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] opacity-40" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-200"></div>
              <div className="relative bg-black p-2 rounded-lg">
                <Brain className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                RankForge AI
              </h1>
              <span className="text-xs font-medium text-indigo-400 tracking-widest uppercase opacity-80">Semantic Content Engine</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAuthReady && (
              user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView(view === 'dashboard' ? 'app' : 'dashboard')}
                    className="text-xs font-medium text-white transition-colors px-4 py-2 rounded-full bg-indigo-500 hover:bg-indigo-600 flex items-center gap-2"
                  >
                    {view === 'dashboard' ? <Brain className="w-3 h-3" /> : <LayoutDashboard className="w-3 h-3" />}
                    {view === 'dashboard' ? 'Back to App' : 'Dashboard'}
                  </button>
                  <button
                    onClick={logOut}
                    className="text-xs font-medium text-zinc-400 hover:text-white transition-colors p-2 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/5 flex items-center justify-center"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-xs font-medium text-white transition-colors px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-2"
                >
                  <LogIn className="w-3 h-3" />
                  Sign In
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 z-10">
        
        {view === 'dashboard' ? (
          <Dashboard onViewArticle={async (article) => {
            setKeyword(article.keyword);
            setMode(article.mode);
            setContent(article.content);
            setSeoScore(article.seoScore || null);
            setPhaseOutputs({});
            const html = await marked.parse(article.content);
            const cleanHtml = DOMPurify.sanitize(html);
            setEditableContent(cleanHtml);
            setView('app');
          }} />
        ) : (
          <>
        {/* Mode Switcher */}
        {!content && !isGenerating && (
          <div className="flex justify-center mb-8">
            <div className="flex bg-zinc-900/80 p-1.5 rounded-xl border border-white/5 backdrop-blur-sm">
              <button
                onClick={() => { setMode('generate'); setContent(null); setError(null); }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'generate' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Brain className="w-4 h-4" /> Generate New Article
              </button>
              <button
                onClick={() => { setMode('optimize'); setContent(null); setError(null); }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'optimize' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <FileEdit className="w-4 h-4" /> Optimize Existing Article
              </button>
            </div>
          </div>
        )}

        {/* Hero & Input Section */}
        <div className="flex flex-col items-center justify-center mb-16 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-3xl"
          >
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-6 text-sm font-medium shadow-lg ${mode === 'generate' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 shadow-indigo-500/10' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-emerald-500/10'}`}>
              <Sparkles className="w-4 h-4" />
              <span>Premium Feature: Surfer-Level NLP Pipeline</span>
            </div>
            <h2 className={`text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r mb-6 pb-2 tracking-tight ${mode === 'generate' ? 'from-white via-indigo-200 to-indigo-400' : 'from-white via-emerald-200 to-emerald-400'}`}>
              {mode === 'generate' ? 'Dominate the SERPs with AI Precision' : 'Revive & Optimize Existing Content'}
            </h2>
            <p className="text-lg text-zinc-400 mb-10 leading-relaxed max-w-2xl mx-auto">
              {mode === 'generate' 
                ? 'Execute a 7-phase architectural analysis to reverse-engineer competitors and satisfy user intent.'
                : 'Audit, diagnose, and upgrade your underperforming articles for modern Google ranking systems.'}
            </p>

            <div className="relative group w-full">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <form onSubmit={handleSubmit} className="relative bg-zinc-900 rounded-xl p-4 flex flex-col gap-4 shadow-2xl">
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className={`h-5 w-5 text-zinc-500 group-focus-within:${mode === 'generate' ? 'text-indigo-400' : 'text-emerald-400'} transition-colors`} />
                    </div>
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="Enter target keyword (e.g., 'enterprise saas pricing strategies')"
                      className={`block w-full pl-12 pr-4 py-4 bg-black/20 border border-white/5 rounded-lg text-white placeholder:text-zinc-600 focus:ring-1 ${mode === 'generate' ? 'focus:ring-indigo-500' : 'focus:ring-emerald-500'} text-lg font-medium`}
                      disabled={isGenerating}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isGenerating || !keyword.trim() || (mode === 'optimize' && !existingArticle.trim())}
                    className={`bg-white text-black ${mode === 'generate' ? 'hover:bg-indigo-50' : 'hover:bg-emerald-50'} px-8 py-4 rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[160px]`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        {mode === 'generate' ? 'Generate' : 'Optimize'}
                        {mode === 'generate' ? <Zap className="w-5 h-5 fill-black" /> : <FileEdit className="w-5 h-5 fill-black" />}
                      </>
                    )}
                  </button>
                </div>

                {/* Existing Article Input (Only in Optimize Mode) */}
                {mode === 'optimize' && (
                  <div className="pt-2">
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">
                      Existing Article Content <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={existingArticle}
                      onChange={(e) => setExistingArticle(e.target.value)}
                      placeholder="Paste your existing article content here..."
                      className="block w-full p-4 bg-black/20 border border-white/5 rounded-lg text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-y min-h-[200px] custom-scrollbar"
                      disabled={isGenerating}
                      required
                    />
                  </div>
                )}

                {/* Content Configuration Section */}
                <div className="pt-4 border-t border-white/5">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Content Configuration
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">
                        Content Type (Optional)
                      </label>
                      <CustomSelect
                        value={contentType}
                        onChange={setContentType}
                        disabled={isGenerating}
                        placeholder="Standard Article (Default)"
                        options={[
                          { value: '', label: 'Standard Article (Default)' },
                          { value: 'Pillar Content', label: 'Pillar Content' },
                          { value: 'Cluster Content', label: 'Cluster Content' },
                          { value: 'Supporting Article', label: 'Supporting Article' },
                          { value: 'Commercial Page', label: 'Commercial Page' },
                        ]}
                      />
                    </div>
                    {mode === 'generate' && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">
                          Target Word Range (Optional)
                        </label>
                        <CustomSelect
                          value={wordRange}
                          onChange={setWordRange}
                          disabled={isGenerating}
                          placeholder="Select range..."
                          options={[
                            { value: '', label: 'Select range...' },
                            { value: '1200–1500', label: '1200–1500 words' },
                            { value: '1500–2000', label: '1500–2000 words' },
                            { value: '2000–3000', label: '2000–3000 words' },
                            { value: '3000+', label: '3000+ words' },
                          ]}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">
                      Additional Context (Audience, Angle, Specific Constraints) (Optional)
                    </label>
                    <textarea
                      value={additionalContext}
                      onChange={(e) => setAdditionalContext(e.target.value)}
                      placeholder="Example:&#10;- Target audience: Beginners / SaaS founders / Developers&#10;- Desired angle: Technical deep dive / Practical guide / Comparison-focused&#10;- Constraints: Avoid affiliate tone / Include case study / Add workflow example"
                      className={`block w-full p-3 bg-black/20 border border-white/5 rounded-lg text-white placeholder:text-zinc-600 focus:ring-1 text-sm resize-y min-h-[100px] custom-scrollbar mb-4 ${mode === 'generate' ? 'focus:ring-indigo-500 focus:border-indigo-500' : 'focus:ring-emerald-500 focus:border-emerald-500'}`}
                      disabled={isGenerating}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1 flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-purple-400" /> Custom Brand Voice (Pro Feature)
                    </label>
                    <textarea
                      value={brandVoice}
                      onChange={(e) => setBrandVoice(e.target.value)}
                      placeholder="Example: Write in a friendly, conversational tone like a tech blogger. Use short sentences and simple words. Avoid corporate jargon."
                      className={`block w-full p-3 bg-black/20 border border-white/5 rounded-lg text-white placeholder:text-zinc-600 focus:ring-1 text-sm resize-y min-h-[80px] custom-scrollbar ${mode === 'generate' ? 'focus:ring-indigo-500 focus:border-indigo-500' : 'focus:ring-emerald-500 focus:border-emerald-500'}`}
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Toggle Switch */}
            {mode === 'generate' && (
              <div className="mt-6 flex justify-center">
                <label className="inline-flex items-center cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={includePhase0}
                      onChange={(e) => setIncludePhase0(e.target.checked)}
                      disabled={isGenerating}
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                  </div>
                  <span className="ml-3 text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">
                    Include Phase 0 (Structural Variation)
                  </span>
                </label>
              </div>
            )}
          </motion.div>
        </div>

        {/* Phases Grid (Info State) */}
        {!content && !isGenerating && !error && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {currentPhases.map((phase, i) => (
              <div 
                key={i} 
                className={`p-6 rounded-2xl border ${phase.border} ${phase.bg} backdrop-blur-sm hover:bg-opacity-20 transition-all duration-300 group`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-black/20 ${phase.color}`}>
                    <phase.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${phase.color}`}>Phase {phase.id}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-200 transition-colors">{phase.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{phase.desc}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto mt-8 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-4 text-red-200"
          >
            <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0 text-red-400" />
            <div>
              <h3 className="font-bold text-red-400">Generation Failed</h3>
              <p className="text-sm mt-1 opacity-80">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Loading State with Real-time Stream */}
        {isGenerating && (
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-r-4 border-purple-500 rounded-full animate-spin reverse-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2 animate-pulse">
                {statusMessage || (mode === 'generate' ? "Architecting Content Strategy" : "Auditing and Optimizing Article")}
              </h3>
              <p className="text-zinc-500">
                {mode === 'generate' ? 'Analyzing live SERP data and mapping semantic entities...' : 'Running 8-phase optimization analysis...'}
              </p>
            </div>

            {/* Current Active Phase Indicator */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto opacity-80">
               {currentPhases.map((phase, i) => {
                 const activePhaseMatch = statusMessage.match(/Phase (\d+)/);
                 const activePhaseId = activePhaseMatch ? parseInt(activePhaseMatch[1]) : 0;
                 
                 let isActive = false;
                 let isCompleted = false;
                 
                 if (mode === 'generate') {
                   isActive = statusMessage.includes(`Phase ${phase.id}`) && !statusMessage.includes("Completed");
                   isCompleted = phaseOutputs[phase.id] !== undefined;
                 } else {
                   isActive = activePhaseId === phase.id && !statusMessage.includes("Optimization Complete!");
                   isCompleted = statusMessage.includes("Optimization Complete!") || (activePhaseId > phase.id);
                 }
                 
                 // Skip Phase 0 if toggle is off
                 if (phase.id === 0 && !includePhase0) return null;

                 return (
                  <div key={i} className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${isActive ? 'bg-indigo-900/20 border-indigo-500/50 scale-105 shadow-lg shadow-indigo-500/10' : isCompleted ? 'bg-zinc-900/50 border-emerald-500/20 opacity-50' : 'bg-zinc-900/20 border-white/5 opacity-30'}`}>
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-indigo-400 animate-ping' : isCompleted ? 'bg-emerald-500' : 'bg-zinc-700'}`}></div>
                    <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-zinc-400'}`}>Phase {phase.id}: {phase.title}</span>
                  </div>
                );
               })}
            </div>
          </div>
        )}

        {/* Phase Outputs Grid - Always Visible if there are outputs */}
        {Object.keys(phaseOutputs).length > 0 && (
          <div className="space-y-6 w-full max-w-5xl mx-auto mb-12 mt-12">
            {Object.entries(phaseOutputs).map(([id, output]) => {
              const phaseId = parseInt(id);
              const phase = generatePhases.find(p => p.id === phaseId) || { title: `Phase ${phaseId}`, icon: FileText, color: 'text-white', border: 'border-white/10', bg: 'bg-zinc-900' };
              const isExpanded = expandedPhases[phaseId];
              
              return (
                <motion.div 
                  key={phaseId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border ${phase.border} bg-[#111] overflow-hidden shadow-lg transition-all duration-300`}
                >
                  <div 
                    onClick={() => togglePhase(phaseId)}
                    className={`px-6 py-4 border-b ${phase.border} bg-white/5 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg bg-white/10 ${phase.color}`}>
                        <phase.icon className="w-4 h-4" />
                      </div>
                      <h3 className={`font-bold text-sm uppercase tracking-wider ${phase.color}`}>
                        Phase {phaseId}: {phase.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Copy Button for Phase 5 */}
                      {phaseId === 5 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(String(output).replace(/^## PHASE \d+ OUTPUT\n/, ''));
                            // Optional: Add visual feedback for this specific button if needed
                            // For now, using the global copied state or a simple alert might be confusing
                            // Let's just rely on the action. Or better, reuse the copied state logic but localised?
                            // To keep it simple as per request, just the button.
                            const btn = e.currentTarget;
                            const originalText = btn.innerHTML;
                            btn.innerHTML = `<svg class="w-3 h-3 text-emerald-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span class="text-emerald-400">Copied</span>`;
                            setTimeout(() => {
                              btn.innerHTML = originalText;
                            }, 2000);
                          }}
                          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all"
                        >
                          <Copy className="w-3 h-3" />
                          Copy Article
                        </button>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Completed</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
                          <div className="markdown-body max-w-none dark-mode text-sm">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {String(output).replace(/^## PHASE \d+ OUTPUT\n/, '')}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Content Display */}
        {content && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-8"
          >
            <div className="bg-[#111] rounded-3xl border border-white/10 overflow-hidden shadow-2xl ring-1 ring-white/5">
              <div className="border-b border-white/5 bg-[#111]/90 px-6 py-4 flex items-center justify-between sticky top-20 z-20 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-full ring-1 ring-emerald-500/20">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white leading-none">Analysis Complete</h2>
                    <p className="text-xs text-zinc-500 mt-1 font-mono">Target: {keyword}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      if (!user) {
                        alert("Please sign in to save articles.");
                        return;
                      }
                      setIsSaving(true);
                      try {
                        const turndownService = new TurndownService();
                        const markdownToSave = editableContent ? turndownService.turndown(editableContent) : content;
                        await addDoc(collection(db, `users/${user.uid}/articles`), {
                          userId: user.uid,
                          keyword,
                          content: markdownToSave,
                          seoScore: seoScore || null,
                          mode,
                          createdAt: new Date().toISOString()
                        });
                        setSaveSuccess(true);
                        setTimeout(() => setSaveSuccess(false), 3000);
                      } catch (err) {
                        console.error("Error saving article:", err);
                        alert("Failed to save article.");
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving || saveSuccess}
                    className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all group ${saveSuccess ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20 hover:border-indigo-500/40'} border`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    )}
                    {isSaving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save to Dashboard'}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 px-4 py-2 rounded-lg transition-all group"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Copy Markdown
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="p-8 md:p-16 bg-[#111] grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3">
                {seoScore !== null && (
                  <div className="mb-12 space-y-6">
                    <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex-1 w-full">
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                          <Target className="w-5 h-5 text-indigo-400" />
                          Advanced SEO Optimization Score
                        </h3>
                        <p className="text-zinc-400 text-sm max-w-md mb-4">
                          This score reflects the article's alignment with search intent, semantic entity coverage, and E-E-A-T signals based on live SERP analysis.
                        </p>
                        
                        {seoScore.breakdown && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 border-t border-white/10 pt-4">
                            <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Structure</div>
                              <div className="text-lg font-bold text-white">{seoScore.breakdown.structure}/100</div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Keywords</div>
                              <div className="text-lg font-bold text-white">{seoScore.breakdown.keywords}/100</div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Readability</div>
                              <div className="text-lg font-bold text-white">{seoScore.breakdown.readability}/100</div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Intent Match</div>
                              <div className="text-lg font-bold text-white">{seoScore.breakdown.intent_match}/100</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90 absolute inset-0" viewBox="0 0 100 100">
                          <circle
                            className="text-zinc-800 stroke-current"
                            strokeWidth="8"
                            cx="50"
                            cy="50"
                            r="42"
                            fill="transparent"
                          ></circle>
                          <circle
                            className={`${
                              (seoScore.seo_score || seoScore) >= 80 ? 'text-emerald-500' : (seoScore.seo_score || seoScore) >= 60 ? 'text-amber-500' : 'text-rose-500'
                            } stroke-current transition-all duration-1000 ease-out`}
                            strokeWidth="8"
                            strokeLinecap="round"
                            cx="50"
                            cy="50"
                            r="42"
                            fill="transparent"
                            strokeDasharray="263.89"
                            strokeDashoffset={263.89 - (263.89 * (seoScore.seo_score || seoScore)) / 100}
                          ></circle>
                        </svg>
                        <div className="relative z-10 flex items-center justify-center flex-col">
                          <span className="text-4xl font-black text-white tracking-tighter">{seoScore.seo_score || seoScore}</span>
                          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mt-1">Score</span>
                        </div>
                      </div>
                    </div>

                    {seoScore.breakdown && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 p-6 bg-zinc-900/50 border border-white/10 rounded-2xl flex flex-col items-center justify-center min-h-[250px]">
                          <h4 className="text-sm font-bold text-zinc-300 mb-4 uppercase tracking-widest w-full text-left">Score Radar</h4>
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                              { subject: 'Structure', A: seoScore.breakdown.structure, fullMark: 100 },
                              { subject: 'Keywords', A: seoScore.breakdown.keywords, fullMark: 100 },
                              { subject: 'Readability', A: seoScore.breakdown.readability, fullMark: 100 },
                              { subject: 'Intent', A: seoScore.breakdown.intent_match, fullMark: 100 },
                            ]}>
                              <PolarGrid stroke="#333" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar name="Score" dataKey="A" stroke="#818cf8" fill="#818cf8" fillOpacity={0.5} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {seoScore.readability_level && (
                            <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/10">
                              <div className="text-xs text-indigo-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Readability Level
                              </div>
                              <div className="text-xl font-bold text-white">{seoScore.readability_level}</div>
                            </div>
                          )}
                          
                          {seoScore.nlp_entities && seoScore.nlp_entities.length > 0 && (
                            <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/10">
                              <div className="text-xs text-emerald-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
                                <Network className="w-4 h-4" /> NLP Entities Detected
                              </div>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {seoScore.nlp_entities.map((entity: string, idx: number) => (
                                  <span key={idx} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-md border border-emerald-500/20">
                                    {entity}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {seoScore.eeat_signals && seoScore.eeat_signals.length > 0 && (
                            <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/10">
                              <div className="text-xs text-blue-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" /> E-E-A-T Signals
                              </div>
                              <ul className="space-y-1.5 mt-2">
                                {seoScore.eeat_signals.map((signal: string, idx: number) => (
                                  <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                                    <Check className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" /> {signal}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {seoScore.content_gaps && seoScore.content_gaps.length > 0 && (
                            <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/10">
                              <div className="text-xs text-rose-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
                                <ScanSearch className="w-4 h-4" /> Content Gaps
                              </div>
                              <ul className="space-y-1.5 mt-2">
                                {seoScore.content_gaps.map((gap: string, idx: number) => (
                                  <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                                    <AlertCircle className="w-3 h-3 text-rose-500 mt-0.5 flex-shrink-0" /> {gap}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {seoScore.improvements && seoScore.improvements.length > 0 && (
                      <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-2xl">
                        <div className="text-sm text-amber-400 uppercase tracking-wider mb-4 font-bold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> Suggested Improvements
                        </div>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {seoScore.improvements.map((imp: string, idx: number) => (
                            <li key={idx} className="text-sm text-zinc-300 flex items-start gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
                              <span className="text-amber-500/50 mt-0.5 flex-shrink-0">•</span> {imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="bg-white text-black rounded-xl overflow-hidden shadow-sm border border-white/10">
                  <ReactQuill 
                    theme="snow" 
                    value={editableContent} 
                    onChange={setEditableContent}
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link', 'image', 'blockquote', 'code-block'],
                        ['clean']
                      ]
                    }}
                    className="min-h-[500px]"
                  />
                </div>
                </div>
                <div className="xl:col-span-1 self-start sticky top-24">
                  <StickyAssistant 
                    content={editableContent} 
                    targetKeyword={keyword} 
                    seoScore={seoScore} 
                    onHighlight={handleHighlight}
                    isHighlighted={isHighlighted}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        </>
        )}
      </main>
    </div>
  );
}
