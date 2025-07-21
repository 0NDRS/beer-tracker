
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono();

// Serve built Vue frontend from ./dist (must be bundled with Worker)
app.use('/*', serveStatic({ root: './dist', manifest: {} }))

app.use('/api/*', cors({ origin: '*' })) // Use '*' or your domain for production


// In-memory data
let users: Array<{ id: string; name: string; totalBeer: number }> = [];

// Barrel session state
let barrelSession: null | {
  name: string;
  buyer: string;
  price: number;
  volume: number;
  open: boolean;
  startTotals: Record<string, number>;
} = null;

// Store closed sessions for history
let barrelHistory: Array<{
  name: string;
  buyer: string;
  price: number;
  volume: number;
  consumed: Record<string, number>;
  userOwes: Record<string, number>;
  pricePerL: number;
  closedAt: number;
  open?: boolean;
}> = [];

// Start a new barrel session
app.post('/api/barrel/start', async (c) => {
  const { name, buyer, price, volume } = await c.req.json();
  if (!buyer || !price || !volume) return c.text('Missing data', 400);
  if (barrelSession && barrelSession.open) return c.text('Session already open', 400);

  const startTotals: Record<string, number> = {};
  users.forEach(u => { startTotals[u.id] = u.totalBeer; });
  barrelSession = { name, buyer, price, volume, open: true, startTotals };

  // Add to history as open (for frontend indication)
  barrelHistory.unshift({
    name,
    buyer,
    price,
    volume,
    consumed: {},
    userOwes: {},
    pricePerL: price / volume,
    closedAt: Date.now(),
    open: true
  });
  return c.json({ status: 'started', barrelSession });
});

// Close the current barrel session and calculate price
app.post('/api/barrel/close', (c) => {
  if (!barrelSession || !barrelSession.open) return c.text('No open session', 400);

  // Remove the open session from barrelHistory (should be at index 0)
  if (barrelHistory[0] && barrelHistory[0].open) {
    barrelHistory.shift();
  }

  // Calculate how much each user drank during the session
  const consumed: Record<string, number> = {};
  let totalDrank = 0;
  users.forEach(u => {
    const drank = u.totalBeer - (barrelSession!.startTotals[u.id] || 0);
    consumed[u.id] = drank > 0 ? drank : 0;
    totalDrank += consumed[u.id];
  });

  // If not all beer was consumed, price per liter is based on totalDrank
  let pricePerL: number;
  if (totalDrank < barrelSession.volume) {
    pricePerL = barrelSession.price / (totalDrank || 1);
  } else {
    pricePerL = barrelSession.price / barrelSession.volume;
  }

  // Calculate how much each user owes
  const userOwes: Record<string, number> = {};
  Object.entries(consumed).forEach(([id, drank]) => {
    userOwes[id] = drank * pricePerL;
  });

  // Save session to history
  const result = {
    name: barrelSession.name,
    buyer: barrelSession.buyer,
    price: barrelSession.price,
    volume: barrelSession.volume,
    consumed,
    userOwes,
    pricePerL,
    closedAt: Date.now(),
    open: false
  };
  barrelHistory.unshift(result);

  barrelSession = null;
  users.forEach(u => { u.totalBeer = 0; });

  return c.json(result);
});

// Get barrel session history
app.get('/api/barrel/history', (c) => {
  // If there is an open session, show it as the first entry in history
  let history = [...barrelHistory];
  if (barrelSession && barrelSession.open) {
    history = [
      {
        name: barrelSession.name,
        buyer: barrelSession.buyer,
        price: barrelSession.price,
        volume: barrelSession.volume,
        consumed: {},
        userOwes: {},
        pricePerL: barrelSession.price / barrelSession.volume,
        closedAt: Date.now(),
        open: true
      },
      ...history
    ];
  }
  return c.json(history);
});

// Get current barrel session (if any)
app.get('/api/barrel', (c) => {
  if (!barrelSession || !barrelSession.open) return c.json({ open: false });
  return c.json(barrelSession);
});

// Get leaderboard (sorted)
app.get('/api/leaderboard', (c) => {
  const sorted = [...users].sort((a, b) => b.totalBeer - a.totalBeer);
  return c.json(sorted);
});

// Get users (unsorted)
app.get('/api/users', (c) => c.json(users));

// Add user
app.post('/api/users', async (c) => {
  const { name } = await c.req.json();
  if (!name) return c.text('Missing name', 400);
  const id = Date.now().toString();
  const user = { id, name, totalBeer: 0 };
  users.push(user);
  return c.json(user);
});

// Delete user
app.delete('/api/users/:id', (c) => {
  const id = c.req.param('id');
  users = users.filter(u => u.id !== id);
  return c.text('Deleted');
});

// Add beer to user
app.post('/api/beer', async (c) => {
  const { userId, amount } = await c.req.json();
  const user = users.find(u => u.id === userId);
  if (!user) return c.text('User not found', 404);
  user.totalBeer += Number(amount);

  // --- Update active barrel session consumption in real time ---
  if (barrelSession && barrelSession.open) {
    // Calculate how much each user drank during the session
    const consumed: Record<string, number> = {};
    users.forEach(u => {
      const drank = u.totalBeer - (barrelSession!.startTotals[u.id] || 0);
      consumed[u.id] = drank > 0 ? drank : 0;
    });
    // Calculate price per liter
    const pricePerL = barrelSession.price / barrelSession.volume;
    // Calculate how much each user owes
    const userOwes: Record<string, number> = {};
    Object.entries(consumed).forEach(([id, drank]) => {
      userOwes[id] = drank * pricePerL;
    });
    // Update the open session in barrelHistory (should be at index 0)
    if (barrelHistory[0] && barrelHistory[0].open) {
      barrelHistory[0].consumed = consumed;
      barrelHistory[0].userOwes = userOwes;
    }
  }

  return c.json(user);
});

// Reset all data (for development/admin use)
app.post('/api/reset', (c) => {
  users = [];
  barrelSession = null;
  barrelHistory = [];
  return c.text('All data cleared');
});

export default app
