import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Search, Upload, ChevronRight, Sparkles, Bot } from 'lucide-react';

const manageOrdersVariants = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
};

const CHAT_MESSAGES = [
  { role: 'customer' as const, text: "Hi! I'm interested in the premium package. What does it include?" },
  { role: 'agent' as const, text: "Great choice! The premium package includes 24/7 AI support, priority handling, and custom automation rules. Would you like to know the pricing?" },
  { role: 'customer' as const, text: 'Yes, what\'s the monthly cost?' },
  { role: 'agent' as const, text: 'The premium package is $99/month. We also offer an annual plan at $899 (2 months free). Shall I walk you through the setup?' },
];

export function ManageOrdersSection() {
  const flowRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(flowRef, { once: true, amount: 0.4 });

  return (
    <section className="manage-orders">
      <div className="manage-orders-grid" aria-hidden />
      <Sparkles className="manage-orders-sparkle manage-orders-sparkle--left" aria-hidden />
      <Sparkles className="manage-orders-sparkle manage-orders-sparkle--right" aria-hidden />

      <div className="manage-orders-content">
        <h2 className="manage-orders-title">Manage Orders with AI Seamlessly.</h2>
        <p className="manage-orders-desc">
          Connect your store, add your products. Our AI agent handles customer inquiries, recommends products, and closes sales—24/7.
        </p>

        <div className="manage-orders-flow" ref={flowRef}>
          <motion.div
            className="manage-orders-card manage-orders-card--input"
            custom={0}
            variants={manageOrdersVariants}
            initial="initial"
            animate={isInView ? 'animate' : 'initial'}
          >
            <div className="manage-orders-search">
              <Search size={16} strokeWidth={2} aria-hidden />
              <input type="text" placeholder="Find Anything..." readOnly className="manage-orders-input" />
            </div>
            <div className="manage-orders-actions">
              <button type="button" className="manage-orders-btn manage-orders-btn--upload">
                <Upload size={16} strokeWidth={2} aria-hidden />
                Upload Your Products
              </button>
              <button type="button" className="manage-orders-btn manage-orders-btn--submit" aria-label="Submit">
                <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          </motion.div>

          <div className="manage-orders-connector">
            <div className="manage-orders-dots">
              <span className="manage-orders-dot" />
              <span className="manage-orders-dot" />
              <span className="manage-orders-dot" />
            </div>
            <div className="manage-orders-dashed" />
          </div>

          <div className="manage-orders-ai-icon" aria-hidden>
            <Bot size={20} strokeWidth={2} />
          </div>

          <div className="manage-orders-connector">
            <div className="manage-orders-dots">
              <span className="manage-orders-dot" />
              <span className="manage-orders-dot" />
              <span className="manage-orders-dot" />
            </div>
            <div className="manage-orders-dashed" />
          </div>

          <motion.div
            className="manage-orders-card manage-orders-card--output"
            custom={2}
            variants={manageOrdersVariants}
            initial="initial"
            animate={isInView ? 'animate' : 'initial'}
          >
            <div className="manage-orders-chat">
              {CHAT_MESSAGES.map((msg, i) => (
                <motion.div
                  key={i}
                  className={`manage-orders-msg manage-orders-msg--${msg.role}`}
                  custom={3 + i}
                  variants={manageOrdersVariants}
                  initial="initial"
                  animate={isInView ? 'animate' : 'initial'}
                >
                  <span className="manage-orders-msg-text">{msg.text}</span>
                </motion.div>
              ))}
            </div>
            <motion.div
              className="manage-orders-complete"
              custom={3 + CHAT_MESSAGES.length}
              variants={manageOrdersVariants}
              initial="initial"
              animate={isInView ? 'animate' : 'initial'}
            >
              <span className="manage-orders-complete-check">✓</span>
              Conversation in Progress
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
