/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  ShoppingCart, 
  Calendar, 
  Coffee, 
  Trash2, 
  Plus, 
  Minus, 
  User,
  Clock,
  MapPin,
  Star,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { MENU, GST_RATE, LOYALTY_RATE, LOYALTY_REDEMPTION_THRESHOLD, LOYALTY_REDEMPTION_VALUE, TIMINGS } from './constants';
import { MenuItem, CartItem, Reservation, ChatMessage, Bill } from './types';
import { getGeminiResponse } from './services/geminiService';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Namaste! Welcome to Tales & Spirits. I'm your personal concierge. How can I help you today? You can browse our menu, book a table, or place an order!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [redeemLoyalty, setRedeemLoyalty] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [userId] = useState('user_' + Math.random().toString(36).substr(2, 9)); // Mock user ID

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    fetchLoyalty();
  }, []);

  const fetchLoyalty = async () => {
    try {
      const res = await fetch(`/api/loyalty/${userId}`);
      const data = await res.json();
      setLoyaltyPoints(data.points);
    } catch (e) {
      console.error("Failed to fetch loyalty", e);
    }
  };

  const calculateBill = (): Bill => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // Happy Hour Check (4-6 PM)
    const now = new Date();
    const hour = now.getHours();
    const isHappyHour = hour >= 16 && hour < 18;
    
    let beverageDiscount = 0;
    if (isHappyHour) {
      beverageDiscount = cart
        .filter(item => item.category === 'Coffee' || item.category === 'Tea')
        .reduce((sum, item) => sum + (item.price * 0.1 * item.quantity), 0);
    }

    let promoDiscount = 0;
    if (promoCode === 'STUDENT10') {
      promoDiscount = subtotal * 0.1;
    }

    const totalDiscount = beverageDiscount + promoDiscount;
    const loyaltyDiscount = redeemLoyalty ? LOYALTY_REDEMPTION_VALUE : 0;
    
    const taxableAmount = Math.max(0, subtotal - totalDiscount - loyaltyDiscount);
    const gst = taxableAmount * GST_RATE;
    const total = taxableAmount + gst;
    const pointsEarned = Math.floor(total / 100) * LOYALTY_RATE;

    return {
      subtotal,
      gst,
      discount: totalDiscount,
      loyaltyDiscount,
      total,
      pointsEarned
    };
  };

  const handleAction = async (name: string, args: any) => {
    switch (name) {
      case 'addToCart': {
        const item = MENU.find(m => m.name.toLowerCase() === args.itemName.toLowerCase());
        if (item) {
          setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
              return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + (args.quantity || 1) } : i);
            }
            return [...prev, { ...item, quantity: args.quantity || 1 }];
          });
          return `Added ${args.quantity || 1} x ${item.name} to your cart.`;
        }
        return `Sorry, I couldn't find "${args.itemName}" on our menu.`;
      }
      case 'removeFromCart': {
        const item = cart.find(i => i.name.toLowerCase() === args.itemName.toLowerCase());
        if (item) {
          setCart(prev => prev.filter(i => i.id !== item.id));
          return `Removed ${item.name} from your cart.`;
        }
        return `"${args.itemName}" is not in your cart.`;
      }
      case 'updateCartQuantity': {
        const item = cart.find(i => i.name.toLowerCase() === args.itemName.toLowerCase());
        if (item) {
          if (args.quantity <= 0) {
            setCart(prev => prev.filter(i => i.id !== item.id));
            return `Removed ${item.name} from your cart.`;
          }
          setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: args.quantity } : i));
          return `Updated ${item.name} quantity to ${args.quantity}.`;
        }
        return `"${args.itemName}" is not in your cart.`;
      }
      case 'makeReservation': {
        try {
          await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args)
          });
          setReservation(args);
          return `Perfect! I've booked a table for ${args.guests} people under the name ${args.name} at ${args.time}. See you then!`;
        } catch (e) {
          return "I'm sorry, I couldn't process the reservation right now. Please try again.";
        }
      }
      case 'applyPromoCode': {
        if (args.code === 'STUDENT10') {
          setPromoCode('STUDENT10');
          return "Promo code STUDENT10 applied! You've got a 10% discount.";
        }
        return "Invalid promo code.";
      }
      case 'redeemLoyaltyPoints': {
        if (loyaltyPoints >= LOYALTY_REDEMPTION_THRESHOLD) {
          setRedeemLoyalty(true);
          return `Loyalty points redeemed! ₹${LOYALTY_REDEMPTION_VALUE} discount applied to your order.`;
        }
        return `You need at least ${LOYALTY_REDEMPTION_THRESHOLD} points to redeem. You currently have ${loyaltyPoints} points.`;
      }
      case 'placeOrder': {
        if (cart.length === 0) return "Your cart is empty!";
        const bill = calculateBill();
        try {
          // Update loyalty points
          let pointsToAdd = bill.pointsEarned;
          if (redeemLoyalty) {
            await fetch('/api/loyalty/redeem', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, pointsToRedeem: LOYALTY_REDEMPTION_THRESHOLD })
            });
          }
          await fetch('/api/loyalty/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, pointsToAdd })
          });
          
          setCart([]);
          setPromoCode(null);
          setRedeemLoyalty(false);
          fetchLoyalty();
          
          return `Order placed successfully! Total: ₹${bill.total.toFixed(2)}. You've earned ${bill.pointsEarned} loyalty points! Your order will be ready soon.`;
        } catch (e) {
          return "I'm sorry, I couldn't place your order. Please try again.";
        }
      }
      default:
        return "Action not recognized.";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMessage].map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const response = await getGeminiResponse(chatHistory);
      
      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const results = await Promise.all(functionCalls.map(call => handleAction(call.name, call.args)));
        
        // Send results back to Gemini for a final response
        const updatedHistory = [
          ...chatHistory,
          {
            role: 'model',
            parts: functionCalls.map((call, i) => ({
              functionCall: { name: call.name, args: call.args }
            }))
          },
          {
            role: 'user',
            parts: functionCalls.map((call, i) => ({
              functionResponse: { name: call.name, response: { result: results[i] } }
            }))
          }
        ];

        const finalResponse = await getGeminiResponse(updatedHistory as any);
        setMessages(prev => [...prev, { role: 'model', content: finalResponse.text || "I've updated your request." }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', content: response.text || "I'm not sure how to respond to that." }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: "I'm having a bit of trouble connecting. Could you try again?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const bill = calculateBill();

  return (
    <div className="min-h-screen flex flex-col md:flex-row p-4 md:p-8 gap-8 max-w-7xl mx-auto">
      {/* Left Column: Info & Cart */}
      <div className="w-full md:w-80 flex flex-col gap-6 order-2 md:order-1">
        {/* Café Info */}
        <div className="card p-6">
          <h1 className="serif text-3xl font-bold mb-4 text-[#5a5a40]">Tales & Spirits</h1>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Mon-Fri: {TIMINGS.weekday}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Sat-Sun: {TIMINGS.weekend}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>Juhu, Mumbai</span>
            </div>
            <div className="flex items-center gap-2 text-[#5a5a40] font-medium">
              <Star className="w-4 h-4 fill-current" />
              <span>Happy Hours: 4-6 PM</span>
            </div>
          </div>
        </div>

        {/* Loyalty Card */}
        <div className="card p-6 bg-[#5a5a40] text-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="serif text-xl font-semibold">Loyalty Points</h2>
            <User className="w-5 h-5 opacity-50" />
          </div>
          <div className="text-3xl font-bold mb-1">{loyaltyPoints}</div>
          <p className="text-xs opacity-80">
            {loyaltyPoints >= LOYALTY_REDEMPTION_THRESHOLD 
              ? "You have enough points for a ₹50 discount!" 
              : `${LOYALTY_REDEMPTION_THRESHOLD - loyaltyPoints} more points for a discount`}
          </p>
        </div>

        {/* Cart Summary */}
        <div className="card p-6 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-[#5a5a40]" />
            <h2 className="serif text-xl font-semibold">Your Order</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-64 md:max-h-none">
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Your cart is empty...</p>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">₹{item.price} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleAction('updateCartQuantity', { itemName: item.name, quantity: item.quantity - 1 })}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-medium">{item.quantity}</span>
                    <button 
                      onClick={() => handleAction('updateCartQuantity', { itemName: item.name, quantity: item.quantity + 1 })}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleAction('removeFromCart', { itemName: item.name })}
                      className="p-1 text-red-400 hover:bg-red-50 rounded ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>₹{bill.subtotal.toFixed(2)}</span>
              </div>
              {bill.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-₹{bill.discount.toFixed(2)}</span>
                </div>
              )}
              {bill.loyaltyDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Loyalty Discount</span>
                  <span>-₹{bill.loyaltyDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>GST (5%)</span>
                <span>₹{bill.gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>₹{bill.total.toFixed(2)}</span>
              </div>
              <div className="text-[10px] text-gray-400 text-center pt-2">
                You'll earn {bill.pointsEarned} points with this order
              </div>
            </div>
          )}
        </div>

        {/* Reservation Status */}
        {reservation && (
          <div className="card p-6 bg-white border-l-4 border-[#5a5a40]">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-[#5a5a40]" />
              <h3 className="font-semibold text-sm">Reservation Confirmed</h3>
            </div>
            <p className="text-xs text-gray-600">
              {reservation.name} • {reservation.guests} guests • {reservation.time}
            </p>
          </div>
        )}
      </div>

      {/* Right Column: Chat Interface */}
      <div className="flex-1 flex flex-col card overflow-hidden h-[600px] md:h-auto order-1 md:order-2">
        {/* Chat Header */}
        <div className="p-4 border-b bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f5f5f0] flex items-center justify-center">
              <Coffee className="text-[#5a5a40] w-6 h-6" />
            </div>
            <div>
              <h2 className="font-semibold">Concierge</h2>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Online</span>
              </div>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
            <Info className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fafafa]"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-4 shadow-sm ${
                  msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-model'
                }`}>
                  <div className="markdown-body">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="chat-bubble-model p-4 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white border-t">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about the menu, book a table..."
              className="w-full pl-4 pr-12 py-3 bg-[#f5f5f0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/20 text-sm"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 p-2 bg-[#5a5a40] text-white rounded-xl disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
            {['Menu', 'Book a table', 'Happy Hours', 'Loyalty Points'].map(suggestion => (
              <button
                key={suggestion}
                onClick={() => { setInput(suggestion); }}
                className="whitespace-nowrap px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[11px] text-gray-600 hover:border-[#5a5a40] hover:text-[#5a5a40] transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
