import React from 'react';
import { Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PricingModalProps {
  onClose: () => void;
  onSelectPlan: (planId: string) => void;
}

export function PricingModal({ onClose, onSelectPlan }: PricingModalProps) {
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$15',
      credits: 20,
      description: 'Perfect for testing and small projects.',
      features: [
        '20 Premium Articles',
        'Claude 3.7 Sonnet for Writing',
        'SERP Scrape & E-E-A-T Audit',
        'Standard Support'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$29',
      credits: 50,
      description: 'For regular content creators.',
      popular: true,
      features: [
        '50 Premium Articles',
        'Claude 3.7 Sonnet for Writing',
        'SERP Scrape & E-E-A-T Audit',
        'Priority Support',
        'Optimization Mode'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-zinc-950 border border-white/10 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <button onClick={onClose} className="absolute right-6 top-6 text-zinc-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Upgrade Your Content Game</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Get premium, human-level SEO content powered by the most advanced AI models. No fluff, just content that ranks.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`relative rounded-3xl p-8 border ${plan.popular ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 bg-white/5'} flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                  Most Popular
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-zinc-400 text-sm mb-6">{plan.description}</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-zinc-500">/mo</span>
                </div>
                <div className="text-sm font-medium text-emerald-400 bg-emerald-400/10 inline-block px-3 py-1 rounded-full border border-emerald-400/20">
                  {plan.credits} Credits included
                </div>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                    <span className="text-sm text-zinc-300">{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => onSelectPlan(plan.id)}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  plan.popular 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-indigo-500/25' 
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/5'
                }`}
              >
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
