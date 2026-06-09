import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import VerifiedBadge from '@/components/VerifiedBadge';
import { getAllUsers } from '@/lib/db';
import { getOrCreateChat, sendMessage } from '@/lib/chatsDb';
import { 
  getUserTalentGraph, 
  saveAIMatches, 
  saveOpportunityFeed, 
  logAIAction, 
  getAIActions 
} from '@/lib/talentGraphDb';
import { 
  matchCollaborators, 
  generateOpportunityFeed, 
  buildTeam, 
  hireDevelopers, 
  chatAssistant,
  getEmptyMatchesMessage
} from '@/lib/ai';
import { 
  Users, Briefcase, UserPlus, MessageSquare, Terminal, Eye,
  ArrowLeft, Search, Loader2, Send, ChevronRight, UserCheck, RefreshCw, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function TalentGraphPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('matches');
  const [loading, setLoading] = useState(false);
  const [otherUsers, setOtherUsers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('discuss_ai_model') || 'gemini'
  );

  const handleModelChange = (e) => {
    const val = e.target.value;
    setSelectedModel(val);
    localStorage.setItem('discuss_ai_model', val);
  };

  // 1. Matchmaking States
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // 2. Opportunity Feed States
  const [opportunities, setOpportunities] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // 3. Team Builder States
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [teamRecommendations, setTeamRecommendations] = useState([]);
  const [buildingTeam, setBuildingTeam] = useState(false);

  // 4. Hiring Assistant States
  const [hiringReq, setHiringReq] = useState('');
  const [hiringRecommendations, setHiringRecommendations] = useState([]);
  const [loadingHiring, setLoadingHiring] = useState(false);

  // 5. Chat States
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello. I am your Discuss AI network assistant. Ask me to find developers, suggest teammates, or discover opportunities across our network.',
      matchedUsers: []
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // 6. Action Log States
  const [actionLogs, setActionLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Empty matches advice states
  const [emptyMatchesMessage, setEmptyMatchesMessage] = useState('Select your skills and refresh to find matches.');
  const [loadingEmptyMessage, setLoadingEmptyMessage] = useState(false);

  const triggerLogAIAction = async (type, desc) => {
    await logAIAction(user.id, type, desc);
    try {
      const logs = await getAIActions(user.id);
      setActionLogs(logs);
    } catch {}
  };

  // Load Users and Current TalentGraph Data
  useEffect(() => {
    if (!user?.id) return;
    
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const users = await getAllUsers();
        const filtered = users.filter(u => u.id !== user.id);
        setOtherUsers(filtered);
        
        const selfProfile = users.find(u => u.id === user.id);
        setUserProfile(selfProfile);

        // Load Cached Data
        const tg = await getUserTalentGraph(user.id);
        if (tg) {
          setMatches(tg.cachedMatches || []);
          setOpportunities(tg.cachedOpportunities || []);
        }

        // Fetch logs
        const logs = await getAIActions(user.id);
        setActionLogs(logs);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [user?.id]);

  useEffect(() => {
    if (matches.length === 0 && userProfile) {
      setLoadingEmptyMessage(true);
      const skills = userProfile.talentGraph?.skills || [];
      const bio = userProfile.talentGraph?.bio || userProfile.bio || '';
      getEmptyMatchesMessage(skills, bio)
        .then(msg => {
          if (msg) setEmptyMatchesMessage(msg);
        })
        .catch(() => {})
        .finally(() => setLoadingEmptyMessage(false));
    }
  }, [matches, userProfile]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const loadLogs = useCallback(async () => {
    if (!user?.id) return;
    setLoadingLogs(true);
    try {
      const logs = await getAIActions(user.id);
      setActionLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  }, [user?.id]);

  // Load Action Logs when log tab is opened
  useEffect(() => {
    if (activeTab === 'logs' && user?.id) {
      loadLogs();
    }
  }, [activeTab, user?.id, loadLogs]);

  // 1. Matches Generation
  const handleRefreshMatches = async () => {
    if (!userProfile) return;
    setLoadingMatches(true);
    try {
      const result = await matchCollaborators(userProfile, otherUsers, actionLogs);
      if (result && result.length > 0) {
        setMatches(result);
        await saveAIMatches(user.id, result);
        await triggerLogAIAction('matchmaking', `Refreshed collaborator matches. Found ${result.length} matches.`);
        toast.success('Matches updated');
      } else {
        toast.info('No matches found. Try updating your profile or skills.');
      }
    } catch (err) {
      toast.error('AI service is busy. Try again later.');
    } finally {
      setLoadingMatches(false);
    }
  };

  // 2. Opportunities Generation
  const handleRefreshOpportunities = async () => {
    setLoadingFeed(true);
    try {
      const skills = userProfile?.talentGraph?.skills || [];
      const bio = userProfile?.talentGraph?.bio || userProfile?.bio || '';
      const result = await generateOpportunityFeed(skills, bio);
      if (result && result.length > 0) {
        setOpportunities(result);
        await saveOpportunityFeed(user.id, result);
        await triggerLogAIAction('opportunity_feed', `Generated opportunity feed containing ${result.length} suggestions.`);
        toast.success('Opportunity feed updated');
      }
    } catch (err) {
      toast.error('AI service is busy. Try again later.');
    } finally {
      setLoadingFeed(false);
    }
  };

  // 3. Team Builder Submit
  const handleBuildTeam = async (e) => {
    e.preventDefault();
    if (!projectDesc.trim()) return;
    setBuildingTeam(true);
    try {
      const result = await buildTeam(projectDesc, otherUsers, actionLogs);
      setTeamRecommendations(result || []);
      await triggerLogAIAction('team_builder', `Requested recommendations for project: ${projectName || 'Untitled'}`);
      toast.success('Contributors suggested');
    } catch (err) {
      toast.error('AI service is busy. Try again later.');
    } finally {
      setBuildingTeam(false);
    }
  };

  const handleSendInvite = async (targetUserId, targetUsername, role) => {
    try {
      const chat = await getOrCreateChat(user.id, targetUserId);
      const text = `Hello. I am building a project called "${projectName || 'Untitled'}": ${projectDesc}. Based on your profile, AI recommended you as a collaborator for the role of: ${role}. Let me know if you would like to collaborate!`;
      await sendMessage(chat.chatId, user.id, text);
      await triggerLogAIAction('invite_sent', `Sent collaboration invitation to @${targetUsername} for ${projectName || 'Untitled'}`);
      toast.success(`Invitation sent to @${targetUsername} in DMs`);
    } catch (err) {
      toast.error('Failed to send invitation');
    }
  };

  // 4. Hiring Assistant Submit
  const handleHiringSearch = async (e) => {
    e.preventDefault();
    if (!hiringReq.trim()) return;
    setLoadingHiring(true);
    try {
      const result = await hireDevelopers(hiringReq, otherUsers);
      setHiringRecommendations(result || []);
      await triggerLogAIAction('hiring_assistant', `Queried developers matching: ${hiringReq.slice(0, 40)}`);
      toast.success('Developer matches identified');
    } catch (err) {
      toast.error('AI service is busy. Try again later.');
    } finally {
      setLoadingHiring(false);
    }
  };

  const handleContactDeveloper = async (targetUserId, targetUsername) => {
    try {
      const chat = await getOrCreateChat(user.id, targetUserId);
      const text = `Hello. I noticed your profile on Discuss. I have a potential project/hiring opportunity that aligns with your skills: "${hiringReq}". Let me know if you are open to discussing this further!`;
      await sendMessage(chat.chatId, user.id, text);
      await triggerLogAIAction('hiring_contact', `Contacted developer @${targetUsername} regarding: ${hiringReq.slice(0, 30)}...`);
      toast.success(`Message sent to @${targetUsername} in DMs`);
    } catch (err) {
      toast.error('Failed to contact developer');
    }
  };

  // 5. Discuss AI Chat Send
  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const result = await chatAssistant(userMsg, userProfile, otherUsers, actionLogs);
      if (result) {
        setChatMessages(prev => [...prev, {
          sender: 'assistant',
          text: result.text,
          matchedUsers: result.matchedUsers || []
        }]);
        await triggerLogAIAction('chat_query', `Queried AI assistant: ${userMsg.slice(0, 30)}...`);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        sender: 'assistant',
        text: 'The AI assistant is busy or unavailable. Please try again.',
        matchedUsers: []
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatSuggestion = (text) => {
    setChatInput(text);
  };

  // Helper: Find user details by userId
  const findUser = (uid) => {
    return otherUsers.find(u => u.id === uid) || null;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#121212]">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 pb-32 md:pb-32">
        
        {/* Navigation back */}
        <button
          onClick={() => navigate('/feed')}
          className="flex items-center gap-2 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] hover:text-[#0F172A] dark:hover:text-white discuss:hover:text-[#F5F5F5] text-[13px] font-medium mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Feed
        </button>

        {/* Dashboard Title */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white discuss:text-[#F5F5F5]">
              Discuss AI TalentGraph
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
              Discover opportunities, collaborators, founders, and build developer teams.
            </p>
          </div>
          
          {/* Model Selector UI */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">AI Model:</span>
            <select
              value={selectedModel}
              onChange={handleModelChange}
              className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-semibold rounded-md py-1.5 px-3 outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all shadow-sm cursor-pointer"
            >
              <option value="gemini">Gemini (Default)</option>
              <option value="poolside">Poolside Laguna M.1 (OpenRouter)</option>
              <option value="deepseek">DeepSeek R1 (MLVoca)</option>
              <option value="tinyllama">TinyLlama (MLVoca)</option>
            </select>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] shadow-sm">
          <button
            onClick={() => setActiveTab('matches')}
            className={`py-2 px-1 text-center rounded text-xs font-semibold border transition-all ${
              activeTab === 'matches'
                ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                : 'bg-transparent text-neutral-600 border-transparent hover:border-neutral-200 dark:text-neutral-400 dark:hover:border-neutral-700'
            }`}
          >
            Matches
          </button>
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`py-2 px-1 text-center rounded text-xs font-semibold border transition-all ${
              activeTab === 'opportunities'
                ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                : 'bg-transparent text-neutral-600 border-transparent hover:border-neutral-200 dark:text-neutral-400 dark:hover:border-neutral-700'
            }`}
          >
            Opportunities
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`py-2 px-1 text-center rounded text-xs font-semibold border transition-all ${
              activeTab === 'team'
                ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                : 'bg-transparent text-neutral-600 border-transparent hover:border-neutral-200 dark:text-neutral-400 dark:hover:border-neutral-700'
            }`}
          >
            Team Builder
          </button>
          <button
            onClick={() => setActiveTab('hiring')}
            className={`py-2 px-1 text-center rounded text-xs font-semibold border transition-all ${
              activeTab === 'hiring'
                ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                : 'bg-transparent text-neutral-600 border-transparent hover:border-neutral-200 dark:text-neutral-400 dark:hover:border-neutral-700'
            }`}
          >
            Hiring
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-2 px-1 text-center rounded text-xs font-semibold border transition-all ${
              activeTab === 'chat'
                ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                : 'bg-transparent text-neutral-600 border-transparent hover:border-neutral-200 dark:text-neutral-400 dark:hover:border-neutral-700'
            }`}
          >
            AI Assistant
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 text-center rounded text-xs font-semibold border transition-all ${
              activeTab === 'logs'
                ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                : 'bg-transparent text-neutral-600 border-transparent hover:border-neutral-200 dark:text-neutral-400 dark:hover:border-neutral-700'
            }`}
          >
            Activity Logs
          </button>
        </div>

        {/* ==================== TAB CONTENT ==================== */}

        {/* 1. MATCHES TAB */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">AI Collaborator Matches</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Recommended partners based on complementary skills and profile activity.</p>
              </div>
              <Button
                onClick={handleRefreshMatches}
                disabled={loadingMatches}
                size="sm"
                className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold py-2 px-4 rounded border border-neutral-300 dark:border-neutral-700"
              >
                {loadingMatches ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Finding Matches...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Refresh Matches
                  </>
                )}
              </Button>
            </div>

            {loadingMatches ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-neutral-600" />
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl p-6">
                <Users className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">Collaborator Recommendations</h3>
                
                {loadingEmptyMessage ? (
                  <div className="flex items-center justify-center gap-1.5 py-4">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-600" />
                    <span className="text-xs text-neutral-500">Generating network advice...</span>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mb-4 leading-relaxed font-medium">
                    {emptyMatchesMessage}
                  </p>
                )}
                
                <Button onClick={() => navigate('/profile')} variant="outline" className="border-neutral-200 text-xs rounded-md">
                  Update Skills
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => {
                  const details = findUser(match.userId);
                  const skillsList = details?.talentGraph?.skills || details?.skills || [];
                  const initials = match.username?.slice(0, 2).toUpperCase() || 'DV';
                  return (
                    <div
                      key={match.userId}
                      className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl p-5 shadow-sm space-y-4 text-left"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex gap-3">
                          {details?.photo_url ? (
                            <img
                              src={details.photo_url}
                              alt={match.username}
                              className="w-12 h-12 rounded-full object-cover border border-neutral-250/20"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 font-bold">
                              {initials}
                            </div>
                          )}
                          <div>
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                              @{match.username}
                              {details?.verified && <VerifiedBadge size="sm" />}
                            </h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-md line-clamp-1">
                              {details?.bio || 'No bio provided.'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            onClick={() => navigate(`/user/${match.userId}`)}
                            variant="outline"
                            className="text-xs font-semibold rounded border border-neutral-200 dark:border-neutral-700 flex-1 sm:flex-initial"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Profile
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
                            className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold rounded px-4 flex-1 sm:flex-initial"
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            Message
                          </Button>
                        </div>
                      </div>

                      {/* Reason Outlined Box */}
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                        <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Match Reason</h4>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium">
                          {match.reason}
                        </p>
                      </div>

                      {skillsList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {skillsList.map(s => (
                            <span key={s} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-2 py-0.5 rounded text-[10px] border border-neutral-200 dark:border-neutral-700">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. OPPORTUNITY FEED TAB */}
        {activeTab === 'opportunities' && (
          <div className="space-y-4 text-left">
            <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">AI Project Opportunity Feed</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Startup ideas, collaboration openings, and open-source projects selected for you.</p>
              </div>
              <Button
                onClick={handleRefreshOpportunities}
                disabled={loadingFeed}
                size="sm"
                className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold py-2 px-4 rounded border border-neutral-300 dark:border-neutral-700"
              >
                {loadingFeed ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Refresh Feed
                  </>
                )}
              </Button>
            </div>

            {loadingFeed ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-neutral-600" />
              </div>
            ) : opportunities.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl">
                <Briefcase className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">Feed Empty</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-4">
                  Generate side project suggestions and business ideas matching your skills.
                </p>
                <Button onClick={handleRefreshOpportunities} className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs rounded-md">
                  Generate Feed
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opportunities.map((opp, idx) => (
                  <div
                    key={opp.id || idx}
                    className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl p-5 shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          {opp.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{opp.title}</h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                        {opp.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                      <div className="p-2 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded">
                        <h4 className="text-[9px] font-bold text-neutral-400 uppercase mb-0.5">Business Potential</h4>
                        <p className="text-[11px] text-neutral-750 dark:text-neutral-300 font-medium">{opp.businessPotential}</p>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {(opp.skillsNeeded || []).map(s => (
                          <span key={s} className="bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 px-1.5 py-0.5 rounded text-[9px] font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. TEAM BUILDER TAB */}
        {activeTab === 'team' && (
          <div className="space-y-4 text-left">
            <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl p-5">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-1">AI Team Builder</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                Describe a side project, hackathon project, or startup idea. AI will scan the user list and find ideal collaborators.
              </p>

              <form onSubmit={handleBuildTeam} className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-wider block mb-1">Project Name</label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name..."
                    className="bg-transparent border border-neutral-200 dark:border-neutral-800 text-sm h-9"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-wider block mb-1">Project Description & Skills Needed</label>
                  <Textarea
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    placeholder="What are you building? e.g. I need a Flutter developer and Firebase expert to build a cross-platform chat client..."
                    rows={4}
                    className="bg-transparent border border-neutral-200 dark:border-neutral-800 text-sm resize-none"
                    required
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={buildingTeam || !projectDesc.trim()}
                    className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold py-2 px-4 rounded shadow"
                  >
                    {buildingTeam ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Finding Contributors...
                      </>
                    ) : (
                      'Find Contributors'
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {teamRecommendations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Suggested Teammates</h3>
                <div className="space-y-3">
                  {teamRecommendations.map((rec) => {
                    const details = findUser(rec.userId);
                    const skillsList = details?.talentGraph?.skills || details?.skills || [];
                    const initials = rec.username?.slice(0, 2).toUpperCase() || 'DV';
                    
                    return (
                      <div
                        key={rec.userId}
                        className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl p-5 flex flex-col sm:flex-row justify-between gap-4 items-start"
                      >
                        <div className="space-y-3 flex-1">
                          <div className="flex gap-3 items-center">
                            {details?.photo_url ? (
                              <img
                                src={details.photo_url}
                                alt={rec.username}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 font-bold">
                                {initials}
                              </div>
                            )}
                            <div>
                              <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                                @{rec.username}
                                {details?.verified && <VerifiedBadge size="sm" />}
                              </h4>
                              <span className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 px-2 py-0.5 rounded text-[10px] font-bold mt-1 inline-block">
                                Proposed Role: {rec.role}
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                            <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                              {rec.reason}
                            </p>
                          </div>

                          {skillsList.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {skillsList.map(s => (
                                <span key={s} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-2 py-0.5 rounded text-[10px]">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0 pt-1">
                          <Button
                            onClick={() => navigate(`/user/${rec.userId}`)}
                            variant="outline"
                            className="text-xs font-semibold rounded border border-neutral-200 dark:border-neutral-700 w-full sm:w-32"
                          >
                            Profile
                          </Button>
                          <Button
                            onClick={() => handleSendInvite(rec.userId, rec.username, rec.role)}
                            className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold rounded w-full sm:w-32"
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1" />
                            Invite
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. HIRING ASSISTANT TAB */}
        {activeTab === 'hiring' && (
          <div className="space-y-4 text-left">
            <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl p-5">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-1">AI Founder & Hiring Assistant</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                Describe a developer opening, startup role, or business problem you need solved. AI will find developers matching your stack.
              </p>

              <form onSubmit={handleHiringSearch} className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-600 dark:text-neutral-400 font-bold uppercase tracking-wider block mb-1">Requirement / Problem Statement</label>
                  <Textarea
                    value={hiringReq}
                    onChange={(e) => setHiringReq(e.target.value)}
                    placeholder="e.g. Looking for a freelance React native developer to build a prototype. Need someone who understands state management and mobile notifications..."
                    rows={4}
                    className="bg-transparent border border-neutral-200 dark:border-neutral-800 text-sm resize-none"
                    required
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={loadingHiring || !hiringReq.trim()}
                    className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold py-2 px-4 rounded shadow"
                  >
                    {loadingHiring ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Analyzing Talent...
                      </>
                    ) : (
                      'Analyze Talent'
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {hiringRecommendations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">Identified Developer Candidates</h3>
                <div className="space-y-3">
                  {hiringRecommendations.map((rec) => {
                    const details = findUser(rec.userId);
                    const skillsList = details?.talentGraph?.skills || details?.skills || [];
                    const initials = rec.username?.slice(0, 2).toUpperCase() || 'DV';
                    
                    return (
                      <div
                        key={rec.userId}
                        className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl p-5 flex flex-col sm:flex-row justify-between gap-4 items-start"
                      >
                        <div className="space-y-3 flex-1">
                          <div className="flex gap-3 items-center">
                            {details?.photo_url ? (
                              <img
                                src={details.photo_url}
                                alt={rec.username}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 font-bold">
                                {initials}
                              </div>
                            )}
                            <div>
                              <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                                @{rec.username}
                                {details?.verified && <VerifiedBadge size="sm" />}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 text-neutral-850 dark:text-neutral-250 px-2 py-0.5 rounded text-[10px] font-bold">
                                  Fit Score: {rec.fitScore}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                            <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                              {rec.reason}
                            </p>
                          </div>

                          {skillsList.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {skillsList.map(s => (
                                <span key={s} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-2 py-0.5 rounded text-[10px]">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0 pt-1">
                          <Button
                            onClick={() => navigate(`/user/${rec.userId}`)}
                            variant="outline"
                            className="text-xs font-semibold rounded border border-neutral-200 dark:border-neutral-700 w-full sm:w-32"
                          >
                            Profile
                          </Button>
                          <Button
                            onClick={() => handleContactDeveloper(rec.userId, rec.username)}
                            className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold rounded w-full sm:w-32"
                          >
                            Contact
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. AI CHAT ASSISTANT TAB */}
        {activeTab === 'chat' && (
          <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl flex flex-col h-[550px] overflow-hidden shadow-sm">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] flex items-center justify-between text-left">
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Discuss AI Network Chat</h2>
                <p className="text-[11px] text-neutral-500">Query developers, projects, and matches in real time.</p>
              </div>
            </div>

            {/* Chat message history container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left scrollbar-thin">
              {chatMessages.map((msg, idx) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}>
                    <div className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed border overflow-x-auto ${
                      isUser
                        ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                        : 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200'
                    }`}>
                      {isUser ? (
                        <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                      ) : (
                        <div className="markdown-content font-medium space-y-2 [&_p]:mb-2 [&_pre]:bg-neutral-800 dark:[&_pre]:bg-neutral-950 [&_pre]:text-neutral-100 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-x-auto [&_code]:font-mono [&_code]:bg-neutral-200/50 dark:[&_code]:bg-neutral-800/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-2 [&_h1]:text-sm [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-bold [&_a]:text-blue-500 [&_a]:underline">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* If AI matched developers, render them as outlined cards below the message bubbles */}
                    {!isUser && msg.matchedUsers && msg.matchedUsers.length > 0 && (
                      <div className="w-full max-w-[85%] grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pl-2">
                        {msg.matchedUsers.map(uid => {
                          const detail = findUser(uid);
                          if (!detail) return null;
                          const initials = detail.username?.slice(0, 2).toUpperCase() || 'DV';
                          const skillsList = detail.talentGraph?.skills || detail.skills || [];
                          
                          return (
                            <div key={uid} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 rounded-lg flex flex-col justify-between space-y-2">
                              <div className="flex items-center gap-2">
                                {detail.photo_url ? (
                                  <img src={detail.photo_url} alt={detail.username} className="w-7 h-7 rounded-full object-cover" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-bold">
                                    {initials}
                                  </div>
                                )}
                                <div className="text-left min-w-0">
                                  <h4 className="text-[11px] font-bold truncate">@{detail.username}</h4>
                                  {skillsList.length > 0 && (
                                    <p className="text-[9px] text-neutral-400 truncate">{skillsList.slice(0, 2).join(', ')}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1.5 pt-1">
                                <Button
                                  onClick={() => navigate(`/user/${uid}`)}
                                  variant="outline"
                                  className="h-6 px-2 text-[9px] rounded flex-1 border border-neutral-200 dark:border-neutral-700"
                                >
                                  View
                                </Button>
                                <Button
                                  onClick={async () => {
                                    try {
                                      await getOrCreateChat(user.id, uid);
                                      navigate(`/chat/${uid}`);
                                    } catch {
                                      toast.error('Failed to open chat');
                                    }
                                  }}
                                  className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 h-6 px-2 text-[9px] rounded flex-1"
                                >
                                  Chat
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {chatLoading && (
                <div className="flex items-start">
                  <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 flex items-center gap-2 text-xs text-neutral-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    AI Assistant is thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Actions Container */}
            <div className="px-4 py-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-1.5 justify-start">
              <button
                onClick={() => handleChatSuggestion('Find React developers')}
                className="bg-transparent border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 text-neutral-600 dark:text-neutral-400 px-2 py-1 rounded text-[10px] font-semibold transition-all"
              >
                Find React developers
              </button>
              <button
                onClick={() => handleChatSuggestion('Find AI engineers')}
                className="bg-transparent border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 text-neutral-600 dark:text-neutral-400 px-2 py-1 rounded text-[10px] font-semibold transition-all"
              >
                Find AI engineers
              </button>
              <button
                onClick={() => handleChatSuggestion('Who can help with cybersecurity?')}
                className="bg-transparent border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 text-neutral-600 dark:text-neutral-400 px-2 py-1 rounded text-[10px] font-semibold transition-all"
              >
                Who knows cybersecurity?
              </button>
              <button
                onClick={() => handleChatSuggestion('Suggest developers for my MVP')}
                className="bg-transparent border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 text-neutral-600 dark:text-neutral-400 px-2 py-1 rounded text-[10px] font-semibold transition-all"
              >
                Suggest developers for my MVP
              </button>
            </div>

            {/* Chat Form */}
            <form onSubmit={handleChatSend} className="p-3 border-t border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask Discuss AI network assistant..."
                className="flex-1 bg-transparent border border-neutral-200 dark:border-neutral-800 focus:border-neutral-400 dark:focus:border-neutral-600 text-xs h-9"
                required
              />
              <Button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 h-9 w-9 p-0 flex items-center justify-center rounded"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        )}

        {/* 6. TRANSPARENCY LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="space-y-4 text-left">
            <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl p-5">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-1">AI Actions & Transparency Log</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                A listing of actions performed by AI on your behalf, explaining how your profile is processed.
              </p>
            </div>

            {loadingLogs ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-neutral-600" />
              </div>
            ) : actionLogs.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl">
                <Terminal className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">No Activity Logs</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  When you refresh matches, build teams, or interact with the AI assistant, records will appear here.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl overflow-hidden shadow-sm">
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {actionLogs.map((log) => (
                    <div key={log.id} className="p-4 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                      <div>
                        <span className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                          {log.type}
                        </span>
                        <p className="text-neutral-700 dark:text-neutral-300 font-semibold mt-1.5 leading-relaxed">
                          {log.description}
                        </p>
                      </div>
                      <span className="text-[10px] text-neutral-400 shrink-0 self-end sm:self-start">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
