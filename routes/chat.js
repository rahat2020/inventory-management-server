const express = require("express");
const { z } = require("zod");
const Products = require("../models/Products");
const Category = require("../models/Category");
const User = require("../models/User");
const Orders = require("../models/Orders");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");
const StockMovement = require("../models/StockMovement");

const router = express.Router();

const DEFAULT_MODEL = "gemini-2.5-flash";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getStockStatus = (quantity) => {
  if (quantity === 0) return "out-of-stock";
  if (quantity <= 10) return "low-stock";
  return "in-stock";
};

const normalizeEnvValue = (value = "") =>
  value
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();

const getErrorMessage = (error) => {
  if (!error) {
    return "The AI request failed. Please try again.";
  }

  const rawMessage =
    typeof error === "string"
      ? error
      : error.message || error.errorText || JSON.stringify(error);
  const message = String(rawMessage || "");

  console.error("Chat stream error:", error);

  if (
    /api key|apikey|credential|unauth|permission|forbidden|401|403/i.test(
      message,
    )
  ) {
    return "Gemini authentication failed. Check GOOGLE_GENERATIVE_AI_API_KEY in server/.env, then restart the server.";
  }

  if (/quota|rate limit|too many requests|429/i.test(message)) {
    return "Gemini quota or rate limit was reached. Please wait and try again.";
  }

  if (/model|not found|404|unsupported/i.test(message)) {
    return "The configured Gemini model is unavailable. Check GEMINI_MODEL in server/.env or use gemini-2.5-flash.";
  }

  if (/fetch failed|network|ENOTFOUND|ECONNRESET|ETIMEDOUT/i.test(message)) {
    return "The server could not reach the Gemini API. Check your internet connection and try again.";
  }

  if (/mongo|mongoose|database/i.test(message)) {
    return "The inventory database request failed. Please check the server database connection.";
  }

  if (process.env.NODE_ENV === "development" && message) {
    return message;
  }

  return "The AI request failed. Please try again.";
};

const demoCategories = [
  {
    title: "Electronics",
    photo: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800",
    description: "Electronic devices, accessories, and office technology.",
  },
  {
    title: "Office Supplies",
    photo: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800",
    description: "Daily office essentials and workspace supplies.",
  },
  {
    title: "Warehouse Equipment",
    photo: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
    description: "Tools and equipment used in warehouse operations.",
  },
  {
    title: "Safety Gear",
    photo: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800",
    description: "Protective equipment for staff and storage areas.",
  },
];

const demoProducts = [
  [
    "Wireless Barcode Scanner",
    "Electronics",
    18,
    89.99,
    52.0,
    "piece",
    "NovaTech Supplies",
  ],
  [
    "Thermal Label Printer",
    "Electronics",
    7,
    149.99,
    96.5,
    "piece",
    "PrintLine Depot",
  ],
  [
    "USB-C Docking Station",
    "Electronics",
    24,
    119.0,
    71.25,
    "piece",
    "NovaTech Supplies",
  ],
  [
    "Inventory Tablet 10-inch",
    "Electronics",
    12,
    229.99,
    158.0,
    "piece",
    "Metro Device Co",
  ],
  ["RFID Tag Bundle", "Electronics", 250, 0.45, 0.18, "piece", "TagWorks"],
  ["Copy Paper Ream", "Office Supplies", 85, 6.99, 3.9, "piece", "OfficeMart"],
  [
    "Permanent Marker Pack",
    "Office Supplies",
    34,
    11.49,
    6.2,
    "box",
    "OfficeMart",
  ],
  [
    "Packing Tape Roll",
    "Office Supplies",
    96,
    3.75,
    1.65,
    "piece",
    "PackRight",
  ],
  [
    "Shipping Label Sheet",
    "Office Supplies",
    140,
    8.25,
    4.1,
    "box",
    "PackRight",
  ],
  [
    "Desk Organizer Tray",
    "Office Supplies",
    5,
    14.99,
    7.25,
    "piece",
    "OfficeMart",
  ],
  [
    "Heavy Duty Pallet Jack",
    "Warehouse Equipment",
    3,
    499.99,
    315.0,
    "piece",
    "LiftPro Industrial",
  ],
  [
    "Steel Storage Rack",
    "Warehouse Equipment",
    9,
    189.0,
    122.0,
    "piece",
    "RackHouse",
  ],
  [
    "Hand Truck Dolly",
    "Warehouse Equipment",
    14,
    78.5,
    43.0,
    "piece",
    "LiftPro Industrial",
  ],
  [
    "Plastic Storage Bin",
    "Warehouse Equipment",
    64,
    12.0,
    5.5,
    "piece",
    "RackHouse",
  ],
  [
    "Inventory Counting Scale",
    "Warehouse Equipment",
    0,
    159.99,
    101.0,
    "piece",
    "ScalePoint",
  ],
  ["Safety Vest", "Safety Gear", 45, 9.99, 4.4, "piece", "SafeWorks"],
  ["Nitrile Gloves Box", "Safety Gear", 60, 13.5, 7.2, "box", "SafeWorks"],
  ["Protective Hard Hat", "Safety Gear", 11, 21.0, 12.8, "piece", "SafeWorks"],
  ["First Aid Kit", "Safety Gear", 6, 34.99, 19.0, "piece", "MedStock"],
  ["Fire Extinguisher", "Safety Gear", 8, 58.99, 36.0, "piece", "MedStock"],
];

