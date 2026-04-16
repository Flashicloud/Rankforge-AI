/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateSEOContent, optimizeSEOContent } from './services/gemini';
import { Search, Sparkles, FileText, AlertCircle, Copy, Check, Loader2, Layers, BarChart3, Target, Network, ShieldCheck, PenTool, ScanSearch, Zap, ChevronDown, ChevronUp, TrendingUp, BrainCircuit, Fingerprint, ArrowRight, Terminal, FileEdit, Brain, Globe, LogIn, LogOut, LayoutDashboard, Save, X, Menu, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { auth, db, logOut } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';

const Dashboard = lazy(() => import('./components/Dashboard'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const JoditEditor = lazy(() => import('jodit-react'));

// Lazy load recharts components
const RadarChart = lazy(() => import('recharts').then(module => ({ default: module.RadarChart })));
const PolarGrid = lazy(() => import('recharts').then(module => ({ default: module.PolarGrid })));
const PolarAngleAxis = lazy(() => import('recharts').then(module => ({ default: module.PolarAngleAxis })));
const PolarRadiusAxis = lazy(() => import('recharts').then(module => ({ default: module.PolarRadiusAxis })));
const Radar = lazy(() => import('recharts').then(module => ({ default: module.Radar })));
const ResponsiveContainer = lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));

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
        className={`block w-full text-left p-3.5 pr-10 bg-black/30 backdrop-blur-md border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-all shadow-inner ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5 hover:border-white/20 cursor-pointer'}`}
      >
        <span className={selectedOption && selectedOption.value !== '' ? 'text-white font-medium' : 'text-zinc-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : ''}`} />
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
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute z-50 w-full mt-2 bg-zinc-900/95 border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-2xl ring-1 ring-white/5"
            >
              <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-3 text-sm rounded-lg transition-all duration-200 ${value === option.value ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-zinc-300 hover:bg-white/10 hover:text-white font-medium'}`}
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeLegalPage, setActiveLegalPage] = useState<'privacy' | 'terms' | 'cookie' | 'contact' | null>(null);

  const legalContent = {
    privacy: {
      title: 'Privacy Policy',
      content: `Last updated: ${new Date().toLocaleDateString()}\n\nAt RankForge AI, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.\n\n**1. Information We Collect**\nWe may collect personal information such as your name, email address, and usage data when you register for an account or use our AI services.\n\n**2. How We Use Your Information**\nWe use the information we collect to provide, maintain, and improve our services, to communicate with you, and to personalize your experience.\n\n**3. Data Security**\nWe implement reasonable security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.\n\n**4. Third-Party Services**\nWe may use third-party service providers to facilitate our services, such as payment processors and analytics providers. These third parties have access to your personal information only to perform these tasks on our behalf.\n\n**5. Changes to This Policy**\nWe may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.`
    },
    terms: {
      title: 'Terms of Service',
      content: `Last updated: ${new Date().toLocaleDateString()}\n\nWelcome to RankForge AI. By accessing or using our website and services, you agree to be bound by these Terms of Service.\n\n**1. Use of Services**\nYou must use our services in compliance with all applicable laws and regulations. You may not use our services for any illegal or unauthorized purpose.\n\n**2. User Accounts**\nYou are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.\n\n**3. Intellectual Property**\nAll content, features, and functionality of our services are owned by RankForge AI and are protected by intellectual property laws.\n\n**4. Limitation of Liability**\nRankForge AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use our services.\n\n**5. Termination**\nWe may terminate or suspend your account and access to our services immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.`
    },
    cookie: {
      title: 'Cookie Policy',
      content: `Last updated: ${new Date().toLocaleDateString()}\n\nThis Cookie Policy explains how RankForge AI uses cookies and similar technologies to recognize you when you visit our website.\n\n**1. What are cookies?**\nCookies are small data files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide reporting information.\n\n**2. How we use cookies**\nWe use cookies to understand how you use our website, to remember your preferences, and to improve your user experience. We may also use cookies for authentication and security purposes.\n\n**3. Types of cookies we use**\nWe use both session cookies (which expire when you close your browser) and persistent cookies (which stay on your device until deleted). We may use essential cookies, performance cookies, and functionality cookies.\n\n**4. Your choices**\nYou have the right to decide whether to accept or reject cookies. You can set or amend your web browser controls to accept or refuse cookies.`
    },
    contact: {
      title: 'Contact Us',
      content: `We'd love to hear from you! If you have any questions, concerns, or feedback, please reach out to us.\n\n**Email:** support@rankforgeai.com\n\n**Address:**\nRankForge AI HQ\n123 Innovation Drive\nTech City, TC 90210\n\nFor partnership inquiries, please email partners@rankforgeai.com.\n\nFor press inquiries, please email press@rankforgeai.com.`
    }
  };

  const marqueeItems = [
    { icon: Globe, label: 'Live SERP Analysis' },
    { icon: BrainCircuit, label: 'Semantic Entity Mapping' },
    { icon: ShieldCheck, label: 'E-E-A-T Compliant' },
    { icon: Target, label: 'Search Intent Alignment' },
    { icon: TrendingUp, label: 'NLP Optimization' },
    { icon: Fingerprint, label: 'Anti-AI Footprint' },
    { icon: ScanSearch, label: 'AI Overview Readiness' },
    { icon: Zap, label: 'Instant Content Generation' },
    { icon: Globe, label: 'Live SERP Analysis' },
    { icon: BrainCircuit, label: 'Semantic Entity Mapping' },
    { icon: ShieldCheck, label: 'E-E-A-T Compliant' },
    { icon: Target, label: 'Search Intent Alignment' },
    { icon: TrendingUp, label: 'NLP Optimization' },
    { icon: Fingerprint, label: 'Anti-AI Footprint' },
    { icon: ScanSearch, label: 'AI Overview Readiness' },
    { icon: Zap, label: 'Instant Content Generation' },
  ];

  return (
    <div className="min-h-screen bg-[#080810] text-zinc-50 selection:bg-indigo-500/30 font-sans overflow-x-hidden">

      {/* Navbar */}
      <nav className="border-b border-white/[0.06] bg-[#080810]/80 backdrop-blur-xl fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-50 group-hover:opacity-90 transition duration-300"></div>
              <div className="relative bg-[#0e0e1a] p-2 rounded-xl border border-white/10">
                <Brain className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">RankForge AI</span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400 opacity-70 hidden sm:inline">Beta</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors font-medium">Features</a>
            <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors font-medium">How it Works</a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors font-medium">Pricing</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <button onClick={onShowAuth} className="text-sm text-zinc-400 hover:text-white font-medium transition-colors px-4 py-2 rounded-lg hover:bg-white/5">
                Sign In
              </button>
            ) : (
              <span className="text-zinc-400 text-sm hidden sm:block">
                <strong className="text-white">{user.email}</strong>
              </span>
            )}
            <button onClick={onStart} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 flex items-center gap-2">
              Go to App <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-zinc-400 hover:text-white focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0e0e1a] border-b border-white/[0.06] overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 flex flex-col gap-4">
                <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-base text-zinc-300 hover:text-white font-medium py-2">Features</a>
                <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-base text-zinc-300 hover:text-white font-medium py-2">How it Works</a>
                <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-base text-zinc-300 hover:text-white font-medium py-2">Pricing</a>
                
                <div className="h-px bg-white/10 my-2"></div>
                
                {!user ? (
                  <button onClick={() => { onShowAuth(); setIsMobileMenuOpen(false); }} className="text-base text-left text-zinc-300 hover:text-white font-medium py-2">
                    Sign In
                  </button>
                ) : (
                  <span className="text-zinc-400 text-sm py-2">
                    Signed in as <strong className="text-white">{user.email}</strong>
                  </span>
                )}
                <button onClick={() => { onStart(); setIsMobileMenuOpen(false); }} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-3 rounded-xl font-semibold text-base flex items-center justify-center gap-2 mt-2">
                  Go to App <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-28 pb-16 sm:pt-36 sm:pb-20 lg:pt-48 lg:pb-28 overflow-hidden bg-grid">
        {/* Ambient blobs */}
        <div className="absolute top-0 left-1/4 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-indigo-600/20 rounded-full blur-[80px] sm:blur-[130px] opacity-60 pointer-events-none"></div>
        <div className="absolute top-20 right-1/4 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-purple-600/15 rounded-full blur-[60px] sm:blur-[100px] opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[800px] h-[150px] sm:h-[300px] bg-indigo-900/20 rounded-full blur-[50px] sm:blur-[80px] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-[10px] sm:text-xs font-semibold mb-6 sm:mb-8 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block"></span>
            The Next Generation of SEO Content
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-[72px] font-black tracking-tight mb-5 sm:mb-7 leading-[1.1] sm:leading-[1.05]">
            The Ultimate{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              AI Article Writer
            </span>
            <br />
            for SEO Dominance
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed font-light px-2 sm:px-0">
            Not another text generator. A comprehensive <span className="text-white font-medium">AI SEO content engine</span> that analyzes live SERPs, maps semantic entities, and writes human-quality articles built to rank on Google.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={onStart}
              className="shimmer-btn px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center gap-2.5 shadow-[0_0_50px_rgba(99,102,241,0.35)] hover:shadow-[0_0_70px_rgba(99,102,241,0.5)] hover:scale-[1.02]"
            >
              Start Writing for Free <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onShowAuth}
              className="px-8 py-4 rounded-2xl font-semibold text-lg text-zinc-300 hover:text-white border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.07] transition-all flex items-center gap-2"
            >
              View Demo
            </button>
          </div>

          {/* Stats Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 pt-8 border-t border-white/5">
            <div className="text-center">
              <div className="text-3xl font-black text-white stat-number">7<span className="text-indigo-400">-Phase</span></div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Semantic Engine</div>
            </div>
            <div className="hidden sm:block w-px h-10 bg-white/10"></div>
            <div className="text-center">
              <div className="text-3xl font-black text-white stat-number">70<span className="text-purple-400">%</span></div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Human Score Rate</div>
            </div>
            <div className="hidden sm:block w-px h-10 bg-white/10"></div>
            <div className="text-center">
              <div className="text-3xl font-black text-white stat-number">3<span className="text-pink-400">x</span></div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">More Organic Traffic</div>
            </div>
            <div className="hidden sm:block w-px h-10 bg-white/10"></div>
            <div className="text-center">
              <div className="text-3xl font-black text-white stat-number">10<span className="text-indigo-400">k+</span></div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Articles Generated</div>
            </div>
          </div>
        </div>
      </div>

      {/* Marquee Ticker */}
      <div className="py-5 border-y border-white/[0.06] bg-white/[0.02] marquee-wrapper">
        <div className="marquee-track">
          {marqueeItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 px-8 text-zinc-400 whitespace-nowrap">
              <item.icon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
              <span className="ml-8 text-white/10">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-28 bg-[#080810]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-5">
              Core Capabilities
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-5 tracking-tight">Why Choose Our AI Writing Assistant?</h2>
            <p className="text-zinc-400 max-w-xl mx-auto text-lg">Built for SEO professionals and content creators who demand quality over quantity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="gradient-border card-glow group cursor-default p-8">
              <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-300">
                <Globe className="w-7 h-7 text-indigo-400" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">Feature 01</div>
              <h3 className="text-xl font-bold mb-3 text-white">Live SERP Analysis</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">Our <strong className="text-zinc-300">AI article writer</strong> doesn't guess. It scrapes the top results in real-time to understand exactly what search intent to target.</p>
            </div>

            {/* Card 2 */}
            <div className="gradient-border card-glow group cursor-default p-8" style={{background: '#111118'}}>
              <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all duration-300">
                <TrendingUp className="w-7 h-7 text-purple-400" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-2">Feature 02</div>
              <h3 className="text-xl font-bold mb-3 text-white">Surfer-Level NLP Pipeline</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">Acts like Surfer SEO on autopilot. Injects missing semantic entities, LSI keywords, and optimizes NLP scores to boost your topical authority.</p>
            </div>

            {/* Card 3 */}
            <div className="gradient-border card-glow group cursor-default p-8">
              <div className="w-14 h-14 bg-pink-500/10 border border-pink-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-pink-500/20 group-hover:scale-110 transition-all duration-300">
                <ShieldCheck className="w-7 h-7 text-pink-400" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-pink-400 mb-2">Feature 03</div>
              <h3 className="text-xl font-bold mb-3 text-white">E-E-A-T Compliant</h3>
              <p className="text-zinc-500 leading-relaxed text-sm">Unlike basic AI generators, RankForge structures content to highlight Experience, Expertise, Authoritativeness, and Trustworthiness.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Landing Page Content */}
      <div className="pt-20 pb-4 border-t border-white/[0.06] bg-[#0a0a12] max-w-full">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-5">
            Deep Dive
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
            Beyond Standard AI.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Engineered for the SERPs.</span>
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Stop publishing generic AI content penalized by Google. Whether generating new articles or rescuing underperforming pages, we build human-first, intent-optimized content that search engines reward.
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
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="py-24 bg-[#080810]">
      <div className="max-w-7xl mx-auto px-6">
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
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-24 bg-[#0a0a12] border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-5">
              Pricing
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Simple, Transparent Pricing</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Generate high-ranking SEO content at a fraction of the cost of traditional agencies. Choose the plan that fits your growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {/* Free Plan */}
            <div className="bg-[#111118] border border-white/[0.07] rounded-3xl p-7 hover:border-white/20 transition-all duration-300 flex flex-col group">
              <div className="mb-6">
                <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Free</div>
                <h3 className="text-4xl font-black text-white">$0<span className="text-xl font-medium text-zinc-500 ml-1">/mo</span></h3>
                <p className="text-zinc-500 text-sm mt-2">Test the waters and see the quality.</p>
              </div>
              <div className="h-px bg-white/[0.06] mb-6"></div>
              <ul className="space-y-3.5 mb-8 flex-1">
                <li className="flex items-center gap-3 text-zinc-400 text-sm">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span><strong className="text-zinc-200">1</strong> Article per month</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-400 text-sm">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span>Basic SEO Scoring</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-600 text-sm line-through">
                  <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                    <X className="w-3 h-3 text-zinc-600" />
                  </div>
                  <span>Content Optimization Tool</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-600 text-sm line-through">
                  <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                    <X className="w-3 h-3 text-zinc-600" />
                  </div>
                  <span>Research & Strategy Data</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-600 text-sm line-through">
                  <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                    <X className="w-3 h-3 text-zinc-600" />
                  </div>
                  <span>Auto-Save to Dashboard</span>
                </li>
              </ul>
              <button
                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); user ? onStart() : onShowAuth(); }}
                className="w-full py-3 rounded-xl font-semibold text-sm text-zinc-300 hover:text-white bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] hover:border-white/20 transition-all"
              >
                Get Started Free
              </button>
            </div>

            {/* Starter Plan — Most Popular */}
            <div className="relative rounded-3xl p-[1px] flex-col" style={{background: 'linear-gradient(135deg, #6366f1, #a855f7, #6366f1)'}}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest py-1 px-4 rounded-full shadow-lg shadow-indigo-500/30">
                  Most Popular
                </div>
              </div>
              <div className="bg-[#13131f] rounded-[calc(1.5rem-1px)] p-7 flex flex-col h-full">
                <div className="mb-6">
                  <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Starter</div>
                  <h3 className="text-4xl font-black text-white">$9<span className="text-xl font-medium text-zinc-500 ml-1">/mo</span></h3>
                  <p className="text-zinc-400 text-sm mt-2">Perfect for bloggers and small sites.</p>
                </div>
                <div className="h-px bg-white/10 mb-6"></div>
                <ul className="space-y-3.5 mb-8 flex-1">
                  {['10 Articles per month', 'Content Optimization Tool', 'Research & Strategy Data', 'Auto-Save to Dashboard'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-zinc-300 text-sm">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-indigo-400" />
                      </div>
                      <span dangerouslySetInnerHTML={{__html: i === 0 ? '<strong class="text-white">10</strong> Articles per month' : item}} />
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); user ? onStart() : onShowAuth(); }}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40"
                >
                  Start Free Trial
                </button>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-[#111118] border border-white/[0.07] rounded-3xl p-7 hover:border-white/20 transition-all duration-300 flex flex-col group">
              <div className="mb-6">
                <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Pro</div>
                <h3 className="text-4xl font-black text-white">$29<span className="text-xl font-medium text-zinc-500 ml-1">/mo</span></h3>
                <p className="text-zinc-500 text-sm mt-2">For serious marketers and niche sites.</p>
              </div>
              <div className="h-px bg-white/[0.06] mb-6"></div>
              <ul className="space-y-3.5 mb-8 flex-1">
                {[
                  { label: '<strong class="text-zinc-200">50</strong> Articles per month', ok: true },
                  { label: '<strong class="text-zinc-200">Surfer-Level NLP Pipeline</strong>', ok: true },
                  { label: 'Custom Brand Voice', ok: true },
                  { label: 'API Access', ok: true },
                  { label: '24/7 Dedicated Support', ok: true },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-400 text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span dangerouslySetInnerHTML={{__html: item.label}} />
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); user ? onStart() : onShowAuth(); }}
                className="w-full py-3 rounded-xl font-semibold text-sm text-zinc-300 hover:text-white bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] hover:border-white/20 transition-all"
              >
                Get Pro Access
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl p-[1px]" style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.5) 0%, rgba(168,85,247,0.3) 50%, rgba(99,102,241,0.2) 100%)'}}>
            <div className="bg-[#0e0e1c] rounded-[calc(1.5rem-1px)] p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
              {/* background blob */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none"></div>

              <div className="relative z-10 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block"></span>
                  Ready to Rank
                </div>
                <h3 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight tracking-tight">Ready to scale your organic traffic?</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Join forward-thinking SEOs, niche site builders, and SaaS content teams who are leaving generic AI writers behind.
                </p>
              </div>
              <div className="relative z-10 flex-shrink-0 flex flex-col gap-3 items-center">
                <button
                  onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); onStart(); }}
                  className="shimmer-btn px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center gap-2.5 hover:scale-105 shadow-[0_0_40px_rgba(99,102,241,0.3)]"
                >
                  Try RankForge AI <ArrowRight className="w-5 h-5" />
                </button>
                <span className="text-zinc-600 text-xs">No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#050508] pt-16 pb-8 mt-auto relative z-10">
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
                <li><button onClick={() => setActiveLegalPage('privacy')} className="text-zinc-500 hover:text-indigo-400 text-sm transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => setActiveLegalPage('terms')} className="text-zinc-500 hover:text-indigo-400 text-sm transition-colors">Terms of Service</button></li>
                <li><button onClick={() => setActiveLegalPage('cookie')} className="text-zinc-500 hover:text-indigo-400 text-sm transition-colors">Cookie Policy</button></li>
                <li><button onClick={() => setActiveLegalPage('contact')} className="text-zinc-500 hover:text-indigo-400 text-sm transition-colors">Contact Us</button></li>
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

      {/* Legal Modal */}
      <AnimatePresence>
        {activeLegalPage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setActiveLegalPage(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0e0e1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-2xl font-bold text-white">{legalContent[activeLegalPage].title}</h2>
                <button
                  onClick={() => setActiveLegalPage(null)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="prose prose-invert prose-indigo max-w-none">
                  <ReactMarkdown>{legalContent[activeLegalPage].content}</ReactMarkdown>
                </div>
              </div>
              <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
                <button
                  onClick={() => setActiveLegalPage(null)}
                  className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const extractArticleAndResearch = (fullText: string, currentMode: 'generate' | 'optimize') => {
  let research = fullText;
  let article = fullText;

  if (currentMode === 'generate') {
    // Try exact match first since runPhase appends exactly "## PHASE X OUTPUT"
    const p5Marker = '## PHASE 5 OUTPUT';
    const p6Marker = '## PHASE 6 OUTPUT';
    
    const p5Index = fullText.indexOf(p5Marker);
    if (p5Index !== -1) {
      const startIdx = fullText.indexOf('\n', p5Index);
      const p6Index = fullText.indexOf(p6Marker, startIdx);
      
      if (p6Index !== -1) {
        article = fullText.substring(startIdx, p6Index).trim();
      } else {
        article = fullText.substring(startIdx).trim();
      }
      return { article, research };
    }

    // Fallback regex if exact marker is missing
    const phase5Match = fullText.match(/(?:^|\n)[ \t]*(?:## |### |\*\*|__)*[ \t]*(?:PHASE 5|5\.)[^\n]*\n([\s\S]*?)(?:(?:^|\n)[ \t]*(?:## |### |\*\*|__)*[ \t]*(?:PHASE 6|6\.)|$)/i);
    if (phase5Match) {
      article = phase5Match[1].trim();
    }
  } else {
    // Optimize mode: Article is usually in Phase 7
    const phase7Match = fullText.match(/(?:^|\n)[ \t]*(?:## |### |\*\*|__)*[ \t]*(?:PHASE 7|7\.)[^\n]*\n([\s\S]*?)(?:(?:^|\n)[ \t]*(?:## |### |\*\*|__)*[ \t]*(?:PHASE 8|8\.)|$)/i);
    if (phase7Match) {
      article = phase7Match[1].trim();
    }
  }

  return { article, research };
};

export default function App() {
  const [view, setView] = useState<'landing' | 'app' | 'dashboard'>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [mode, setMode] = useState<'generate' | 'optimize'>('generate');
  const [keyword, setKeyword] = useState('');
  const [existingArticle, setExistingArticle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'article' | 'research'>('article');
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [scrapeStats, setScrapeStats] = useState<{ success: number; failed: number; total: number } | null>(null);
  const [userPlan, setUserPlan] = useState<'free' | 'starter' | 'pro'>('free');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

  const renderPhaseCards = () => {
    if (Object.keys(phaseOutputs).length === 0) {
      return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-zinc-400">No research data available for this article.</p>
        </div>
      );
    }
    
    return (
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
              className={`rounded-2xl border ${phase.border} bg-white/5 backdrop-blur-xl overflow-hidden shadow-2xl transition-all duration-300`}
            >
              <div 
                onClick={() => togglePhase(phaseId)}
                className={`px-6 py-4 border-b ${phase.border} bg-black/40 flex items-center justify-between cursor-pointer hover:bg-black/60 transition-colors`}
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
    );
  };

  if (view === 'landing') {
    return (
      <>
        <LandingPage onStart={() => user ? setView('app') : setShowAuthModal(true)} onShowAuth={() => setShowAuthModal(true)} user={user} />
        {showAuthModal && (
          <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>}>
            <AuthModal onClose={() => setShowAuthModal(false)} />
          </Suspense>
        )}
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
    setScrapeStats(null);
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
        }, includePhase0, (stats) => setScrapeStats(stats));
        
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
        
        const { article } = extractArticleAndResearch(finalContent, 'generate');
        setContent(finalContent);
        
        // Convert Markdown to HTML for the Rich Text Editor
        const html = await marked.parse(article);
        const cleanHtml = DOMPurify.sanitize(html);
        setEditableContent(cleanHtml);
        setActiveTab('article');
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
        
        const { article } = extractArticleAndResearch(finalContent, 'optimize');
        setContent(finalContent);
        
        // Convert Markdown to HTML for the Rich Text Editor
        const html = await marked.parse(article);
        const cleanHtml = DOMPurify.sanitize(html);
        setEditableContent(cleanHtml);
        setActiveTab('article');
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

  const handleCopy = () => {
    if (editableContent) {
      const turndownService = new TurndownService();
      const markdown = turndownService.turndown(editableContent);
      navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (content) {
      const { article } = extractArticleAndResearch(content, mode);
      navigator.clipboard.writeText(article);
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
    <div className="min-h-screen bg-[#080810] text-white font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none bg-dot">
        <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] bg-indigo-600/15 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[40%] h-[40%] bg-purple-600/12 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#080810]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-50 group-hover:opacity-90 transition duration-300"></div>
              <div className="relative bg-[#0e0e1a] p-2 rounded-xl border border-white/10">
                <Brain className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">RankForge AI</h1>
              <span className="text-[10px] font-semibold text-indigo-400 tracking-widest uppercase opacity-70">Semantic Content Engine</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAuthReady && (
              user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView(view === 'dashboard' ? 'app' : 'dashboard')}
                    className="text-xs font-semibold text-white transition-all px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                  >
                    {view === 'dashboard' ? <Brain className="w-3.5 h-3.5" /> : <LayoutDashboard className="w-3.5 h-3.5" />}
                    {view === 'dashboard' ? 'Back to App' : 'Dashboard'}
                  </button>
                  <button
                    onClick={logOut}
                    className="text-xs font-medium text-zinc-400 hover:text-white transition-colors p-2 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 flex items-center justify-center"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-xs font-semibold text-white transition-all px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 flex items-center gap-2"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {showAuthModal && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>}>
          <AuthModal onClose={() => setShowAuthModal(false)} />
        </Suspense>
      )}

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 z-10">
        
        {view === 'dashboard' ? (
          <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>}>
            <Dashboard onViewArticle={async (article) => {
              setKeyword(article.keyword);
              setMode(article.mode);
              setContent(article.content);
              setSeoScore(article.seoScore || null);
              setPhaseOutputs({});
              
              const { article: finalArticleText } = extractArticleAndResearch(article.content, article.mode);
              
              const html = await marked.parse(finalArticleText);
              const cleanHtml = DOMPurify.sanitize(html);
              setEditableContent(cleanHtml);
              setView('app');
            }} />
          </Suspense>
        ) : (
          <>
        {/* Mode Switcher */}
        {!content && !isGenerating && (
          <div className="flex justify-center mb-10">
            <div className="flex bg-[#0e0e1a] p-1.5 rounded-2xl border border-white/[0.07] shadow-xl">
              <button
                onClick={() => { setMode('generate'); setContent(null); setError(null); }}
                className={`flex items-center gap-2.5 px-7 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${mode === 'generate' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'}`}
              >
                <Brain className="w-4 h-4" /> Generate New Article
              </button>
              <button
                onClick={() => { 
                  if (userPlan === 'free') {
                    setShowUpgradeModal(true);
                  } else {
                    setMode('optimize'); setContent(null); setError(null); 
                  }
                }}
                className={`flex items-center gap-2.5 px-7 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${mode === 'optimize' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'}`}
              >
                <FileEdit className="w-4 h-4" /> Optimize Existing
                {userPlan === 'free' && <Lock className="w-3 h-3 ml-1 opacity-50" />}
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
                ? 'Execute a 7-phase architectural analysis to deeply analyze competitors and satisfy user intent.'
                : 'Audit, diagnose, and upgrade your underperforming articles for modern Google ranking systems.'}
            </p>

            <div className="relative group w-full">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/50 via-purple-500/30 to-pink-500/20 rounded-2xl opacity-60 group-hover:opacity-100 transition duration-500"></div>
              <form onSubmit={handleSubmit} className="relative bg-[#0e0e1a] rounded-2xl p-5 flex flex-col gap-4 shadow-2xl border border-white/[0.04]">
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
                      className={`block w-full pl-12 pr-4 py-4 bg-black/30 border border-white/[0.07] rounded-xl text-white placeholder:text-zinc-600 focus:ring-1 focus:border-transparent ${mode === 'generate' ? 'focus:ring-indigo-500' : 'focus:ring-emerald-500'} text-base font-medium transition-all`}
                      disabled={isGenerating}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isGenerating || !keyword.trim() || (mode === 'optimize' && !existingArticle.trim())}
                    className={`${mode === 'generate' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25' : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25'} text-white px-8 py-4 rounded-xl font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[155px] shadow-lg hover:scale-[1.02]`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        {mode === 'generate' ? 'Generate' : 'Optimize'}
                        {mode === 'generate' ? <Zap className="w-5 h-5" /> : <FileEdit className="w-5 h-5" />}
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
                      className="block w-full p-4 bg-black/30 border border-white/[0.07] rounded-xl text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-emerald-500 text-sm resize-y min-h-[200px] custom-scrollbar transition-all"
                      disabled={isGenerating}
                      required
                    />
                  </div>
                )}

                {/* Content Configuration Section */}
                <div className="pt-4 border-t border-white/[0.06]">
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
                      className={`block w-full p-3 bg-black/30 border border-white/[0.07] rounded-xl text-white placeholder:text-zinc-600 focus:ring-1 text-sm resize-y min-h-[100px] custom-scrollbar mb-4 transition-all ${mode === 'generate' ? 'focus:ring-indigo-500' : 'focus:ring-emerald-500'}`}
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
                      className={`block w-full p-3 bg-black/30 border border-white/[0.07] rounded-xl text-white placeholder:text-zinc-600 focus:ring-1 text-sm resize-y min-h-[80px] custom-scrollbar transition-all ${mode === 'generate' ? 'focus:ring-indigo-500' : 'focus:ring-emerald-500'}`}
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
                  <div key={i} className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 backdrop-blur-md ${isActive ? 'bg-indigo-500/10 border-indigo-500/50 scale-105 shadow-[0_0_30px_rgba(99,102,241,0.2)]' : isCompleted ? 'bg-white/5 border-emerald-500/20 opacity-60' : 'bg-black/20 border-white/5 opacity-40'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-indigo-400 animate-pulse shadow-[0_0_10px_rgba(129,140,248,0.8)]' : isCompleted ? 'bg-emerald-500' : 'bg-zinc-700'}`}></div>
                    <span className={`text-sm font-semibold tracking-wide ${isActive ? 'text-white' : 'text-zinc-400'}`}>Phase {phase.id}: {phase.title}</span>
                  </div>
                );
               })}
            </div>
          </div>
        )}

        {/* Phase Outputs Grid - Visible during generation */}
        {isGenerating && Object.keys(phaseOutputs).length > 0 && renderPhaseCards()}

        {/* Content Display */}
        {content && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-8"
          >
            <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl ring-1 ring-white/5 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent pointer-events-none"></div>
              <div className="border-b border-white/10 bg-black/40 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-16 md:top-20 z-20 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-full ring-1 ring-emerald-500/20">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white leading-none">Analysis Complete</h2>
                    <p className="text-xs text-zinc-500 mt-1 font-mono">Target: {keyword}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {scrapeStats && (
                    <div className="group relative">
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-help transition-all duration-300 ${
                        scrapeStats.failed === 0 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                          : scrapeStats.success > 0
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                            : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                      }`}>
                        <Target className="w-3.5 h-3.5" />
                        <span>{scrapeStats.success}/{scrapeStats.total} Analyzed</span>
                      </div>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full right-0 mb-2 w-56 p-3 rounded-xl bg-zinc-900 border border-white/10 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="text-xs space-y-2">
                          <div className="flex justify-between items-center text-zinc-300">
                            <span>Total URLs found:</span>
                            <span className="font-mono text-white">{scrapeStats.total}</span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-400">
                            <span>Successfully scraped:</span>
                            <span className="font-mono">{scrapeStats.success}</span>
                          </div>
                          <div className="flex justify-between items-center text-red-400">
                            <span>Blocked/Failed:</span>
                            <span className="font-mono">{scrapeStats.failed}</span>
                          </div>
                          {scrapeStats.failed > 0 && (
                            <div className="pt-2 mt-2 border-t border-white/10 text-zinc-500 leading-relaxed">
                              Some sites block automated access. We used internal knowledge to fill the gaps.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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
                    className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all duration-300 group ${saveSuccess ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'text-white bg-indigo-500 hover:bg-indigo-600 border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:-translate-y-0.5'} border`}
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
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-5 py-2.5 rounded-xl transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
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
              
              <div className="p-8 md:p-16 relative z-10">
                {seoScore !== null && (
                  <div className="mb-12 space-y-6">
                    <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                      <div className="flex-1 w-full relative z-10">
                        <h3 className="text-2xl font-bold text-white mb-3 flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                            <Target className="w-6 h-6 text-indigo-400" />
                          </div>
                          Advanced SEO Optimization Score
                        </h3>
                        <p className="text-zinc-400 text-sm max-w-xl mb-6 leading-relaxed">
                          This score reflects the article's alignment with search intent, semantic entity coverage, and E-E-A-T signals based on live SERP analysis.
                        </p>
                        
                        {seoScore.breakdown && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 border-t border-white/10 pt-6">
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Structure</div>
                              <div className="text-2xl font-black text-white">{seoScore.breakdown.structure}<span className="text-sm text-zinc-500 font-medium">/100</span></div>
                            </div>
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Keywords</div>
                              <div className="text-2xl font-black text-white">{seoScore.breakdown.keywords}<span className="text-sm text-zinc-500 font-medium">/100</span></div>
                            </div>
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Readability</div>
                              <div className="text-2xl font-black text-white">{seoScore.breakdown.readability}<span className="text-sm text-zinc-500 font-medium">/100</span></div>
                            </div>
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Intent Match</div>
                              <div className="text-2xl font-black text-white">{seoScore.breakdown.intent_match}<span className="text-sm text-zinc-500 font-medium">/100</span></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="relative w-40 h-40 flex-shrink-0 flex items-center justify-center relative z-10">
                        <div className={`absolute inset-0 rounded-full blur-[30px] opacity-20 ${
                          (seoScore.seo_score || seoScore) >= 80 ? 'bg-emerald-500' : (seoScore.seo_score || seoScore) >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}></div>
                        <svg className="w-full h-full transform -rotate-90 absolute inset-0 drop-shadow-2xl" viewBox="0 0 100 100">
                          <circle
                            className="text-black/50 stroke-current"
                            strokeWidth="8"
                            cx="50"
                            cy="50"
                            r="42"
                            fill="transparent"
                          ></circle>
                          <circle
                            className={`${
                              (seoScore.seo_score || seoScore) >= 80 ? 'text-emerald-400' : (seoScore.seo_score || seoScore) >= 60 ? 'text-amber-400' : 'text-rose-400'
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
                        <div className="relative z-10 flex items-center justify-center flex-col bg-black/40 w-24 h-24 rounded-full border border-white/10 backdrop-blur-sm">
                          <span className="text-4xl font-black text-white tracking-tighter">{seoScore.seo_score || seoScore}</span>
                          <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-0.5">Score</span>
                        </div>
                      </div>
                    </div>

                    {seoScore.breakdown && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl flex flex-col items-center justify-center min-h-[250px] shadow-xl">
                          <h4 className="text-sm font-bold text-zinc-300 mb-4 uppercase tracking-widest w-full text-left">Score Radar</h4>
                          <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>}>
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
                          </Suspense>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {seoScore.readability_level && (
                            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl hover:bg-white/10 transition-colors">
                              <div className="text-xs text-indigo-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Readability Level
                              </div>
                              <div className="text-2xl font-black text-white">{seoScore.readability_level}</div>
                            </div>
                          )}
                          
                          {seoScore.nlp_entities && seoScore.nlp_entities.length > 0 && (
                            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl hover:bg-white/10 transition-colors">
                              <div className="text-xs text-emerald-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
                                <Network className="w-4 h-4" /> NLP Entities Detected
                              </div>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {seoScore.nlp_entities.map((entity: string, idx: number) => (
                                  <span key={idx} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-lg border border-emerald-500/20">
                                    {entity}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {seoScore.eeat_signals && seoScore.eeat_signals.length > 0 && (
                            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl hover:bg-white/10 transition-colors">
                              <div className="text-xs text-blue-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" /> E-E-A-T Signals
                              </div>
                              <ul className="space-y-2 mt-3">
                                {seoScore.eeat_signals.map((signal: string, idx: number) => (
                                  <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2.5">
                                    <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" /> {signal}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {seoScore.content_gaps && seoScore.content_gaps.length > 0 && (
                            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl hover:bg-white/10 transition-colors">
                              <div className="text-xs text-rose-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
                                <ScanSearch className="w-4 h-4" /> Content Gaps
                              </div>
                              <ul className="space-y-2 mt-3">
                                {seoScore.content_gaps.map((gap: string, idx: number) => (
                                  <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2.5">
                                    <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" /> {gap}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {seoScore.improvements && seoScore.improvements.length > 0 && (
                      <div className="p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-xl">
                        <div className="text-sm text-amber-400 uppercase tracking-wider mb-5 font-bold flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" /> Suggested Improvements
                        </div>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {seoScore.improvements.map((imp: string, idx: number) => (
                            <li key={idx} className="text-sm text-zinc-300 flex items-start gap-3 bg-black/30 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                              <span className="text-amber-500/50 mt-0.5 flex-shrink-0">•</span> {imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-5">
                  <button 
                    onClick={() => setActiveTab('article')}
                    className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2.5 ${activeTab === 'article' ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5 hover:border-white/10 backdrop-blur-sm'}`}
                  >
                    <PenTool className="w-4 h-4" />
                    Final Article
                  </button>
                  <button 
                    onClick={() => {
                      if (userPlan === 'free') {
                        setShowUpgradeModal(true);
                      } else {
                        setActiveTab('research');
                      }
                    }}
                    className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2.5 ${activeTab === 'research' ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5 hover:border-white/10 backdrop-blur-sm'}`}
                  >
                    <BrainCircuit className="w-4 h-4" />
                    Research & Strategy
                    {userPlan === 'free' && <Lock className="w-3 h-3 ml-1 opacity-50" />}
                  </button>
                </div>

                {activeTab === 'article' ? (
                  <div className="bg-white text-black rounded-xl overflow-hidden shadow-sm border border-white/10">
                    <Suspense fallback={<div className="min-h-[500px] flex items-center justify-center bg-zinc-50"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>}>
                      <JoditEditor
                        value={editableContent}
                        config={{
                          readonly: false,
                          height: 500,
                          placeholder: 'Edit your article here...',
                          theme: 'default',
                          style: {
                            fontFamily: 'inherit',
                            fontSize: '16px'
                          }
                        }}
                        onBlur={(newContent) => setEditableContent(newContent)}
                        onChange={(newContent) => {}}
                      />
                    </Suspense>
                  </div>
                ) : (
                  <div className="w-full">
                    {renderPhaseCards()}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        </>
        )}
      </main>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111118] border border-white/10 rounded-2xl p-8 max-w-md w-full relative shadow-2xl"
          >
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6">
              <Lock className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Premium Feature</h3>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              This feature is only available on Starter and Pro plans. Upgrade your account to unlock advanced research data and content optimization tools.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Maybe Later
              </button>
              <button 
                onClick={() => {
                  setShowUpgradeModal(false);
                  setView('landing');
                  setTimeout(() => {
                    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all"
              >
                View Plans
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
