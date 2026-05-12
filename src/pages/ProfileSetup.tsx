import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, School, GraduationCap, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface SchoolOption {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
}

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [classId, setClassId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }
    setUserId(user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, school_name, class_id')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      setDisplayName(profile.display_name || '');
      setSelectedSchool((profile as any)?.school_name || '');
      setClassId((profile as any)?.class_id || '');
    }

    const { data: schoolList } = await supabase.from('schools').select('*');
    setSchools((schoolList as unknown as SchoolOption[]) ?? []);
  };

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    await supabase.from('profiles').update({
      display_name: displayName.trim() || 'Reader',
      school_name: selectedSchool || null,
      class_id: classId.trim() || null,
    } as any).eq('user_id', userId);
    setLoading(false);
    toast.success('Profile updated!');
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-2xl text-primary">Profile Setup</h1>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Display Name */}
        <div>
          <label className="text-sm font-semibold mb-2 block">Display Name</label>
          <Input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your display name"
            className="rounded-xl"
            maxLength={50}
          />
        </div>

        {/* School Selection */}
        <div>
          <label className="text-sm font-semibold mb-2 flex items-center gap-2 block">
            <School className="w-4 h-4" /> School
          </label>
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for your school..."
            className="rounded-xl mb-2"
          />
          <div className="max-h-48 overflow-y-auto space-y-1 bg-muted rounded-xl p-2">
            <button
              onClick={() => { setSelectedSchool(''); setSearchQuery(''); }}
              className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                !selectedSchool ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-card'
              }`}
            >
              No school selected
            </button>
            {filteredSchools.map(school => (
              <button
                key={school.id}
                onClick={() => { setSelectedSchool(school.name); setSearchQuery(''); }}
                className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                  selectedSchool === school.name ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-card'
                }`}
              >
                <span className="font-medium">{school.name}</span>
                {school.city && <span className="text-xs text-muted-foreground ml-2">{school.city}</span>}
                {selectedSchool === school.name && <Check className="w-4 h-4 inline ml-2 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Class ID */}
        {selectedSchool && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <label className="text-sm font-semibold mb-2 flex items-center gap-2 block">
              <GraduationCap className="w-4 h-4" /> Class / Group
            </label>
            <Input
              value={classId}
              onChange={e => setClassId(e.target.value)}
              placeholder="e.g. 8A, Room 203, Period 3"
              className="rounded-xl"
              maxLength={50}
            />
          </motion.div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
};

export default ProfileSetup;
