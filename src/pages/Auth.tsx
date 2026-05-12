import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { BookOpen, Mail, Lock, User, ArrowLeft, Sparkles } from 'lucide-react';
import LibraryBackground from '@/components/LibraryBackground';

const Auth = () => {
  const navigate = useNavigate();
  const { updateSettings } = useApp();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || 'Reader' },
          },
        });
        if (error) throw error;
        toast.success('Account created! 🚀');
        updateSettings({ onboarded: true });
        navigate('/foryou');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back! 📚');
        updateSettings({ onboarded: true });
        navigate('/foryou');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-end sm:justify-center">
      <LibraryBackground />

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm mx-auto mb-8 sm:mb-0 px-6"
      >
        <div className="bg-background/90 dark:bg-background/85 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-border/50">
          {/* Logo */}
          <div className="text-center mb-6">
            <motion.div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-3"
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            >
              <BookOpen className="w-7 h-7 text-primary" />
            </motion.div>
            <h1 className="font-display text-2xl text-foreground">BookQuest</h1>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Sparkles className="w-3 h-3 text-yellow-500" />
              <p className="text-muted-foreground text-sm">
                {mode === 'login' ? 'Welcome back, reader!' : 'Join the adventure!'}
              </p>
              <Sparkles className="w-3 h-3 text-yellow-500" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Your name"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="pl-10 rounded-xl h-11 bg-background/80"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="pl-10 rounded-xl h-11 bg-background/80"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-10 rounded-xl h-11 bg-background/80"
              />
            </div>

            <Button type="submit" className="w-full rounded-xl h-11 text-base font-bold" disabled={loading}>
              {loading ? '...' : mode === 'login' ? 'Log In 📖' : 'Sign Up 🚀'}
            </Button>
          </form>

          {/* Toggle mode */}
          <p className="text-center text-sm text-muted-foreground mt-4">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-primary font-semibold hover:underline"
            >
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>

          {/* Continue as guest */}
          <button
            onClick={() => navigate('/foryou')}
            className="flex items-center justify-center gap-2 w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Continue as guest
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
