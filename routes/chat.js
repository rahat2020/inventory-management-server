const express = require("express");
const { streamText, tool, convertToModelMessages } = require("ai");
const { google } = require("@ai-sdk/google");
const { z } = require("zod");
const Products = require("../models/Products");

const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    // Convert UI messages (from useChat) to model messages for streamText
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: google("gemini-1.5-flash"),
      system: `You are an intelligent inventory management assistant for InventoryPro. 
You help users check product inventory, search for items, and update stock levels.

When a user asks about inventory, products, or stock — use the checkInventory tool to look up real data.
When a user wants to update stock quantities — use the updateStock tool with the exact SKU and new count.

Always be helpful, concise, and professional. Format your responses clearly.
When showing inventory data, present it in a clean, readable format.
If a tool returns results, summarize them nicely for the user.
If no products are found, suggest the user try different search terms.`,
      messages: modelMessages,
      maxSteps: 5,
      tools: {
        checkInventory: tool({
          description:
            "Search the inventory database for products by name or SKU. Use this when the user asks about stock, products, or inventory levels.",
          parameters: z.object({
            searchQuery: z
              .string()
              .describe(
                "The search term to look for — can be a product name, partial name, or SKU code"
              ),
          }),
          execute: async ({ searchQuery }) => {
            try {
              const regex = new RegExp(searchQuery, "i");
              const products = await Products.find({
                $or: [{ name: regex }, { sku: regex }],
              })
                .select(
                  "name sku quantity price cost unit status category warehouse supplier"
                )
                .limit(20)
                .lean();

              if (products.length === 0) {
                return {
                  found: false,
                  message: `No products found matching "${searchQuery}"`,
                  suggestions:
                    "Try a different search term or check the spelling",
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
                error: "Failed to search inventory: " + error.message,
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
              // Determine stock status based on quantity
              let status = "in-stock";
              if (newStockCount === 0) {
                status = "out-of-stock";
              } else if (newStockCount <= 10) {
                status = "low-stock";
              }

              const updatedProduct = await Products.findOneAndUpdate(
                { sku: sku },
                { quantity: newStockCount, status: status },
                { new: true }
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
                message: `Stock updated successfully!`,
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
                error: "Failed to update stock: " + error.message,
              };
            }
          },
        }),
      },
    });

    // Use the v7 API: pipe as UI message stream for useChat compatibility
    result.pipeUIMessageStreamToResponse(res);
  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
