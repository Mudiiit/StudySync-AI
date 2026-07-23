'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, UserPlus, ShieldAlert, Award, BookOpen, Clock, 
  MessageSquare, PlusCircle, Trash2, Shield, Calendar, CheckSquare, 
  Check, X, Search, Flame, Trophy, Volume2, UserCheck, Lock, Share2,
  Bell, Sparkles, Hash, Star, Radio, Activity, Target, Compass, 
  ChevronDown, UserMinus, ShieldX, GraduationCap, Link, Send, Eye,
  AlertTriangle, CheckCircle2, Circle, Loader2, Sparkle, Zap, ChevronRight
} from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import socialService, { FriendUser, FriendRequests, StudyGroup, GroupDetailsResponse, GroupChallenge, SharedNotebook } from '@/services/social';
import profileService, { UserProfile } from '@/services/profile';
import notesService from '@/services/notes';
import StudyCardModal from '@/components/social/StudyCardModal';
import { io } from 'socket.io-client';

type ActiveTab = 'friends' | 'groups' | 'challenges' | 'notebooks';

export default function SocialPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('friends');
  const [statusOpen, setStatusOpen] = useState(false);
  const [searchCategory, setSearchCategory] = useState<'username' | 'university' | 'course' | 'skills' | 'interests'>('username');

  // Profiles & Card states
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [showCard, setShowCard] = useState(false);

  // Side Drawer profile preview
  const [previewFriend, setPreviewFriend] = useState<FriendUser | null>(null);

  // Friends states
  const [friendsList, setFriendsList] = useState<FriendUser[]>([]);
  const [requests, setRequests] = useState<FriendRequests>({ incoming: [], outgoing: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  // Search autocomplete debouncing states
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Groups states
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [groupInvites, setGroupInvites] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupDetailsResponse | null>(null);
  const [challenges, setChallenges] = useState<GroupChallenge[]>([]);
  const [groupAnnounceTitle, setGroupAnnounceTitle] = useState('');
  const [groupAnnounceContent, setGroupAnnounceContent] = useState('');
  
  // Notebook states
  const [sharedNotebooks, setSharedNotebooks] = useState<SharedNotebook[]>([]);
  const [myNotebooks, setMyNotebooks] = useState<any[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState('');
  const [shareTargetUserId, setShareTargetUserId] = useState('');
  const [shareRole, setShareRole] = useState<'VIEWER' | 'COMMENTER' | 'EDITOR'>('VIEWER');

  // Resource sharing states
  const [sharedResources, setSharedResources] = useState<any[]>([]);

  // Creation forms
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [newChallengeType, setNewChallengeType] = useState('STUDY_HOURS');
  const [newChallengeTarget, setNewChallengeTarget] = useState(10);
  const [newChallengePeriod, setNewChallengePeriod] = useState('WEEKLY');

  // Loading indicator
  const [loading, setLoading] = useState(false);

  // Load friends and telemetry data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const prof = await profileService.getMyProfile();
      setMyProfile(prof);

      const friends = await socialService.getFriends();
      setFriendsList(friends);

      const reqs = await socialService.getRequests();
      setRequests(reqs);

      const blocks = await socialService.getBlocks();
      setBlockedUsers(blocks);

      const groupList = await socialService.getGroups();
      setGroups(groupList);

      const invites = await socialService.getInvites();
      setGroupInvites(invites);

      const sharedNotes = await socialService.getSharedNotebooks();
      setSharedNotebooks(sharedNotes);

      const myNotes = await notesService.getNotebooks();
      setMyNotebooks(myNotes || []);

      if (groupList.length > 0) {
        loadGroupDetails(groupList[0].id);
      }
    } catch (err: any) {
      showToast('Error loading social dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // WebSockets real-time sync hook
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';
    if (!token) return;

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('[Social WebSockets] Connected to real-time notification gateway');
    });

    socket.on('notification', (data: any) => {
      console.log('[Social WebSockets] Notification event received:', data);
      showToast(data.message || 'Collaboration event updated!', 'info');
      loadInitialData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Debounced search typing handler (~300ms)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await socialService.searchUsers(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search query failed:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const loadGroupDetails = async (groupId: string) => {
    try {
      const details = await socialService.getGroupDetails(groupId);
      setActiveGroup(details);

      const chals = await socialService.getGroupChallenges(groupId);
      setChallenges(chals);

      const resources = await socialService.getResources(groupId);
      setSharedResources(resources);
    } catch (err) {
      showToast('Error loading group metrics', 'error');
    }
  };

  // Avatar Fallback Gradient Component with premium glowing borders
  const AvatarImage = ({ src, name, online = false }: { src?: string; name: string; online?: boolean }) => {
    const [error, setError] = useState(false);
    const initials = name
      ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
      : 'SS';

    const gradients = [
      'from-violet-650 to-indigo-650',
      'from-emerald-650 to-teal-650',
      'from-pink-650 to-purple-650',
      'from-blue-650 to-cyan-650'
    ];
    const index = Math.abs(name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % gradients.length;
    const gradient = gradients[index];

    return (
      <div className="relative w-full h-full rounded-full p-[1.5px] bg-gradient-to-r from-zinc-800 to-zinc-900 group-hover:from-violet-500/40 group-hover:to-indigo-500/40 transition duration-300">
        <div className="w-full h-full rounded-full overflow-hidden bg-zinc-950 flex items-center justify-center relative">
          {src && !error ? (
            <img 
              src={src} 
              alt={name} 
              onError={() => setError(true)} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center text-[10px] font-black text-white`}>
              {initials}
            </div>
          )}
        </div>
        {online && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-zinc-950 shadow-sm animate-pulse" />
        )}
      </div>
    );
  };

  // Friends Handlers
  const handleSendFriendRequest = async (receiverId: string) => {
    try {
      await socialService.sendRequest(receiverId);
      showToast('Friend request sent!', 'success');
      const reqs = await socialService.getRequests();
      setRequests(reqs);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error sending request', 'error');
    }
  };

  const handleAcceptRequest = async (id: string) => {
    try {
      await socialService.acceptRequest(id);
      showToast('Friend request accepted!', 'success');
      loadInitialData();
    } catch (err) {
      showToast('Error accepting request', 'error');
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await socialService.rejectRequest(id);
      showToast('Request dismissed', 'success');
      const reqs = await socialService.getRequests();
      setRequests(reqs);
    } catch (err) {
      showToast('Error rejecting request', 'error');
    }
  };

  const handleCancelRequest = async (id: string) => {
    try {
      await socialService.cancelRequest(id);
      showToast('Outgoing request cancelled', 'info');
      const reqs = await socialService.getRequests();
      setRequests(reqs);
    } catch (err) {
      showToast('Error cancelling request', 'error');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await socialService.removeFriend(friendId);
      showToast('Friend removed', 'success');
      const friends = await socialService.getFriends();
      setFriendsList(friends);
    } catch (err) {
      showToast('Error removing friend', 'error');
    }
  };

  const handleBlockUser = async (blockedId: string) => {
    try {
      await socialService.blockUser(blockedId);
      showToast('User blocked successfully', 'success');
      loadInitialData();
    } catch (err) {
      showToast('Error blocking user', 'error');
    }
  };

  // Group creation
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const g = await socialService.createGroup(newGroupName, newGroupDesc);
      showToast('Study group created!', 'success');
      setNewGroupName('');
      setNewGroupDesc('');
      setShowCreateGroup(false);
      const groupList = await socialService.getGroups();
      setGroups(groupList);
      loadGroupDetails(g.id);
    } catch (err) {
      showToast('Error creating group', 'error');
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await socialService.acceptInvite(inviteId);
      showToast('Joined group successfully!', 'success');
      loadInitialData();
    } catch (err) {
      showToast('Error accepting invite', 'error');
    }
  };

  const handleCreateChallenge = async () => {
    if (!activeGroup || !newChallengeTitle.trim()) return;
    try {
      await socialService.createChallenge(activeGroup.id, {
        title: newChallengeTitle.trim(),
        type: newChallengeType,
        target: newChallengeTarget,
        period: newChallengePeriod
      });
      showToast('Milestone goal launched!', 'success');
      setNewChallengeTitle('');
      setShowCreateChallenge(false);
      loadGroupDetails(activeGroup.id);
    } catch (err) {
      showToast('Error launching milestone challenge', 'error');
    }
  };

  const handlePostAnnouncement = async () => {
    if (!activeGroup || !groupAnnounceTitle.trim() || !groupAnnounceContent.trim()) return;
    try {
      await socialService.postAnnouncement(activeGroup.id, {
        title: groupAnnounceTitle,
        content: groupAnnounceContent
      });
      showToast('Announcement posted!', 'success');
      setGroupAnnounceTitle('');
      setGroupAnnounceContent('');
      loadGroupDetails(activeGroup.id);
    } catch (err) {
      showToast('Failed posting announcement', 'error');
    }
  };

  const handleShareNotebook = async () => {
    if (!selectedNotebookId || !shareTargetUserId) {
      showToast('Configure notebook and companion first', 'error');
      return;
    }
    try {
      await socialService.shareNotebook(selectedNotebookId, {
        targetUserId: shareTargetUserId,
        role: shareRole
      });
      showToast('Notebook shared successfully!', 'success');
      setSelectedNotebookId('');
      setShareTargetUserId('');
      const sharedNotes = await socialService.getSharedNotebooks();
      setSharedNotebooks(sharedNotes);
    } catch (err) {
      showToast('Failed sharing notebook', 'error');
    }
  };

  // Filter search results
  const filteredSearchResults = useMemo(() => {
    return searchResults.filter(user => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      if (searchCategory === 'username') {
        return user.username.toLowerCase().includes(q) || user.displayName.toLowerCase().includes(q);
      }
      if (searchCategory === 'university') {
        return user.university?.toLowerCase().includes(q);
      }
      if (searchCategory === 'course') {
        return user.course?.toLowerCase().includes(q);
      }
      if (searchCategory === 'skills') {
        return user.skills?.some(s => s.toLowerCase().includes(q));
      }
      if (searchCategory === 'interests') {
        return user.interests?.some(i => i.toLowerCase().includes(q));
      }
      return true;
    });
  }, [searchResults, searchQuery, searchCategory]);

  return (
    <div className="flex-1 flex flex-col gap-8 p-6 max-w-7xl mx-auto w-full font-sans text-xs text-zinc-350 select-none bg-[#070708]/10 min-h-screen relative">
      
      {/* Dynamic light glows for multi-layer depth */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* 1. HEADER HERO PANEL */}
      <div className="relative overflow-hidden rounded-[32px] border border-zinc-900 bg-zinc-950/20 backdrop-blur-xl p-6 sm:p-8 flex flex-col gap-6 text-left shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-650/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-405">
                <Users className="h-4.5 w-4.5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Classroom Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Social Learning Workspace
            </h1>
            <p className="text-zinc-400 max-w-2xl text-[11px] leading-relaxed font-semibold">
              Coordinate study objectives with companions. Join group challenge sprints, share notes credentials, and track live presence updates instantly.
            </p>
          </div>
        </div>

        {/* Dynamic statistics KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-900">
          {[
            { label: 'Active Friends', val: `${friendsList.length} Learners`, color: 'text-violet-400', desc: 'Peer connections' },
            { label: 'Pending Invites', val: `${requests.incoming.length} Requests`, color: 'text-orange-400', desc: 'Awaiting action' },
            { label: 'Study Teamspaces', val: `${groups.length} Groups`, color: 'text-emerald-400', desc: 'Active workspaces' },
            { label: 'Notebook exchanges', val: `${sharedNotebooks.length} Shared`, color: 'text-cyan-400', desc: 'Notebook repositories' }
          ].map((stat, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-zinc-900/60 bg-zinc-950/40 hover:border-zinc-800/80 transition duration-300 flex flex-col justify-between gap-1 shadow-sm">
              <span className="text-[9.5px] uppercase font-black tracking-widest text-zinc-550 block">{stat.label}</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-lg font-black tracking-tight ${stat.color}`}>{stat.val}</span>
              </div>
              <span className="text-[9px] text-zinc-500 mt-1 block leading-tight font-medium">{stat.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs navigation row with indicator styling */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-0.5">
        <div className="flex gap-6">
          {(['friends', 'groups', 'challenges', 'notebooks'] as ActiveTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-xs font-black uppercase tracking-wider relative transition-all cursor-pointer focus:outline-none ${
                activeTab === tab ? 'text-violet-400' : 'text-zinc-550 hover:text-zinc-300'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500" />
              )}
            </button>
          ))}
        </div>
        
        {myProfile && (
          <button
            onClick={() => setShowCard(true)}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-550 hover:to-indigo-600 text-[10px] font-black text-white uppercase tracking-wider rounded-xl transition shadow-lg shrink-0 cursor-pointer focus:outline-none"
          >
            <Share2 className="w-3.5 h-3.5" /> Share Study Card
          </button>
        )}
      </div>

      {/* Grid splits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
        
        {/* Left column (8/12) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* TAB 1: FRIENDS */}
          {activeTab === 'friends' && (
            <div className="space-y-6">
              
              {/* Autocomplete Search */}
              <div className="bg-zinc-950/20 border border-zinc-900 p-5 rounded-3xl space-y-4 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/10 via-transparent to-transparent pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Search Classroom</h3>
                  
                  <div className="flex flex-wrap gap-1">
                    {(['username', 'university', 'course', 'skills', 'interests'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSearchCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider border transition cursor-pointer focus:outline-none ${
                          searchCategory === cat
                            ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                            : 'bg-zinc-900/50 border-zinc-850 text-zinc-500 hover:text-zinc-350'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-550 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder={`Search by ${searchCategory}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-900 rounded-xl py-3 pl-10 pr-4 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/20 font-semibold"
                  />
                </div>

                {searchLoading ? (
                  <div className="flex items-center gap-2 text-zinc-500 pl-2">
                    <Loader2 className="w-4.5 h-4.5 animate-spin text-violet-500" />
                    <span>Querying classmate accounts...</span>
                  </div>
                ) : filteredSearchResults.length > 0 ? (
                  <div className="divide-y divide-zinc-900/60 pt-2 space-y-3">
                    {filteredSearchResults.map(user => (
                      <div key={user.id} className="flex justify-between items-center pt-3 text-xs bg-zinc-950/40 border border-zinc-900/60 p-3.5 rounded-2xl hover:border-zinc-800 transition duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full shrink-0">
                            <AvatarImage src={user.avatarUrl} name={user.displayName} />
                          </div>
                          
                          <div className="text-left space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-200 block">{user.displayName}</span>
                              <span className="text-[8px] font-black bg-zinc-900 border border-zinc-850 text-zinc-500 px-1.5 py-0.5 rounded">@{user.username}</span>
                            </div>
                            <span className="text-[9px] text-zinc-500 block">
                              {user.university} • {user.course}
                            </span>
                          </div>
                        </div>

                        {user.relationship === 'NONE' && (
                          <button
                            onClick={() => handleSendFriendRequest(user.id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-violet-650 hover:bg-violet-600 text-[9px] font-black uppercase tracking-wider text-white rounded-xl transition cursor-pointer focus:outline-none"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Send Request
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : searchQuery.trim() && (
                  <div className="p-6 bg-zinc-950/20 border border-zinc-900 rounded-2xl text-center text-zinc-500 font-bold">
                    No learners found matching query credentials.
                  </div>
                )}
              </div>

              {/* Dedicated Pending Invitations Section */}
              <div className="bg-zinc-950/20 border border-zinc-900 p-5 rounded-3xl space-y-4 shadow-xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
                  <UserCheck className="w-4 h-4 text-violet-400" />
                  Pending Invitations ({requests.incoming.length})
                </h3>

                {requests.incoming.length === 0 ? (
                  <div className="py-6 text-center text-zinc-550 font-bold bg-zinc-950/10 border border-zinc-900 border-dashed rounded-2xl">
                    No pending invitations.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {requests.incoming.map(req => (
                      <div key={req.id} className="bg-zinc-950/40 border border-zinc-900 p-3 rounded-2xl flex justify-between items-center text-xs hover:border-zinc-800 transition duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full shrink-0">
                            <AvatarImage src={req.avatarUrl} name={req.displayName} />
                          </div>
                          <div className="text-left">
                            <span className="font-bold text-zinc-200 block text-xs">{req.displayName}</span>
                            <span className="text-[9px] text-zinc-550 block">@{req.username}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="p-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/25 text-emerald-400 rounded-xl cursor-pointer transition focus:outline-none"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            className="p-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/25 text-rose-455 rounded-xl cursor-pointer transition focus:outline-none"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dedicated Sent Requests Section */}
              <div className="bg-zinc-950/20 border border-zinc-900 p-5 rounded-3xl space-y-4 shadow-xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
                  <Send className="w-4 h-4 text-violet-400" />
                  Sent Requests ({requests.outgoing.length})
                </h3>

                {requests.outgoing.length === 0 ? (
                  <div className="py-6 text-center text-zinc-550 font-bold bg-zinc-950/10 border border-zinc-900 border-dashed rounded-2xl">
                    No outgoing pending requests.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {requests.outgoing.map(req => (
                      <div key={req.id} className="bg-zinc-950/40 border border-zinc-900 p-3 rounded-2xl flex justify-between items-center text-xs hover:border-zinc-800 transition duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full shrink-0">
                            <AvatarImage src={req.avatarUrl} name={req.displayName} />
                          </div>
                          <div className="text-left">
                            <span className="font-bold text-zinc-200 block text-xs">{req.displayName}</span>
                            <span className="text-[9px] text-zinc-550 block">@{req.username}</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleCancelRequest(req.id)}
                          className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 rounded-xl text-[9px] uppercase font-black tracking-wider cursor-pointer transition focus:outline-none"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Friends directory list */}
              <div className="bg-zinc-950/20 border border-zinc-900 p-5 rounded-3xl space-y-4 shadow-xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-900 pb-3">
                  All Classmates ({friendsList.length})
                </h3>

                {friendsList.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-900 rounded-3xl p-8 bg-zinc-950/20 flex flex-col items-center justify-center gap-3">
                    <Users className="w-8 h-8 text-zinc-650" />
                    <div>
                      <p className="text-xs font-bold text-zinc-400">Connect with classmates to compare progress.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {friendsList.map(friend => (
                      <div 
                        key={friend.id} 
                        className="group bg-zinc-950/40 border border-zinc-900 p-4.5 rounded-[24px] flex flex-col justify-between space-y-4 hover:border-violet-500/25 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)] transition duration-300 relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-650 to-indigo-650 opacity-50" />
                        
                        <div className="flex justify-between items-start pt-1">
                          <div 
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => setPreviewFriend(friend)}
                          >
                            <div className="relative shrink-0 w-11 h-11">
                              <AvatarImage src={friend.avatarUrl} name={friend.displayName} online={friend.status === 'ONLINE'} />
                            </div>
                            
                            <div className="text-left">
                              <span className="font-black text-zinc-200 block text-xs group-hover:text-violet-400 transition">{friend.displayName}</span>
                              <span className="text-[9px] text-zinc-550 block">@{friend.username}</span>
                              
                              <span className={`inline-block text-[8px] font-black uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full border ${
                                friend.status === 'ONLINE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                friend.status === 'STUDYING' || friend.status === 'IN_POMODORO' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                'bg-zinc-900/60 border-zinc-800 text-zinc-500'
                              }`}>
                                {friend.status.replace('_', ' ').toLowerCase()}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition duration-200 shrink-0">
                            <button
                              onClick={() => handleRemoveFriend(friend.id)}
                              className="p-1.5 hover:bg-zinc-900 text-zinc-550 hover:text-red-400 rounded-lg transition cursor-pointer focus:outline-none"
                              title="Remove Friend"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleBlockUser(friend.id)}
                              className="p-1.5 hover:bg-zinc-900 text-zinc-550 hover:text-amber-550 rounded-lg transition cursor-pointer focus:outline-none"
                              title="Block User"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Friend's mini profile card stats */}
                        <div className="flex justify-between items-center border-t border-zinc-900/80 pt-3 text-[10px] text-zinc-400">
                          <div className="flex gap-3">
                            <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" /> {friend.streak} Days</span>
                            <span className="flex items-center gap-1"><Award className="w-3 h-3 text-violet-400" /> Lvl {friend.level}</span>
                          </div>
                          
                          <button
                            onClick={() => {
                              showToast(`Study invitation sent to @${friend.username}!`, 'success');
                            }}
                            className="text-[9px] font-black text-violet-400 hover:text-violet-300 uppercase tracking-wider shrink-0 cursor-pointer focus:outline-none"
                          >
                            Invite to Study
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: STUDY GROUPS */}
          {activeTab === 'groups' && (
            <div className="space-y-6">
              <div className="bg-zinc-950/20 border border-zinc-900 p-5 rounded-3xl space-y-5 shadow-xl">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Study Directory</h3>
                    <p className="text-[9px] text-zinc-500">Create teamspaces to pool XP logs and complete goals together.</p>
                  </div>
                  
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-violet-650 hover:bg-violet-600 text-xs font-black text-white rounded-xl transition cursor-pointer focus:outline-none"
                  >
                    <PlusCircle className="w-4 h-4" /> Create Group
                  </button>
                </div>

                {groups.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-900 rounded-3xl p-8 bg-zinc-950/20 flex flex-col items-center justify-center gap-3">
                    <Compass className="w-8 h-8 text-zinc-650" />
                    <p className="text-xs font-bold text-zinc-400">Create your first study group and invite friends.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map(g => (
                      <div key={g.id} className={`group border rounded-2xl p-4 transition relative overflow-hidden flex flex-col justify-between min-h-[160px] ${
                        activeGroup?.id === g.id
                          ? 'bg-violet-950/10 border-violet-500/30 text-violet-305 border-violet-500/40'
                          : 'bg-zinc-950 border-zinc-850/80 hover:border-zinc-800 text-zinc-450'
                      }`}>
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500/40 to-violet-500/40" />
                        
                        <div className="pt-2 text-left space-y-1">
                          <span className="font-extrabold text-zinc-200 block text-xs">{g.name}</span>
                          <p className="text-[10px] text-zinc-500 line-clamp-2">{g.description || 'No focus description set.'}</p>
                        </div>

                        <div className="flex justify-between items-center border-t border-zinc-900 pt-3 mt-4">
                          <button
                            onClick={() => loadGroupDetails(g.id)}
                            className="text-[9px] font-black text-violet-405 hover:text-violet-300 uppercase tracking-wider cursor-pointer focus:outline-none"
                          >
                            Open Workspace
                          </button>
                          <span className="text-[8.5px] font-bold text-zinc-550 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded">
                            Owner ID: {g.ownerId.slice(0, 5)}...
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CHALLENGES */}
          {activeTab === 'challenges' && (
            <div className="space-y-6">
              <div className="bg-zinc-950/20 border border-zinc-900 p-5 rounded-3xl space-y-5 shadow-xl">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Team Challenges</h3>
                    <p className="text-[9px] text-zinc-550">Review dynamic group targets and current standings.</p>
                  </div>
                  {activeGroup && (
                    <button
                      onClick={() => setShowCreateChallenge(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-650 hover:bg-violet-600 text-xs font-black rounded-xl transition cursor-pointer text-white focus:outline-none"
                    >
                      <PlusCircle className="w-4 h-4" /> Create Challenge
                    </button>
                  )}
                </div>

                {challenges.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 font-bold">No active group challenges listed.</div>
                ) : (
                  <div className="space-y-4">
                    {challenges.map(chal => (
                      <div key={chal.id} className="p-4 bg-zinc-950 border border-zinc-900 rounded-3xl space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-extrabold text-zinc-200 block text-xs">{chal.title}</span>
                            <span className="text-[9px] font-black uppercase text-violet-405 tracking-wider">{chal.type} • {chal.period}</span>
                          </div>
                          <span className="text-[9.5px] font-bold text-zinc-500">Target: {chal.target} units</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: NOTEBOOKS EXCHANGE */}
          {activeTab === 'notebooks' && (
            <div className="space-y-6">
              <div className="bg-zinc-950/20 border border-zinc-900 p-5 rounded-3xl space-y-5 shadow-xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-900 pb-3">Share Notebooks</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[9.5px] uppercase font-bold text-zinc-550">Select Notebook</label>
                    <select
                      value={selectedNotebookId}
                      onChange={(e) => setSelectedNotebookId(e.target.value)}
                      className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 text-xs text-zinc-400 focus:outline-none"
                    >
                      <option value="">Choose...</option>
                      {myNotebooks.map(nb => (
                        <option key={nb.id} value={nb.id}>{nb.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[9.5px] uppercase font-bold text-zinc-550">Share with companion</label>
                    <select
                      value={shareTargetUserId}
                      onChange={(e) => setShareTargetUserId(e.target.value)}
                      className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 text-xs text-zinc-400 focus:outline-none"
                    >
                      <option value="">Select Friend...</option>
                      {friendsList.map(fr => (
                        <option key={fr.id} value={fr.id}>{fr.displayName} (@{fr.username})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-zinc-900">
                  <button
                    onClick={handleShareNotebook}
                    className="px-6 py-2.5 bg-violet-650 hover:bg-violet-600 text-xs font-black uppercase tracking-wider text-white rounded-xl transition cursor-pointer focus:outline-none"
                  >
                    Share Notebook
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Sidebar (4/12) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Active Classmates Leaderboard standings */}
          <div className="bg-zinc-950/20 border border-zinc-900 p-5 rounded-3xl space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Trophy className="w-4 h-4 text-violet-400" />
              Group Standings
            </h3>
            
            {activeGroup?.leaderboard && activeGroup.leaderboard.length > 0 ? (
              <div className="space-y-3">
                {activeGroup.leaderboard.map((user, idx) => (
                  <div key={user.userId} className="flex justify-between items-center p-3 bg-zinc-950/40 border border-zinc-900/80 rounded-2xl hover:border-zinc-800 transition duration-300">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-zinc-550 font-black">{idx + 1}</span>
                      <div className="w-8 h-8 rounded-full shrink-0">
                        <AvatarImage src={user.avatarUrl} name={user.displayName} />
                      </div>
                      <span className="font-bold text-zinc-200 text-xs block truncate max-w-[100px]">{user.displayName}</span>
                    </div>

                    <span className="font-black text-violet-405 shrink-0">{user.xp} XP</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-zinc-550 font-bold bg-zinc-950/10 border border-zinc-900 border-dashed rounded-2xl">
                No standings recorded.
              </div>
            )}
          </div>

          {/* Activity Logs feed */}
          <div className="bg-zinc-950/20 border border-zinc-900 p-5 rounded-3xl space-y-4 shadow-xl relative">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Activity className="w-4 h-4 text-violet-400 animate-pulse" />
              Recent Activity
            </h3>
            <div className="space-y-4 text-left border-l border-zinc-900 pl-3">
              {[
                { time: '10 mins ago', name: 'Aryan Mehta', log: 'uploaded Physics Study Notes', color: 'bg-violet-500' },
                { time: '1 hour ago', name: 'Priya Sharma', log: 'reached Diamond League rank', color: 'bg-indigo-550' },
                { time: '3 hours ago', name: 'Neha Kapoor', log: 'completed Operating Systems Quiz', color: 'bg-fuchsia-500' },
                { time: 'Yesterday', name: 'Rohan Verma', log: 'logged 3.5h study session', color: 'bg-emerald-500' }
              ].map((activity, idx) => (
                <div key={idx} className="relative text-[10px] text-zinc-450 space-y-1">
                  <div className={`absolute -left-[17px] top-1 w-2 h-2 rounded-full border border-zinc-950 ${activity.color}`} />
                  <span className="text-zinc-550 block text-[8px] font-black uppercase tracking-wider font-mono">{activity.time}</span>
                  <span className="text-zinc-300 font-extrabold">{activity.name}</span> <span className="text-zinc-500 font-semibold">{activity.log}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Profile Side Drawer Panel with visual layouts */}
      {previewFriend && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-900 shadow-2xl p-6 flex flex-col justify-between animate-slideLeft">
          <div className="space-y-6 text-left">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-violet-400">Learner Profile</h3>
              <button 
                onClick={() => setPreviewFriend(null)}
                className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-20 h-20 rounded-full shrink-0">
                <AvatarImage src={previewFriend.avatarUrl} name={previewFriend.displayName} online={previewFriend.status === 'ONLINE'} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">{previewFriend.displayName}</h4>
                <span className="text-[10px] text-zinc-500">@{previewFriend.username}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-zinc-900/40 border border-zinc-900 rounded-2xl flex flex-col gap-0.5">
                <span className="text-[8px] font-black uppercase text-zinc-550">Level progress</span>
                <span className="text-xs font-black text-zinc-250">Level {previewFriend.level}</span>
              </div>
              <div className="p-3.5 bg-zinc-900/40 border border-zinc-900 rounded-2xl flex flex-col gap-0.5">
                <span className="text-[8px] font-black uppercase text-zinc-550">Study Streak</span>
                <span className="text-xs font-black text-orange-450">{previewFriend.streak} Days</span>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-900/40 border border-zinc-900 rounded-2xl flex flex-col gap-1">
              <span className="text-[8px] font-black uppercase text-zinc-550">Academic stats</span>
              <span className="text-[10px] text-zinc-400 font-semibold">University: {previewFriend.university || 'N/A'}</span>
              <span className="text-[10px] text-zinc-400 font-semibold">Course: {previewFriend.course || 'N/A'}</span>
            </div>
          </div>

          <div className="flex gap-2 border-t border-zinc-900 pt-4">
            <button
              onClick={() => {
                showToast(`Study invite sent to ${previewFriend.displayName}`, 'success');
                setPreviewFriend(null);
              }}
              className="flex-1 py-3.5 bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-600 hover:to-indigo-600 text-xs font-black uppercase tracking-wider text-white rounded-xl transition cursor-pointer text-center focus:outline-none"
            >
              Invite to Study
            </button>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl relative animate-scaleUp">
            <h3 className="font-extrabold text-zinc-200 text-sm">Create Study Group</h3>
            
            <div className="space-y-3 text-left">
              <input
                type="text"
                placeholder="Group Name (e.g. DSA Practice)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-violet-500/50 text-zinc-305"
              />
              <textarea
                placeholder="Description / Subject focus..."
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-violet-500/50 resize-none text-zinc-305"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="px-4 py-2 hover:bg-zinc-800 text-zinc-450 text-xs font-bold rounded-xl transition cursor-pointer focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="px-4 py-2 bg-violet-650 hover:bg-violet-600 text-xs font-black text-white rounded-xl transition cursor-pointer focus:outline-none"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Challenge Modal */}
      {showCreateChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl relative animate-scaleUp">
            <h3 className="font-extrabold text-zinc-200 text-sm">Create Group Milestone</h3>
            
            <div className="space-y-3 text-left">
              <input
                type="text"
                placeholder="Challenge Title (e.g. Study 20 Hours)"
                value={newChallengeTitle}
                onChange={(e) => setNewChallengeTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-violet-500/50 text-zinc-305"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newChallengeType}
                  onChange={(e) => setNewChallengeType(e.target.value)}
                  className="bg-zinc-950 border border-zinc-850 text-xs text-zinc-300 font-bold px-3 py-2 rounded-xl focus:outline-none"
                >
                  <option value="STUDY_HOURS">Study Hours</option>
                  <option value="FLASHCARDS">Flashcards Completed</option>
                  <option value="NOTES">Notes Generated</option>
                  <option value="QUIZZES">Quizzes Completed</option>
                </select>

                <select
                  value={newChallengePeriod}
                  onChange={(e) => setNewChallengePeriod(e.target.value)}
                  className="bg-zinc-950 border border-zinc-850 text-xs text-zinc-300 font-bold px-3 py-2 rounded-xl focus:outline-none"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <input
                type="number"
                placeholder="Target Count (e.g. 20)"
                value={newChallengeTarget}
                onChange={(e) => setNewChallengeTarget(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-violet-500/50 text-zinc-305"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreateChallenge(false)}
                className="px-4 py-2 hover:bg-zinc-800 text-zinc-450 text-xs font-bold rounded-xl transition cursor-pointer focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChallenge}
                className="px-4 py-2 bg-violet-650 hover:bg-violet-600 text-xs font-black text-white rounded-xl transition cursor-pointer focus:outline-none"
              >
                Launch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shareable Study Card Modal */}
      {myProfile && (
        <StudyCardModal
          isOpen={showCard}
          onClose={() => setShowCard(false)}
          displayName={myProfile.displayName || myProfile.firstName || 'Learner'}
          username={myProfile.username || 'learner'}
          streak={myProfile.stats?.streak || 0}
          level={myProfile.level || 1}
          studyHours={myProfile.stats?.studyHours || 0}
          weeklyRank={myProfile.weeklyRank || 0}
          notesCount={myProfile.stats?.notesCount || 0}
          flashcardsCount={myProfile.stats?.flashcardsCount || 0}
        />
      )}

    </div>
  );
}
