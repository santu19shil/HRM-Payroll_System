import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence, MotionConfig } from 'framer-motion';
import { Briefcase, Wallet, Clock, CalendarDays, FileText, Megaphone, ShieldCheck, BarChart3, Users, ArrowRight, CheckCircle2, Menu, X } from 'lucide-react';
import Reveal from '../components/Reveal';

const EASE = [0.22, 1, 0.36, 1];

const FEATURES = [
  { icon: Wallet, title: 'Automated Payroll', text: 'Run accurate salaries, taxes, and deductions in a single click. Branded payslips and statutory reports — no spreadsheets.' },
  { icon: Clock, title: 'Smart Attendance', text: 'Track check-in, check-out, overtime and shifts in real time. Synced to payroll automatically, every day.' },
  { icon: CalendarDays, title: 'Leave Management', text: 'Request, approve, and balance leaves with a frictionless workflow. Calendar views keep teams and managers aligned.' },
  { icon: FileText, title: 'Central Documents', text: 'Store contracts, IDs, and certificates securely in one place. Role-based access keeps sensitive files protected.' },
  { icon: Megaphone, title: 'Company Notices', text: 'Broadcast announcements to the whole org or targeted teams instantly — with attachments and read receipts.' },
  { icon: BarChart3, title: 'Insightful Reports', text: 'Headcount, cost, and attendance analytics that help leaders make decisions backed by live data.' },
];

const TRUST = ['Payroll', 'Attendance', 'Leaves', 'Documents', 'Notices', 'Reports'];

const STEPS = [
  { n: '01', title: 'Onboard', text: 'Import employees, departments and designations in minutes.' },
  { n: '02', title: 'Configure', text: 'Set salaries, leave policies, holidays and approval flows.' },
  { n: '03', title: 'Operate', text: 'Run attendance, payroll and notices from one dashboard.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.08 * i, ease: EASE } }),
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const navShadow = useTransform(scrollYProgress, [0, 0.04], [0, 1]);
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -40]);
  const heroFade = useTransform(scrollYProgress, [0, 0.18], [1, 0.55]);

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="landing">
        <motion.header className="landing-nav" style={{ boxShadow: useTransform(navShadow, [0, 1], ['none', '0 1px 0 var(--border), 0 6px 16px rgba(15,23,42,0.06)']) }}>
          <Link to="/" className="landing-brand">
            <span className="landing-brand-logo"><Briefcase size={18} color="#fff" strokeWidth={2.4} /></span>
            <span>Enterprise HRMS</span>
          </Link>
          <nav className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#secure">Why us</a>
            <button className="btn btn-sm" onClick={() => navigate('/login')}>Sign In</button>
          </nav>
          <button className="landing-burger" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </motion.header>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="landing-mobile-menu"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
              <a href="#secure" onClick={() => setMenuOpen(false)}>Why us</a>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>Sign In</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero */}
        <section className="landing-hero">
          <motion.div style={{ y: heroY, opacity: heroFade }} initial="hidden" animate="show" variants={{ show: {} }}>
            <motion.span className="landing-eyebrow" variants={fadeUp}>All-in-one HR &amp; payroll platform</motion.span>
            <motion.h1 className="landing-title" variants={fadeUp} custom={1}>
              Run your people operations like a <span className="landing-accent">modern enterprise</span>
            </motion.h1>
            <motion.p className="landing-subtitle" variants={fadeUp} custom={2}>
              Payroll, attendance, leaves, documents and notices — beautifully unified in one
              secure dashboard your whole team will actually enjoy using.
            </motion.p>
            <motion.div className="landing-cta" variants={fadeUp} custom={3}>
              <button className="btn btn-primary btn-lg landing-btn" onClick={() => navigate('/login')}>
                Get Started <ArrowRight size={18} className="landing-btn-arrow" />
              </button>
              <a className="btn btn-lg" href="#features">Explore Features</a>
            </motion.div>
            <motion.div className="landing-hero-trust" variants={fadeUp} custom={4}>
              <div className="landing-trust-item"><ShieldCheck size={16} /> Bank-grade security</div>
              <div className="landing-trust-item"><Users size={16} /> Built for teams of all sizes</div>
              <div className="landing-trust-item"><CheckCircle2 size={16} /> Compliant by design</div>
            </motion.div>
          </motion.div>
        </section>

        {/* Features — the centerpiece */}
        <section id="features" className="landing-section landing-features-section">
          <Reveal className="landing-section-head" direction="up">
            <span className="landing-eyebrow">Everything your HR team needs</span>
            <h2 className="landing-h2">One platform. Every HR function.</h2>
            <p className="landing-lead">Six powerful modules, working together — so your whole organization runs on a single source of truth.</p>
          </Reveal>

          <motion.div
            className="landing-features"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={{ show: { transition: { staggerChildren: 0.09 } } }}
          >
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                className="landing-feature"
                variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}
              >
                <div className="landing-feature-card">
                  <div className="landing-feature-icon"><f.icon size={24} strokeWidth={2.2} /></div>
                  <div className="landing-feature-body">
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Why us */}
        <section id="secure" className="landing-section">
          <Reveal className="landing-section-head" direction="up">
            <span className="landing-eyebrow">Trusted by modern teams</span>
            <h2 className="landing-h2">Built for scale, secured by design</h2>
          </Reveal>
          <Reveal direction="up" className="landing-trust-band">
            {TRUST.map((t) => (
              <span key={t} className="landing-trust-chip"><CheckCircle2 size={15} /> {t}</span>
            ))}
          </Reveal>
        </section>

        {/* How it works */}
        <section id="how" className="landing-section">
          <Reveal className="landing-section-head" direction="up">
            <span className="landing-eyebrow">Simple by design</span>
            <h2 className="landing-h2">Live in three steps</h2>
          </Reveal>
          <div className="landing-steps">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} direction="up" delay={i * 0.1} className="landing-step">
                <div className="landing-step-n">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="landing-section">
          <Reveal direction="up" className="landing-cta-band">
            <h2>Ready to modernize your payroll?</h2>
            <p>Jump into the workspace and see how smooth HR can be.</p>
            <button className="btn btn-primary btn-lg landing-btn" onClick={() => navigate('/login')}>
              Sign In to Dashboard <ArrowRight size={18} className="landing-btn-arrow" />
            </button>
          </Reveal>
        </section>

        <footer className="landing-footer">
          <div className="landing-brand">
            <span className="landing-brand-logo"><Briefcase size={18} color="#fff" strokeWidth={2.4} /></span>
            <span>Enterprise HRMS</span>
          </div>
          <p>© 2026 Enterprise HRMS. Payroll Management System.</p>
        </footer>
      </div>
    </MotionConfig>
  );
}
