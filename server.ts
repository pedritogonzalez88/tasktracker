import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import path from "path";
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PORT = 3000;

// Initialize Firebase Admin gracefully
let db: FirebaseFirestore.Firestore | null = null;
try {
  if (getApps().length === 0) {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountEnv) {
      initializeApp({
        credential: cert(JSON.parse(serviceAccountEnv))
      });
    } else {
      initializeApp(); // Fallback to default application credentials if running in GCP
    }
  }
  db = getFirestore();
} catch (e) {
  console.warn("Firebase Admin could not be initialized:", e);
}

async function startServer() {
  const app = express();
  
  // STRIPE WEBHOOK MUST BE BOUND BEFORE express.json()
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const key = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || !key) {
      console.error('Stripe webhook secret or key is not configured.');
      res.status(400).send('Webhook configuration missing.');
      return;
    }

    const stripe = new Stripe(key);
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.client_reference_id;
      const tier = session.metadata?.tier; 

      if (uid && tier && db) {
        try {
          await db.collection('users').doc(uid).update({ tier: tier });
          console.log(`Successfully webhook upgraded user ${uid} to ${tier}`);
        } catch (dbErr) {
          console.error(`Failed to update user in Firestore:`, dbErr);
        }
      } else {
        console.warn(`Could not process webhook update. UID: ${uid}, Tier: ${tier}, DB Active: ${!!db}`);
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { tier, uid } = req.body;
      
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error('STRIPE_SECRET_KEY environment variable is required. Please set it in Settings -> Secrets.');
      }
      if (key.startsWith('pk_')) {
        throw new Error('You provided a Stripe Publishable Key (pk_test_...) instead of a Secret Key (sk_test_...). Please update the STRIPE_SECRET_KEY in Settings -> Secrets with your Secret Key.');
      }
      
      const stripe = new Stripe(key);

      // Determine price based on tier (assuming simulated prices or you'd use real price IDs)
      let amount = 0;
      let name = '';
      if (tier === 'plus') {
        amount = 900; // $9.00
        name = 'Plus Plan';
      } else if (tier === 'pro') {
        amount = 2900; // $29.00
        name = 'Pro Plan';
      } else {
        return res.status(400).json({ error: "Invalid tier specified" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: name,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL || ('http://localhost:' + PORT)}/profile?upgrade_success=true&tier=${tier}`,
        cancel_url: `${process.env.APP_URL || ('http://localhost:' + PORT)}/profile?canceled=true`,
        client_reference_id: uid, 
        metadata: {
          tier: tier
        }
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