const buildDemoProducts = (createdBy) =>
  demoProducts.map(
    ([name, category, quantity, price, cost, unit, supplier], index) => ({
      name,
      sku: `DEMO-INV-${String(index + 1).padStart(3, "0")}`,
      description: `${name} seeded for demo inventory workflows and AI chat testing.`,
      category,
      quantity,
      price,
      cost,
      unit,
      image: [],
      supplier: {
        name: supplier,
        contact: `orders+${supplier.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@example.com`,
      },
      status: getStockStatus(quantity),
      warehouse: index % 2 === 0 ? "Main Warehouse" : "Overflow Warehouse",
      expiryDate: new Date(
        Date.now() + (90 + index * 12) * 24 * 60 * 60 * 1000,
      ),
      createdBy,
    }),
  );

router.post("/chat", async (req, res) => {
  try {
    const { streamText, tool, convertToModelMessages, isStepCount } =
      await import("ai");
    const { createGoogle } = await import("@ai-sdk/google");

    const apiKey = normalizeEnvValue(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    if (!apiKey) {
      return res.status(500).json({
        error:
          "Missing GOOGLE_GENERATIVE_AI_API_KEY in server/.env. Add your Google AI Studio API key and restart the server.",
      });
    }

    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res
        .status(400)
        .json({ error: "Invalid chat payload: messages must be an array." });
    }

    const google = createGoogle({ apiKey });
    const model = normalizeEnvValue(process.env.GEMINI_MODEL) || DEFAULT_MODEL;
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: google(model),
      system: `You are an intelligent inventory management assistant for InventoryPro.
You help users check product inventory, search for items, update stock levels, check orders, customers, suppliers, stock movements, and generate reports.

Available capabilities:
- checkInventory: Search products by name or SKU, see stock status
- updateStock: Update product stock quantities
- checkOrders: View all orders, pending orders, and order statistics
- checkStockLevels: Get complete stock level summary and categorized items
- checkIncoming: View incoming stock movements
- checkOutgoing: View outgoing stock movements
- checkSuppliers: View all suppliers and supplier statistics
- checkCustomers: View all customers and customer statistics
- generateReport: Create inventory reports with key metrics
- seedDemoInventory: Populate demo data for testing

Use these tools to provide real-time inventory data. When a user asks about any of these topics, use the appropriate tool.
Format all responses clearly and professionally. Show data in an organized manner.
If the user wants reports, use generateReport to compile comprehensive insights.
Always be helpful and suggest relevant data when appropriate.`,
      messages: modelMessages,
      stopWhen: isStepCount(5),
      onError: ({ error }) => {
        getErrorMessage(error);
      },
      tools: {
        checkInventory: tool({
          description:
            "Search the inventory database for products by name or SKU. Use this for stock, products, and inventory questions. If the user asks to show all products, use an empty searchQuery.",
          parameters: z.object({
            searchQuery: z
              .string()
              .optional()
              .describe(
                "The search term to look for. Use an empty string to return all products.",
              ),
          }),
          execute: async ({ searchQuery }) => {
            try {
              const query = (searchQuery || "").trim();
              const showAll =
                !query ||
                ["all", "inventory", "products"].includes(query.toLowerCase());
              const findQuery = showAll
                ? {}
                : {
                    $or: [
                      { name: new RegExp(escapeRegex(query), "i") },
                      { sku: new RegExp(escapeRegex(query), "i") },
                    ],
                  };

              const products = await Products.find(findQuery)
                .select(
                  "name sku quantity price cost unit status category warehouse supplier",
                )
                .limit(20)
                .lean();

              if (products.length === 0) {
                return {
                  found: false,
                  message: query
                    ? `No products found matching "${query}"`
                    : "No products found in inventory",
                  suggestions:
                    "Try a different search term, add products, or seed demo inventory data.",
                };
              }

              return {
                found: true,
                count: products.length,
                products: products.map((p) => ({
                  name: p.name,
                  sku: p.sku,
                  quantity: p.quantity,
                  price: p.price,
                  cost: p.cost,
                  unit: p.unit,
                  status: p.status,
                  category: p.category,
                  warehouse: p.warehouse || "N/A",
                  supplier: p.supplier?.name || "N/A",
                })),
              };
            } catch (error) {
              return {
                found: false,
                message: "Failed to search inventory.",
                error: error.message,
              };
            }
          },
        }),

        updateStock: tool({
          description:
            "Update the stock quantity of a specific product by its SKU. Use this when the user wants to change or set a new stock count for a product.",
          parameters: z.object({
            sku: z
              .string()
              .describe("The exact SKU code of the product to update"),
            newStockCount: z
              .number()
              .int()
              .nonnegative()
              .describe("The new stock quantity to set (must be 0 or greater)"),
          }),
          execute: async ({ sku, newStockCount }) => {
            try {
              const status = getStockStatus(newStockCount);

              const updatedProduct = await Products.findOneAndUpdate(
                { sku: sku },
                { quantity: newStockCount, status: status },
                { new: true },
              )
                .select("name sku quantity status category")
                .lean();

              if (!updatedProduct) {
                return {
                  success: false,
                  message: `No product found with SKU "${sku}". Please verify the SKU and try again.`,
                };
              }

              return {
                success: true,
                message: "Stock updated successfully!",
                product: {
                  name: updatedProduct.name,
                  sku: updatedProduct.sku,
                  newQuantity: updatedProduct.quantity,
                  status: updatedProduct.status,
                  category: updatedProduct.category,
                },
              };
            } catch (error) {
              return {
                success: false,
                message: "Failed to update stock.",
                error: error.message,
              };
            }
          },
        }),

        seedDemoInventory: tool({
          description:
            "Seed the inventory database with 20 realistic demo products plus required category and user data. Use this when the user asks for dummy, sample, seed, demo, or test inventory data.",
          parameters: z.object({}),
          execute: async () => {
            try {
              await Promise.all(
                demoCategories.map((category) =>
                  Category.updateOne(
                    { title: category.title },
                    { $setOnInsert: category },
                    { upsert: true },
                  ),
                ),
              );

              const seedUser = await User.findOneAndUpdate(
                { email: "inventory.seed@inventorypro.local" },
                {
                  $setOnInsert: {
                    username: "Inventory Seed User",
                    email: "inventory.seed@inventorypro.local",
                    password: "seeded-demo-user",
                    role: "admin",
                    isAdmin: true,
                    terms: true,
                  },
                },
                { new: true, upsert: true, setDefaultsOnInsert: true },
              );

              const products = buildDemoProducts(seedUser._id);
              const bulkResult = await Products.bulkWrite(
                products.map((product) => ({
                  updateOne: {
                    filter: { sku: product.sku },
                    update: { $set: product },
                    upsert: true,
                  },
                })),
              );

              const created = bulkResult.upsertedCount || 0;
              const updated = bulkResult.modifiedCount || 0;
              const matched = bulkResult.matchedCount || 0;

              return {
                success: true,
                message: "Demo inventory seeded successfully.",
                productsSeeded: products.length,
                productsCreated: created,
                productsUpdated: updated,
                productsMatched: matched,
                categoriesSeeded: demoCategories.length,
                seedUserEmail: seedUser.email,
              };
            } catch (error) {
              return {
                success: false,
                message: "Failed to seed demo inventory data.",
                error: error.message,
              };
            }
          },
        }),

        checkOrders: tool({
          description:
            "Retrieve order information. Use this when the user asks about orders, pending orders, or order statistics.",
          parameters: z.object({
            query: z
              .string()
              .optional()
              .describe(
                "Type of query: 'all' for all orders, 'stats' for order statistics, 'pending' for pending orders",
              ),
          }),
          execute: async ({ query = "stats" }) => {
            try {
              if (query === "stats") {
                const totalOrders = await Orders.countDocuments();
                const pendingOrders = await Orders.countDocuments({
                  status: "pending",
                });
                const confirmedOrders = await Orders.countDocuments({
                  status: "confirmed",
                });
                const shippedOrders = await Orders.countDocuments({
                  status: "shipped",
                });
                const deliveredOrders = await Orders.countDocuments({
                  status: "delivered",
                });

                const stats = await Orders.aggregate([
                  {
                    $group: {
                      _id: null,
                      totalAmount: { $sum: "$totalAmount" },
                      averageOrderValue: { $avg: "$totalAmount" },
                    },
                  },
                ]);

                return {
                  success: true,
                  type: "statistics",
                  data: {
                    totalOrders,
                    pendingOrders,
                    confirmedOrders,
                    shippedOrders,
                    deliveredOrders,
                    totalAmount: stats[0]?.totalAmount || 0,
                    averageOrderValue: stats[0]?.averageOrderValue || 0,
                  },
                };
              } else if (query === "pending") {
                const pendingOrders = await Orders.find({ status: "pending" })
                  .select(
                    "orderNumber customerName totalAmount status createdAt",
                  )
                  .sort({ createdAt: -1 })
                  .limit(20)
                  .lean();

                return {
                  success: true,
                  type: "pending_orders",
                  count: pendingOrders.length,
                  orders: pendingOrders,
                };
              } else {
                const orders = await Orders.find()
                  .select(
                    "orderNumber customerName totalAmount status paymentStatus createdAt",
                  )
                  .sort({ createdAt: -1 })
                  .limit(50)
                  .lean();

                return {
                  success: true,
                  type: "all_orders",
                  count: orders.length,
                  orders: orders,
                };
              }
            } catch (error) {
              return {
                success: false,
                message: "Failed to retrieve order data.",
                error: error.message,
              };
            }
          },
        }),

        checkStockLevels: tool({
          description:
            "Get complete stock level summary with categorized items (in-stock, low-stock, out-of-stock). Use this for stock level queries.",
          parameters: z.object({}),
          execute: async () => {
            try {
              const allProducts = await Products.find()
                .select("name sku quantity status warehouse category price")
                .lean();

              const inStockItems = allProducts.filter(
                (p) => p.status === "in-stock",
              );
              const lowStockItems = allProducts.filter(
                (p) => p.status === "low-stock",
              );
              const outOfStockItems = allProducts.filter(
                (p) => p.status === "out-of-stock",
              );

              const totalQuantity = allProducts.reduce(
                (sum, p) => sum + p.quantity,
                0,
              );
              const totalValue = allProducts.reduce(
                (sum, p) => sum + p.quantity * (p.price || 0),
                0,
              );

              return {
                success: true,
                summary: {
                  totalProducts: allProducts.length,
                  inStockCount: inStockItems.length,
                  lowStockCount: lowStockItems.length,
                  outOfStockCount: outOfStockItems.length,
                  totalQuantity,
                  totalValue: totalValue.toFixed(2),
                },
                inStockItems: inStockItems.slice(0, 10),
                lowStockItems,
                outOfStockItems,
              };
            } catch (error) {
              return {
                success: false,
                message: "Failed to retrieve stock levels.",
                error: error.message,
              };
            }
          },
        }),

        checkIncoming: tool({
          description:
            "View incoming stock movements and quantities. Use this when the user asks about incoming stock or purchases.",
          parameters: z.object({
            limit: z
              .number()
              .optional()
              .describe("Maximum number of records to return (default: 20)"),
          }),
          execute: async ({ limit = 20 }) => {
            try {
              const incoming = await StockMovement.find({
                movementType: "incoming",
              })
                .select("productName sku quantity reference createdAt")
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();

              const totalQuantity = await StockMovement.aggregate([
                { $match: { movementType: "incoming" } },
                { $group: { _id: null, total: { $sum: "$quantity" } } },
              ]);

              return {
                success: true,
                type: "incoming_stock",
                count: incoming.length,
                totalQuantity: totalQuantity[0]?.total || 0,
                movements: incoming,
              };
            } catch (error) {
              return {
                success: false,
                message: "Failed to retrieve incoming stock data.",
                error: error.message,
              };
            }
          },
        }),

        checkOutgoing: tool({
          description:
            "View outgoing stock movements and quantities. Use this when the user asks about outgoing stock or sales.",
          parameters: z.object({
            limit: z
              .number()
              .optional()
              .describe("Maximum number of records to return (default: 20)"),
          }),
          execute: async ({ limit = 20 }) => {
            try {
              const outgoing = await StockMovement.find({
                movementType: "outgoing",
              })
                .select("productName sku quantity reference createdAt")
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();

              const totalQuantity = await StockMovement.aggregate([
                { $match: { movementType: "outgoing" } },
                { $group: { _id: null, total: { $sum: "$quantity" } } },
              ]);

              return {
                success: true,
                type: "outgoing_stock",
                count: outgoing.length,
                totalQuantity: totalQuantity[0]?.total || 0,
                movements: outgoing,
              };
            } catch (error) {
              return {
                success: false,
                message: "Failed to retrieve outgoing stock data.",
                error: error.message,
              };
            }
          },
        }),

        checkSuppliers: tool({
          description:
            "Get information about suppliers. Use this when the user asks about suppliers or supplier statistics.",
          parameters: z.object({
            query: z
              .string()
              .optional()
              .describe(
                "Type of query: 'all' for all suppliers, 'stats' for supplier statistics",
              ),
          }),
          execute: async ({ query = "stats" }) => {
            try {
              if (query === "stats") {
                const totalSuppliers = await Supplier.countDocuments({
                  status: "active",
                });
                const inactiveSuppliers = await Supplier.countDocuments({
                  status: "inactive",
                });

                const stats = await Supplier.aggregate([
                  { $match: { status: "active" } },
                  {
                    $group: {
                      _id: null,
                      totalPurchased: { $sum: "$totalPurchased" },
                      averagePurchased: { $avg: "$totalPurchased" },
                      averageRating: { $avg: "$rating" },
                    },
                  },
                ]);

                return {
                  success: true,
                  type: "supplier_statistics",
                  data: {
                    totalActiveSuppliers: totalSuppliers,
                    inactiveSuppliers,
                    totalPurchased: stats[0]?.totalPurchased || 0,
                    averagePurchased: stats[0]?.averagePurchased || 0,
                    averageRating: (stats[0]?.averageRating || 0).toFixed(2),
                  },
                };
              } else {
                const suppliers = await Supplier.find({ status: "active" })
                  .select("name email phone rating totalOrders totalPurchased")
                  .sort({ totalPurchased: -1 })
                  .limit(30)
                  .lean();

                return {
                  success: true,
                  type: "all_suppliers",
                  count: suppliers.length,
                  suppliers: suppliers,
                };
              }
            } catch (error) {
              return {
                success: false,
                message: "Failed to retrieve supplier data.",
                error: error.message,
              };
            }
          },
        }),

        checkCustomers: tool({
          description:
            "Get information about customers. Use this when the user asks about customers or customer statistics.",
          parameters: z.object({
            query: z
              .string()
              .optional()
              .describe(
                "Type of query: 'all' for all customers, 'stats' for customer statistics, 'top' for top customers",
              ),
          }),
          execute: async ({ query = "stats" }) => {
            try {
              if (query === "stats") {
                const totalCustomers = await Customer.countDocuments({
                  status: "active",
                });
                const inactiveCustomers = await Customer.countDocuments({
                  status: "inactive",
                });

                const stats = await Customer.aggregate([
                  { $match: { status: "active" } },
                  {
                    $group: {
                      _id: null,
                      totalRevenue: { $sum: "$totalSpent" },
                      averageSpent: { $avg: "$totalSpent" },
                      averageOrders: { $avg: "$totalOrders" },
                    },
                  },
                ]);

                return {
                  success: true,
                  type: "customer_statistics",
                  data: {
                    totalActiveCustomers: totalCustomers,
                    inactiveCustomers,
                    totalRevenue: stats[0]?.totalRevenue || 0,
                    averageSpent: (stats[0]?.averageSpent || 0).toFixed(2),
                    averageOrders: (stats[0]?.averageOrders || 0).toFixed(2),
                  },
                };
              } else if (query === "top") {
                const topCustomers = await Customer.find({ status: "active" })
                  .select("name email totalOrders totalSpent")
                  .sort({ totalSpent: -1 })
                  .limit(10)
                  .lean();

                return {
                  success: true,
                  type: "top_customers",
                  count: topCustomers.length,
                  customers: topCustomers,
                };
              } else {
                const customers = await Customer.find({ status: "active" })
                  .select("name email phone totalOrders totalSpent")
                  .sort({ createdAt: -1 })
                  .limit(30)
                  .lean();

                return {
                  success: true,
                  type: "all_customers",
                  count: customers.length,
                  customers: customers,
                };
              }
            } catch (error) {
              return {
                success: false,
                message: "Failed to retrieve customer data.",
                error: error.message,
              };
            }
          },
        }),

        generateReport: tool({
          description:
            "Generate comprehensive inventory reports with key metrics, summaries, and insights. Use this when the user asks for reports.",
          parameters: z.object({
            reportType: z
              .string()
              .optional()
              .describe(
                "Type of report: 'inventory', 'orders', 'suppliers', 'customers', or 'all' for comprehensive report",
              ),
          }),
          execute: async ({ reportType = "all" }) => {
            try {
              const report = {};

              // Inventory Report
              if (reportType === "inventory" || reportType === "all") {
                const allProducts = await Products.find().lean();
                const inStock = allProducts.filter(
                  (p) => p.status === "in-stock",
                ).length;
                const lowStock = allProducts.filter(
                  (p) => p.status === "low-stock",
                ).length;
                const outOfStock = allProducts.filter(
                  (p) => p.status === "out-of-stock",
                ).length;
                const totalValue = allProducts.reduce(
                  (sum, p) => sum + p.quantity * (p.price || 0),
                  0,
                );

                report.inventory = {
                  totalProducts: allProducts.length,
                  inStock,
                  lowStock,
                  outOfStock,
                  totalValue: totalValue.toFixed(2),
                  categories: [...new Set(allProducts.map((p) => p.category))]
                    .length,
                };
              }

              // Orders Report
              if (reportType === "orders" || reportType === "all") {
                const totalOrders = await Orders.countDocuments();
                const pendingOrders = await Orders.countDocuments({
                  status: "pending",
                });
                const orderStats = await Orders.aggregate([
                  {
                    $group: {
                      _id: null,
                      totalAmount: { $sum: "$totalAmount" },
                      averageOrderValue: { $avg: "$totalAmount" },
                    },
                  },
                ]);

                report.orders = {
                  totalOrders,
                  pendingOrders,
                  completedOrders: totalOrders - pendingOrders,
                  totalAmount: orderStats[0]?.totalAmount || 0,
                  averageOrderValue: (
                    orderStats[0]?.averageOrderValue || 0
                  ).toFixed(2),
                };
              }

              // Suppliers Report
              if (reportType === "suppliers" || reportType === "all") {
                const totalSuppliers = await Supplier.countDocuments({
                  status: "active",
                });
                const supplierStats = await Supplier.aggregate([
                  { $match: { status: "active" } },
                  {
                    $group: {
                      _id: null,
                      totalPurchased: { $sum: "$totalPurchased" },
                      averageRating: { $avg: "$rating" },
                    },
                  },
                ]);

                report.suppliers = {
                  totalActiveSuppliers: totalSuppliers,
                  totalPurchased: supplierStats[0]?.totalPurchased || 0,
                  averageRating: (supplierStats[0]?.averageRating || 0).toFixed(
                    2,
                  ),
                };
              }

              // Customers Report
              if (reportType === "customers" || reportType === "all") {
                const totalCustomers = await Customer.countDocuments({
                  status: "active",
                });
                const customerStats = await Customer.aggregate([
                  { $match: { status: "active" } },
                  {
                    $group: {
                      _id: null,
                      totalRevenue: { $sum: "$totalSpent" },
                      averageSpent: { $avg: "$totalSpent" },
                    },
                  },
                ]);

                report.customers = {
                  totalActiveCustomers: totalCustomers,
                  totalRevenue: customerStats[0]?.totalRevenue || 0,
                  averageSpent: (customerStats[0]?.averageSpent || 0).toFixed(
                    2,
                  ),
                };
              }

              return {
                success: true,
                reportType,
                report,
                generatedAt: new Date().toISOString(),
              };
            } catch (error) {
              return {
                success: false,
                message: "Failed to generate report.",
                error: error.message,
              };
            }
          },
        }),
      },
    });

    result.pipeUIMessageStreamToResponse(res, {
      onError: getErrorMessage,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

module.exports = router;
