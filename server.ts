import express from 'express';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Stripe from 'stripe';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  // API Routes
  app.post('/api/create-checkout-session', async (req, res) => {
    try {
      const { planId, userId } = req.body;
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      
      if (!stripeKey) {
        return res.status(500).json({ error: 'STRIPE_SECRET_KEY is missing' });
      }

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const stripe = new Stripe(stripeKey);

      let priceInCents = 0;
      let productName = '';
      
      if (planId === 'starter') {
        priceInCents = 1500; // $15.00
        productName = 'Starter Plan (20 Credits)';
      } else if (planId === 'pro') {
        priceInCents = 2900; // $29.00
        productName = 'Pro Plan (50 Credits)';
      } else {
        return res.status(400).json({ error: 'Invalid plan selected' });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: productName,
              },
              unit_amount: priceInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        // In AI Studio, the frontend usually runs on the same domain
        // Use req.headers.origin or a relative path? Let's use the origin from headers.
        success_url: `${req.headers.origin}?payment=success&session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
        cancel_url: `${req.headers.origin}?payment=cancelled`,
        client_reference_id: userId,
        metadata: {
          planId,
          userId,
        }
      });

      res.json({ id: session.id, url: session.url });
    } catch (e) {
      console.error('[Stripe] Checkout Error:', e);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  app.post('/api/verify-checkout-session', async (req, res) => {
    try {
      const { sessionId } = req.body;
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      
      if (!stripeKey || !sessionId) {
        return res.status(400).json({ valid: false });
      }

      const stripe = new Stripe(stripeKey);
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
         res.json({ valid: true, planId: session.metadata?.planId, userId: session.metadata?.userId });
      } else {
         res.json({ valid: false });
      }
    } catch (e) {
      console.error('[Stripe] Verify Error:', e);
      res.status(500).json({ valid: false });
    }
  });

  app.post('/api/scrape-serp', async (req, res) => {
    const { keyword } = req.body;
    if (!keyword) {
      return res.status(400).json({ success: false, error: 'Keyword is required' });
    }

    const apiKey = process.env.SERPER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'Serper API key is missing. Please configure SERPER_API_KEY in the environment variables.' 
      });
    }

    try {
      console.log(`[Scraper] Searching Serper.dev API for: ${keyword}`);
      
      // 1. Fetch URLs from Serper.dev API
      const searchRes = await axios.post('https://google.serper.dev/search', {
        q: keyword,
        num: 7
      }, {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (!searchRes.data.organic || searchRes.data.organic.length === 0) {
         return res.json({ success: true, data: [], message: 'No results found on Google via Serper.' });
      }

      const urls = searchRes.data.organic.slice(0, 7).map((item: any) => item.link);
      console.log(`[Scraper] Found ${urls.length} URLs from Serper.`);

      // 2. Scrape the content of each URL
      const scrapedData = [];
      for (const url of urls) {
        try {
          console.log(`[Scraper] Fetching content from: ${url}`);
          const pageRes = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'cross-site',
              'Sec-Fetch-User': '?1',
              'Cache-Control': 'max-age=0',
              'Referer': 'https://www.google.com/'
            },
            timeout: 10000 // 10 seconds timeout
          });
          
          const $ = cheerio.load(pageRes.data);
          // Remove unnecessary elements
          $('script, style, nav, footer, header, aside, noscript, iframe').remove();
          
          const text = $('body').text().replace(/\s+/g, ' ').trim();
          // Limit to 2500 characters per page to avoid massive payloads
          const truncatedText = text.substring(0, 2500); 
          
          scrapedData.push({ 
            url, 
            content: truncatedText,
            status: 'Success'
          });
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.error(`[Scraper] Failed to scrape ${url}:`, errorMessage);
          scrapedData.push({
            url,
            content: `[Scraping Blocked or Failed: ${errorMessage}]`,
            status: 'Failed'
          });
        }
      }

      res.json({ success: true, data: scrapedData });
    } catch (error) {
      console.error('[Scraper] Google Search API failed:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ success: false, error: 'Failed to fetch search results from Google API.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
