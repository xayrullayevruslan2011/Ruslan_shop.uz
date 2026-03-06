import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(process.cwd(), "data.json");

// Initial data structure
const getInitialData = () => ({
  products: [],
  users: [],
  orders: [],
  banners: [
    {
      id: "b1",
      title: "Xuddi Malikadek",
      subtitle: "Smartfon va boshqa texnikalar hamyonbop narxlarda",
      image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=400&q=80"
    }
  ]
});

// Load data from file
const loadData = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(getInitialData()));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) {
    return getInitialData();
  }
};

// Save data to file
const saveData = (data: any) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API: Get all data
  app.get("/api/data", (req, res) => {
    res.json(loadData());
  });

  // API: Update products (Admin only)
  app.post("/api/products", (req, res) => {
    const data = loadData();
    const newProduct = req.body;
    const existingIndex = data.products.findIndex((p: any) => p.id === newProduct.id);
    if (existingIndex > -1) {
      data.products[existingIndex] = newProduct;
    } else {
      data.products.push(newProduct);
    }
    saveData(data);
    res.json({ success: true });
  });

  // API: Delete product (Admin only)
  app.delete("/api/products/:id", (req, res) => {
    const data = loadData();
    const { id } = req.params;
    data.products = data.products.filter((p: any) => p.id !== id);
    saveData(data);
    res.json({ success: true });
  });

  // API: Update banners (Admin only)
  app.post("/api/banners", (req, res) => {
    const data = loadData();
    data.banners = req.body;
    saveData(data);
    res.json({ success: true });
  });

  // API: Register/Update user
  app.post("/api/users", (req, res) => {
    const data = loadData();
    const newUser = req.body;
    const existingIndex = data.users.findIndex((u: any) => u.phoneNumber === newUser.phoneNumber);
    if (existingIndex > -1) {
      data.users[existingIndex] = { ...data.users[existingIndex], ...newUser };
    } else {
      data.users.push(newUser);
    }
    saveData(data);
    res.json({ success: true, user: newUser });
  });

  // API: Create order
  app.post("/api/orders", (req, res) => {
    const data = loadData();
    const newOrder = { ...req.body, id: `ORD-${Date.now()}` };
    data.orders.push(newOrder);
    saveData(data);
    res.json({ success: true, order: newOrder });
  });

  // API: Update order (Status and Track Number)
  app.post("/api/orders/update", (req, res) => {
    const data = loadData();
    const { id, status, trackNumber } = req.body;
    const orderIndex = data.orders.findIndex((o: any) => o.id === id);
    if (orderIndex > -1) {
      data.orders[orderIndex] = { ...data.orders[orderIndex], status, trackNumber };
      saveData(data);
      res.json({ success: true, order: data.orders[orderIndex] });
    } else {
      res.status(404).json({ error: "Order not found" });
    }
  });

  // API: Delete order
  app.delete("/api/orders/:id", (req, res) => {
    const data = loadData();
    const { id } = req.params;
    data.orders = data.orders.filter((o: any) => o.id !== id);
    saveData(data);
    res.json({ success: true });
  });

  // API: Notify Admin via Telegram
  app.post("/api/notify", async (req, res) => {
    const { message, chatId } = req.body;
    const token = process.env.TELEGRAM_TOKEN || '8543158894:AAHkaN83tLCgNrJ-Omutn744aTui784GScc';
    const targetChatId = chatId || '8215056224';
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: targetChatId, text: message, parse_mode: 'Markdown' })
      });
      const data = await response.json();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
