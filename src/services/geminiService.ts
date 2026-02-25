import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { MENU, LOYALTY_REDEMPTION_THRESHOLD } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const addToCartDeclaration: FunctionDeclaration = {
  name: "addToCart",
  parameters: {
    type: Type.OBJECT,
    description: "Add an item from the menu to the customer's cart.",
    properties: {
      itemName: {
        type: Type.STRING,
        description: "The exact name of the item from the menu.",
      },
      quantity: {
        type: Type.NUMBER,
        description: "The number of items to add. Defaults to 1.",
      },
    },
    required: ["itemName"],
  },
};

const removeFromCartDeclaration: FunctionDeclaration = {
  name: "removeFromCart",
  parameters: {
    type: Type.OBJECT,
    description: "Remove an item from the customer's cart.",
    properties: {
      itemName: {
        type: Type.STRING,
        description: "The name of the item to remove.",
      },
    },
    required: ["itemName"],
  },
};

const updateCartQuantityDeclaration: FunctionDeclaration = {
  name: "updateCartQuantity",
  parameters: {
    type: Type.OBJECT,
    description: "Update the quantity of an item already in the cart.",
    properties: {
      itemName: {
        type: Type.STRING,
        description: "The name of the item.",
      },
      quantity: {
        type: Type.NUMBER,
        description: "The new quantity.",
      },
    },
    required: ["itemName", "quantity"],
  },
};

const makeReservationDeclaration: FunctionDeclaration = {
  name: "makeReservation",
  parameters: {
    type: Type.OBJECT,
    description: "Book a table at the café.",
    properties: {
      name: {
        type: Type.STRING,
        description: "The name for the reservation.",
      },
      time: {
        type: Type.STRING,
        description: "The time of the reservation (e.g., '7 PM').",
      },
      guests: {
        type: Type.NUMBER,
        description: "The number of people.",
      },
    },
    required: ["name", "time", "guests"],
  },
};

const applyPromoCodeDeclaration: FunctionDeclaration = {
  name: "applyPromoCode",
  parameters: {
    type: Type.OBJECT,
    description: "Apply a discount promo code to the order.",
    properties: {
      code: {
        type: Type.STRING,
        description: "The promo code (e.g., 'STUDENT10').",
      },
    },
    required: ["code"],
  },
};

const redeemLoyaltyPointsDeclaration: FunctionDeclaration = {
  name: "redeemLoyaltyPoints",
  parameters: {
    type: Type.OBJECT,
    description: `Redeem loyalty points for a discount. Requires at least ${LOYALTY_REDEMPTION_THRESHOLD} points.`,
    properties: {},
  },
};

const placeOrderDeclaration: FunctionDeclaration = {
  name: "placeOrder",
  parameters: {
    type: Type.OBJECT,
    description: "Finalize and place the order.",
    properties: {},
  },
};

export const getGeminiResponse = async (messages: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are a smart, polite AI concierge for "Tales & Spirits", a Mumbai-based café.
    Prices are in ₹. GST is 5%.
    
    Timings:
    Mon–Fri: 9 AM – 10 PM
    Sat–Sun: 10 AM – 11 PM
    Happy Hours: 4–6 PM (10% off beverages - Coffee and Tea)
    
    Menu:
    ${MENU.map(item => `- ${item.name}: ₹${item.price} (${item.category})`).join('\n')}
    
    Rules:
    - Be friendly, helpful, and professional.
    - Use ₹ symbol for all prices.
    - Confirm before final order placement.
    - If a user asks for something not on the menu, politely inform them we don't have it.
    - Recommend items based on preferences (e.g., strong coffee -> Espresso/Cold Brew, sweet -> Brownie/Mocha).
    - Handle loyalty points: ₹100 = 10 points. 100 points = ₹50 discount.
    - Promo code: STUDENT10 gives 10% off subtotal.
    - Always show the bill summary when the user asks for the cart or to place an order.
    
    Current Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: messages,
    config: {
      systemInstruction,
      tools: [{
        functionDeclarations: [
          addToCartDeclaration,
          removeFromCartDeclaration,
          updateCartQuantityDeclaration,
          makeReservationDeclaration,
          applyPromoCodeDeclaration,
          redeemLoyaltyPointsDeclaration,
          placeOrderDeclaration
        ]
      }]
    }
  });

  return response;
};
