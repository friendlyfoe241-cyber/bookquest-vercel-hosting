import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ShoppingBag, Coins, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useCoinSync } from '@/hooks/useCoinSync';

type Category = 'all' | 'theme' | 'avatar' | 'pet' | 'boost';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  rarity: string;
  xp_boost: number;
  boost_duration_hours: number | null;
  icon: string;
}

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '🛒' },
  { key: 'theme', label: 'Themes', emoji: '🎨' },
  { key: 'avatar', label: 'Avatars', emoji: '👤' },
  { key: 'pet', label: 'Pets', emoji: '🐾' },
  { key: 'boost', label: 'Boosts', emoji: '⚡' },
];

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-muted text-muted-foreground',
  uncommon: 'bg-green-500/20 text-green-600',
  rare: 'bg-blue-500/20 text-blue-600',
  epic: 'bg-purple-500/20 text-purple-600',
  legendary: 'bg-amber-500/20 text-amber-600',
};

const Shop = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const { coins, setCoins, refreshCoins } = useCoinSync();
  const [category, setCategory] = useState<Category>('all');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadShop();
  }, []);

  const loadShop = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    // Load shop items
    const { data: shopItems } = await supabase.from('shop_items').select('*');
    setItems((shopItems as unknown as ShopItem[]) ?? []);

    if (user) {
      // Load owned items
      const { data: inventory } = await supabase
        .from('user_inventory')
        .select('item_id')
        .eq('user_id', user.id);
      setOwnedIds(new Set((inventory ?? []).map((i: any) => i.item_id)));
    }
    setLoading(false);
  };

  const purchaseItem = async (item: ShopItem) => {
    if (!userId) {
      toast.error('Sign in to purchase items!');
      return;
    }
    if (ownedIds.has(item.id)) {
      toast.info('You already own this item!');
      return;
    }
    if (coins < item.price) {
      toast.error(`Not enough coins! Need ${item.price - coins} more.`);
      return;
    }

    // Deduct coins via secure RPC
    const newCoins = coins - item.price;
    await supabase.rpc('update_profile_economy', { p_user_id: userId, p_coins: newCoins } as any);

    // Add to inventory
    const expiresAt = item.boost_duration_hours
      ? new Date(Date.now() + item.boost_duration_hours * 3600000).toISOString()
      : null;
    await supabase.from('user_inventory').insert({
      user_id: userId,
      item_id: item.id,
      expires_at: expiresAt,
    });

    setCoins(newCoins);
    setOwnedIds(prev => new Set([...prev, item.id]));
    toast.success(`Purchased ${item.name}! 🎉`);
  };

  const filtered = category === 'all' ? items : items.filter(i => i.category === category);

  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-3xl text-primary flex items-center gap-2">
            <ShoppingBag className="w-7 h-7" /> Shop
          </h1>
        </div>
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-2xl px-3 py-1.5">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span className="font-bold text-sm">{coins.toLocaleString()}</span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="bg-card rounded-2xl p-1 border border-border flex mb-4">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
              category === c.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {!userId && (
        <div className="bg-card rounded-2xl p-4 mb-4 text-center border border-border">
          <p className="text-sm text-muted-foreground">Sign in to purchase items!</p>
          <button onClick={() => navigate('/auth')} className="text-primary font-semibold text-sm mt-1 hover:underline">
            Sign In →
          </button>
        </div>
      )}

      {/* Items grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            {filtered.map((item, i) => {
              const owned = ownedIds.has(item.id);
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => purchaseItem(item)}
                  disabled={owned}
                  className={`relative p-4 rounded-2xl border text-left transition-all ${
                    owned
                      ? 'bg-primary/5 border-primary/20 opacity-70'
                      : 'bg-card border-border hover:border-primary/30 hover:shadow-md active:scale-95'
                  }`}
                >
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <p className="font-bold text-sm">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className={`text-[10px] ${RARITY_COLORS[item.rarity] || ''}`}>
                      {item.rarity}
                    </Badge>
                    {owned ? (
                      <span className="text-xs font-semibold text-primary">Owned ✓</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold">
                        <Coins className="w-3 h-3 text-yellow-500" /> {item.price}
                      </span>
                    )}
                  </div>
                  {item.xp_boost > 1 && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary/20 text-primary text-[9px] border-0">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                        {item.xp_boost}x XP
                      </Badge>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default Shop;
