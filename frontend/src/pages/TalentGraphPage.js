import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import VerifiedBadge from '@/components/VerifiedBadge';
import { getAllUsers, getPosts } from '@/lib/db';
import { getOrCreateChat, sendMessage } from '@/lib/chatsDb';
import {
  getUserTalentGraph,
  saveAIMatches,
  saveOpportunityFeed,
  saveTeamRecommendations,
  saveHiringRecommendations,
  saveProfileIntelligence,
} from '@/lib/talentGraphDb';
import { getEnhancedDeveloperMatches } from '@/lib/talentGraphMatching';
import { getProfileIntelligence } from '@/lib/profileIntelligence';
import { generateOpportunityFeed, buildTeam, hireDevelopers, getEmptyMatchesMessage } from '@/lib/ai';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Eye,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import { DelayedNetworkLoader, FocusReveal, SectionSkeleton } from '@/components/loading';

export default function TalentGraphPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Exactly 3 user-facing tabs: 'matches' | 'opportunities' | 'team'
  const [activeTab, setActiveTab] = useState('matches');
  const [loading, setLoading] = useState(true);
  const [otherUsers, setOtherUsers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  // Profile Intelligence
  const [intelligence, setIntelligence] = useState(null);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);

  // 1. Matches State
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchesError, setMatchesError] = useState(false);
  const [emptyMatchesMessage, setEmptyMatchesMessage] = useState('Add skills to your profile to find relevant collaborator matches.');

  // 2. Opportunities State (with internal Hiring filter/mode)
  const [opportunities, setOpportunities] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [oppFilter, setOppFilter] = useState('all'); // 'all' | 'ideas' | 'hiring'

  // Hiring within Opportunities
  const [hiringReq, setHiringReq] = useState('');
  const [hiringRecommendations, setHiringRecommendations] = useState([]);
  const [loadingHiring, setLoadingHiring] = useState(false);

  // 3. Team Builder State
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [teamRecommendations, setTeamRecommendations] = useState([]);
  const [buildingTeam, setBuildingTeam] = useState(false);

  // Initial Data Load
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [users, posts, tg] = await Promise.all([
          getAllUsers(),
          getPosts(30).catch(() => []),
          getUserTalentGraph(user.id),
        ]);

        if (!isMounted) return;

        const filtered = users.filter((u) => u.id !== user.id);
        const self = users.find((u) => u.id === user.id) || { id: user.id, username: user.username };
        setOtherUsers(filtered);
        setUserProfile(self);

        // Populate cached items
        if (tg) {
          if (Array.isArray(tg.cachedMatches) && tg.cachedMatches.length > 0) {
            setMatches(tg.cachedMatches);
          }
          if (Array.isArray(tg.cachedOpportunities) && tg.cachedOpportunities.length > 0) {
            setOpportunities(tg.cachedOpportunities);
          }
          if (Array.isArray(tg.cachedTeam) && tg.cachedTeam.length > 0) {
            setTeamRecommendations(tg.cachedTeam);
            setProjectName(tg.teamProjectName || '');
            setProjectDesc(tg.teamProjectDesc || '');
          }
          if (Array.isArray(tg.cachedHiring) && tg.cachedHiring.length > 0) {
            setHiringRecommendations(tg.cachedHiring);
            setHiringReq(tg.hiringReq || '');
          }
          if (tg.profileIntelligence) {
            setIntelligence(tg.profileIntelligence);
          }
        }

        // Progressive Profile Intelligence Load
        if (!tg?.profileIntelligence) {
          setLoadingIntelligence(true);
          const userPosts = posts.filter((p) => p.author_id === user.id);
          getProfileIntelligence(self, userPosts)
            .then((intel) => {
              if (isMounted && intel) {
                setIntelligence(intel);
                saveProfileIntelligence(user.id, intel);
              }
            })
            .catch(() => {})
            .finally(() => {
              if (isMounted) setLoadingIntelligence(false);
            });
        }

        // Progressive Matches Load
        if (!tg?.cachedMatches || tg.cachedMatches.length === 0) {
          setLoadingMatches(true);
          getEnhancedDeveloperMatches(self, filtered)
            .then((res) => {
              if (isMounted) {
                setMatches(res);
                if (res.length > 0) saveAIMatches(user.id, res);
              }
            })
            .catch(() => {
              if (isMounted) setMatchesError(true);
            })
            .finally(() => {
              if (isMounted) setLoadingMatches(false);
            });
        }
      } catch (err) {
        console.error('Failed to load TalentGraph data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.username]);

  // Empty match guidance
  useEffect(() => {
    if (matches.length === 0 && userProfile && !loadingMatches) {
      const skills = userProfile.talentGraph?.skills || userProfile.skills || [];
      const bio = userProfile.talentGraph?.bio || userProfile.bio || '';
      getEmptyMatchesMessage(skills, bio).then((msg) => {
        if (msg) setEmptyMatchesMessage(msg);
      });
    }
  }, [matches, userProfile, loadingMatches]);

  // Refresh Collaborator Matches
  const handleRefreshMatches = async () => {
    if (!userProfile) return;
    setLoadingMatches(true);
    setMatchesError(false);
    try {
      const res = await getEnhancedDeveloperMatches(userProfile, otherUsers);
      setMatches(res);
      await saveAIMatches(user.id, res);
      if (res.length > 0) {
        toast.success(`Found ${res.length} compatible collaborator matches`);
      } else {
        toast.info('No new matches found. Try updating your profile skills.');
      }
    } catch (err) {
      setMatchesError(true);
      toast.error('Collaborator matching is temporarily unavailable.');
    } finally {
      setLoadingMatches(false);
    }
  };

  // Refresh Opportunity Feed
  const handleRefreshOpportunities = async () => {
    if (!userProfile) return;
    setLoadingFeed(true);
    try {
      const skills = userProfile?.talentGraph?.skills || userProfile?.skills || [];
      const bio = userProfile?.talentGraph?.bio || userProfile?.bio || '';
      const result = await generateOpportunityFeed(skills, bio);
      if (result && result.length > 0) {
        setOpportunities(result);
        await saveOpportunityFeed(user.id, result);
        toast.success('Opportunity feed updated');
      }
    } catch (err) {
      toast.error('Opportunity feed is temporarily unavailable.');
    } finally {
      setLoadingFeed(false);
    }
  };

  // Submit Team Builder
  const handleBuildTeam = async (e) => {
    e.preventDefault();
    if (!projectDesc.trim()) return;
    setBuildingTeam(true);
    try {
      const result = await buildTeam(projectDesc, otherUsers);
      setTeamRecommendations(result || []);
      await saveTeamRecommendations(user.id, projectName, projectDesc, result || []);
      toast.success('Team recommendations generated');
    } catch (err) {
      toast.error('Team builder is temporarily unavailable.');
    } finally {
      setBuildingTeam(false);
    }
  };

  // Send Collaboration Invitation
  const handleSendInvite = async (targetUserId, targetUsername, role) => {
    try {
      const chat = await getOrCreateChat(user.id, targetUserId);
      const text = `Hello. I am building a project called "${projectName || 'Untitled'}": ${projectDesc}. Based on your profile, Discuss TalentGraph recommended you for the role of: ${role}. Let me know if you would like to collaborate!`;
      await sendMessage(chat.chatId, user.id, text);
      toast.success(`Invitation sent to @${targetUsername} in DMs`);
    } catch (err) {
      toast.error('Failed to send invitation');
    }
  };

  // Submit Developer Hiring Search (inside Opportunities -> Hiring filter)
  const handleHiringSearch = async (e) => {
    e.preventDefault();
    if (!hiringReq.trim()) return;
    setLoadingHiring(true);
    try {
      const result = await hireDevelopers(hiringReq, otherUsers);
      setHiringRecommendations(result || []);
      await saveHiringRecommendations(user.id, hiringReq, result || []);
      toast.success('Found matching candidates');
    } catch (err) {
      toast.error('Developer search is temporarily unavailable.');
    } finally {
      setLoadingHiring(false);
    }
  };

  const handleContactDeveloper = async (targetUserId, targetUsername) => {
    try {
      const chat = await getOrCreateChat(user.id, targetUserId);
      const text = `Hello. I noticed your profile on Discuss. I have a project/role opportunity aligning with your skills: "${hiringReq}". Let me know if you are open to discussing this further!`;
      await sendMessage(chat.chatId, user.id, text);
      toast.success(`Message sent to @${targetUsername} in DMs`);
    } catch (err) {
      toast.error('Failed to message developer');
    }
  };

  const findUser = (uid) => otherUsers.find((u) => u.id === uid) || null;

  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-950 dark:text-white select-none">
      <Header />

      <main className="mx-auto max-w-[935px] px-4 py-6 pb-32 md:py-8 space-y-6">
        {/* Navigation back */}
        <button
          onClick={() => navigate('/feed')}
          className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white text-xs font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Feed
        </button>

        {/* Header Title (Flat) */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            TalentGraph
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Developer compatibility, project fit, and collaboration intelligence across Discuss.
          </p>
        </div>

        {/* ── PROFILE INTELLIGENCE (FLAT ROW) ───────────────────────── */}
        {loadingIntelligence ? (
          <div className="py-4 border-b border-neutral-200 dark:border-neutral-800 animate-pulse space-y-2">
            <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div className="h-10 bg-neutral-100 dark:bg-neutral-900 rounded" />
          </div>
        ) : intelligence ? (
          <div className="border-b border-neutral-200 dark:border-neutral-800 pb-5 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Profile Intelligence
              </span>
              <button
                onClick={() => navigate('/profile')}
                className="text-xs font-semibold text-[#0095F6] hover:underline"
              >
                Edit Profile
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Strong Signals */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 font-bold text-neutral-900 dark:text-white">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Strong Signals</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {intelligence.strongSignals?.length > 0 ? (
                    intelligence.strongSignals.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-neutral-400 text-[11px]">Declare skills on profile</span>
                  )}
                </div>
              </div>

              {/* Growing Signals */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 font-bold text-neutral-900 dark:text-white">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Growing Signals</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {intelligence.growingSignals?.length > 0 ? (
                    intelligence.growingSignals.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-neutral-400 text-[11px]">Keep publishing to surface trends</span>
                  )}
                </div>
              </div>

              {/* Discoverability */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 font-bold text-neutral-900 dark:text-white">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Discoverability Tip</span>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {intelligence.discoverabilityTips?.[0] || 'Publish code projects to increase teammate matches.'}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── FLAT TAB BAR (Matches | Opportunities | Team Builder) ─── */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 gap-6">
          <button
            onClick={() => setActiveTab('matches')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'matches'
                ? 'border-neutral-950 text-neutral-950 dark:border-white dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            Matches
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'opportunities'
                ? 'border-neutral-950 text-neutral-950 dark:border-white dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            Opportunities
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'team'
                ? 'border-neutral-950 text-neutral-950 dark:border-white dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            Team Builder
          </button>
        </div>

        {/* ── 1. MATCHES TAB (FLAT ROW-BY-ROW DESIGN) ─────────────── */}
        {activeTab === 'matches' && (
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                Sorted by skill overlap, complementary strengths, and collaboration fit.
              </span>
              <Button
                onClick={handleRefreshMatches}
                disabled={loadingMatches}
                size="sm"
                variant="outline"
                className="text-xs h-8 px-3 rounded-lg border-neutral-300 dark:border-neutral-700"
              >
                {loadingMatches ? (
                  <>
                    <DelayedNetworkLoader active={true} delay={200} size="inline" mode="inline" className="mr-1.5" /> Finding…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
                  </>
                )}
              </Button>
            </div>

            {/* Partial Failure Notice */}
            {matchesError && (
              <div className="py-3 px-4 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Developer matching is temporarily unavailable.</span>
                </div>
                <button
                  onClick={handleRefreshMatches}
                  className="font-semibold underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            )}

            {loadingMatches && matches.length === 0 ? (
              <div className="space-y-3 py-2">
                <DelayedNetworkLoader active={true} delay={450} size="sm" mode="center" />
                <SectionSkeleton variant="list" count={3} />
              </div>
            ) : matches.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500 space-y-3">
                <p>{emptyMatchesMessage}</p>
                <Button
                  onClick={() => navigate('/profile')}
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-lg"
                >
                  Update Profile Skills
                </Button>
              </div>
            ) : (
              <FocusReveal ready={true} variant="standard" triggerKey={matches.map(m => m.userId).join(',')}>
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {matches.map((match) => {
                  const details = findUser(match.userId);
                  const skillsList = details?.talentGraph?.skills || details?.skills || match.sharedSkills || [];
                  const initials = match.username?.slice(0, 2).toUpperCase() || 'DV';

                  const tierStyles = {
                    'Strong match': 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                    'Good match': 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
                    'Possible match': 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800',
                  };

                  return (
                    <div key={match.userId} className="py-4 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {details?.photo_url ? (
                            <img
                              src={details.photo_url}
                              alt={match.username}
                              className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-800"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 font-bold text-xs">
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-1">
                                @{match.username}
                                {details?.verified && <VerifiedBadge size="sm" />}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  tierStyles[match.matchTier] || tierStyles['Possible match']
                                }`}
                              >
                                {match.matchTier || 'Good match'}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                              {details?.talentGraph?.bio || details?.bio || 'Developer on Discuss'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => navigate(`/user/${match.userId}`)}
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 px-3 rounded-lg border-neutral-200 dark:border-neutral-800"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Profile
                          </Button>
                          <Button
                            onClick={async () => {
                              try {
                                const chat = await getOrCreateChat(user.id, match.userId);
                                navigate(`/chat/${match.userId}`);
                              } catch {
                                toast.error('Failed to open chat');
                              }
                            }}
                            size="sm"
                            className="text-xs h-8 px-3 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg font-semibold"
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1" /> Message
                          </Button>
                        </div>
                      </div>

                      {/* Evidence Lines (Flat) */}
                      <div className="text-xs space-y-1 text-neutral-700 dark:text-neutral-300">
                        {match.complementaryStrengths && (
                          <div>
                            <span className="font-bold text-neutral-900 dark:text-white">Complementary strength: </span>
                            {match.complementaryStrengths}
                          </div>
                        )}
                        {match.potentialCollaboration && (
                          <div>
                            <span className="font-bold text-neutral-900 dark:text-white">Possible collaboration: </span>
                            {match.potentialCollaboration}
                          </div>
                        )}
                        {match.matchReason && !match.complementaryStrengths && (
                          <div className="text-neutral-600 dark:text-neutral-400">
                            {match.matchReason}
                          </div>
                        )}
                      </div>

                      {/* Skills Chips */}
                      {skillsList.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {skillsList.slice(0, 6).map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </FocusReveal>
            )}
          </div>
        )}

        {/* ── 2. OPPORTUNITIES TAB (WITH EMBEDDED HIRING FILTER) ──── */}
        {activeTab === 'opportunities' && (
          <div className="space-y-5 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filter Pills */}
              <div className="flex gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg text-xs font-semibold w-fit">
                <button
                  onClick={() => setOppFilter('all')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    oppFilter === 'all'
                      ? 'bg-white dark:bg-black text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  All Opportunities
                </button>
                <button
                  onClick={() => setOppFilter('ideas')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    oppFilter === 'ideas'
                      ? 'bg-white dark:bg-black text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Project Ideas
                </button>
                <button
                  onClick={() => setOppFilter('hiring')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    oppFilter === 'hiring'
                      ? 'bg-white dark:bg-black text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Hiring & Candidates
                </button>
              </div>

              {oppFilter !== 'hiring' && (
                <Button
                  onClick={handleRefreshOpportunities}
                  disabled={loadingFeed}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 px-3 rounded-lg border-neutral-300 dark:border-neutral-700 self-start sm:self-auto"
                >
                  {loadingFeed ? (
                    <>
                      <DelayedNetworkLoader active={true} delay={200} size="inline" mode="inline" className="mr-1.5" /> Updating…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Opportunities List (when not in Hiring sub-view) */}
            {oppFilter !== 'hiring' && (
              <>
                {loadingFeed && opportunities.length === 0 ? (
                  <div className="space-y-3 py-2">
                    <DelayedNetworkLoader active={true} delay={450} size="sm" mode="center" />
                    <SectionSkeleton variant="card" count={2} />
                  </div>
                ) : opportunities.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-500 space-y-3">
                    <p>No personalized opportunities compiled yet.</p>
                    <Button
                      onClick={handleRefreshOpportunities}
                      size="sm"
                      className="text-xs bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg"
                    >
                      Generate Opportunities
                    </Button>
                  </div>
                ) : (
                  <FocusReveal ready={true} variant="standard" triggerKey={opportunities.map(o => o.id || o.title).join(',')}>
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {opportunities
                      .filter((opp) => (oppFilter === 'ideas' ? opp.category !== 'Hiring' : true))
                      .map((opp) => (
                        <div key={opp.id || opp.title} className="py-4 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">{opp.title}</h3>
                            {opp.category && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800">
                                {opp.category}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            {opp.description}
                          </p>
                          {opp.potentialImpact && (
                            <div className="text-[11px] text-neutral-500 italic">
                              Potential value: {opp.potentialImpact}
                            </div>
                          )}
                          {opp.skillsNeeded?.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {opp.skillsNeeded.map((s) => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </FocusReveal>
                )}
              </>
            )}

            {/* Hiring Mode (merged inside Opportunities) */}
            {oppFilter === 'hiring' && (
              <div className="space-y-5 pt-2">
                <form onSubmit={handleHiringSearch} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      Technical Requirement or Role Description
                    </label>
                    <Textarea
                      value={hiringReq}
                      onChange={(e) => setHiringReq(e.target.value)}
                      placeholder="e.g. Engineer experienced with distributed systems, real-time sync, and React..."
                      rows={3}
                      className="mt-1 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={loadingHiring || !hiringReq.trim()}
                      size="sm"
                      className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold rounded-lg"
                    >
                      {loadingHiring ? (
                        <>
                          <DelayedNetworkLoader active={true} delay={200} size="inline" mode="inline" className="mr-1.5" /> Searching…
                        </>
                      ) : (
                        'Find Candidates'
                      )}
                    </Button>
                  </div>
                </form>

                {hiringRecommendations.length > 0 && (
                  <div className="divide-y divide-neutral-200 dark:divide-neutral-800 pt-3">
                    {hiringRecommendations.map((cand) => (
                      <div key={cand.userId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-900 dark:text-white">@{cand.username}</span>
                            {cand.fitTier && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                {cand.fitTier}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{cand.reason}</p>
                        </div>
                        <Button
                          onClick={() => handleContactDeveloper(cand.userId, cand.username)}
                          size="sm"
                          className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold rounded-lg self-start sm:self-auto"
                        >
                          Contact
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 3. TEAM BUILDER TAB (FLAT) ───────────────────────────── */}
        {activeTab === 'team' && (
          <div className="space-y-5 text-left">
            <form onSubmit={handleBuildTeam} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Project Name</label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Distributed Cache Workbench"
                  className="mt-1 h-9 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Project Scope & Stack</label>
                <Textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Describe your architecture, required roles, and tech stack..."
                  rows={3}
                  className="mt-1 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={buildingTeam || !projectDesc.trim()}
                  size="sm"
                  className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold rounded-lg"
                >
                  {buildingTeam ? (
                    <>
                      <DelayedNetworkLoader active={true} delay={200} size="inline" mode="inline" className="mr-1.5" /> Assembling Team…
                    </>
                  ) : (
                    'Find Teammates'
                  )}
                </Button>
              </div>
            </form>

            {teamRecommendations.length > 0 && (
              <FocusReveal ready={true} variant="standard" triggerKey={teamRecommendations.length}>
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800 pt-3">
                  {teamRecommendations.map((rec) => (
                    <div key={rec.userId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white">@{rec.username}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400">
                            {rec.role}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{rec.reason}</p>
                      </div>
                      <Button
                        onClick={() => handleSendInvite(rec.userId, rec.username, rec.role)}
                        size="sm"
                        variant="outline"
                        className="text-xs rounded-lg border-neutral-300 dark:border-neutral-700 self-start sm:self-auto"
                      >
                        Send Invitation
                      </Button>
                    </div>
                  ))}
                </div>
              </FocusReveal>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
