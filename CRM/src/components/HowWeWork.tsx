import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { MessageBubble } from './MessageBubble';

const stepVariants = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.4 },
  }),
};

const cardStepVariants = {
  initial: { opacity: 0 },
  animate: (i: number) => ({
    opacity: 1,
    transition: { delay: i * 0.12, duration: 0.4 },
  }),
};

const StatusIcons = {
  pending: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  progress: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  rejected: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  confirmed: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

export function HowWeWork() {
  const flowRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(flowRef, { once: true, amount: 0.2 });

  const tasks = [
    { title: 'Enhance Dashboard Functionality', status: 'In progress', due: 'Today', type: 'To-do', date: 'Aug 03' },
    { title: 'Sales Audit', status: 'In progress', due: null, type: null, date: null },
  ];

  const avatarImages = [
    { src: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Nova', bg: '#e8e8ed' },
    { src: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix', bg: '#fef3c7' },
    { src: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Kai', bg: '#bfdbfe' },
    { src: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Milo', bg: '#e9d5ff' },
  ];

  return (
    <section className="how-we-work">
      <div className="how-we-work-content">
        <h2 className="how-we-work-title">
          Organise Smarter,
          <br />
          Work Faster Thanks to AI
        </h2>
        <p className="how-we-work-desc">
          Organize your work, automate your priorities, and never miss a deadline again — all with the power of artificial intelligence.
        </p>

        <div className="how-we-work-flow" ref={flowRef}>
          <div className="how-we-work-glow" aria-hidden />

          <div className="how-we-work-center">
            <motion.div
              className="how-we-work-node how-we-work-node--ai"
              custom={0}
              variants={stepVariants}
              initial="initial"
              animate={isInView ? 'animate' : 'initial'}
            >
              <span className="how-we-work-ai-icon">◐</span>
            </motion.div>
            <div className="how-we-work-line" />
            <motion.div
              className="how-we-work-action"
              custom={1}
              variants={stepVariants}
              initial="initial"
              animate="animate"
            >
              <span className="how-we-work-action-icon">💬</span>
              Send SMS
            </motion.div>
            <div className="how-we-work-avatars">
              {avatarImages.map((avatar, i) => (
                <motion.div
                  key={i}
                  className="how-we-work-avatar how-we-work-avatar--img-wrap"
                  style={{ background: avatar.bg }}
                  custom={2 + i}
                  variants={stepVariants}
                  initial="initial"
                  animate={isInView ? 'animate' : 'initial'}
                >
                  <img src={avatar.src} alt="" className="how-we-work-avatar-img" />
                </motion.div>
              ))}
              <motion.div
                className="how-we-work-avatar how-we-work-avatar--more"
                custom={2 + avatarImages.length}
                variants={stepVariants}
                initial="initial"
                animate={isInView ? 'animate' : 'initial'}
              >
                +4
              </motion.div>
            </div>
            <div className="how-we-work-line how-we-work-line--short" />
            <div className="how-we-work-node how-we-work-node--add">
              <span>+</span>
            </div>
          </div>

          <motion.div
            className="how-we-work-status how-we-work-status--pending"
            custom={8}
            variants={cardStepVariants}
            initial="initial"
            animate={isInView ? 'animate' : 'initial'}
          >
            <span className="how-we-work-status-icon">{StatusIcons.pending}</span>
            Pending
          </motion.div>
          <motion.div
            className="how-we-work-status how-we-work-status--progress"
            custom={9}
            variants={cardStepVariants}
            initial="initial"
            animate={isInView ? 'animate' : 'initial'}
          >
            <span className="how-we-work-status-icon">{StatusIcons.progress}</span>
            In Progress
          </motion.div>
          <motion.div
            className="how-we-work-status how-we-work-status--rejected"
            custom={10}
            variants={cardStepVariants}
            initial="initial"
            animate={isInView ? 'animate' : 'initial'}
          >
            <span className="how-we-work-status-icon">{StatusIcons.rejected}</span>
            Rejected
          </motion.div>
          <motion.div
            className="how-we-work-status how-we-work-status--confirmed"
            custom={11}
            variants={cardStepVariants}
            initial="initial"
            animate={isInView ? 'animate' : 'initial'}
          >
            <span className="how-we-work-status-icon">{StatusIcons.confirmed}</span>
            Confirmed
          </motion.div>

          <div className="how-we-work-message-bubble">
            <MessageBubble
              backgroundColor="linear-gradient(180deg, rgba(139, 92, 246, 0.95) 0%, rgba(109, 40, 217, 0.95) 100%)"
              cursorPosition="right"
              cursorColor="#7c3aed"
            >
              Leslie Alexander
            </MessageBubble>
          </div>

          <div className="how-we-work-card">
            <motion.div
              custom={3 + avatarImages.length}
              variants={cardStepVariants}
              initial="initial"
              animate={isInView ? 'animate' : 'initial'}
            >
              <h3 className="how-we-work-card-title">You shared, we listened.</h3>
              <p className="how-we-work-card-section">In progress</p>
              <ul className="how-we-work-card-list">
              {tasks.map((task, i) => (
                <li key={i} className="how-we-work-card-item">
                  <div className="how-we-work-card-item-header">
                    <span className="how-we-work-card-check">✓</span>
                    <span className="how-we-work-card-task">{task.title}</span>
                  </div>
                  {(task.due || task.type || task.date) && (
                    <div className="how-we-work-card-item-meta">
                      {task.due && (
                        <span className="how-we-work-card-due">{task.due}</span>
                      )}
                      {task.type && (
                        <span className="how-we-work-card-type">{task.type}</span>
                      )}
                      {task.date && (
                        <span className="how-we-work-card-date">
                        <Calendar size={12} strokeWidth={2} aria-hidden />
                        {task.date}
                      </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
              <div className="how-we-work-card-fade" aria-hidden />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
