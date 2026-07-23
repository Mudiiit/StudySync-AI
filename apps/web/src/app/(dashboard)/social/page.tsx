'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, ShieldAlert, Award, BookOpen, Clock, 
  MessageSquare, PlusCircle, Trash2, Shield, Calendar, CheckSquare, 
  Check, X, Search, Flame, Trophy, Volume2, UserCheck, Lock, Share2,
  Bell, Sparkles, Hash, Star, Radio, Activity, Target, Compass, 
  ChevronDown, UserMinus, ShieldX, GraduationCap, Link 
} from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import socialService, { FriendUser, FriendRequests, StudyGroup, GroupDetailsResponse, GroupChallenge, SharedNotebook, GroupAnnouncement } from '@/services/social';
import profileService, { UserProfile } from '@/services/profile';
import notesService from '@/services/notes';
import StudyCardModal from '@/components/social/StudyCardModal';

type ActiveTab = 'friends' | 'groups' | 'challenges' | 'notebooks';

export default function SocialPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('friends');
  const [statusOpen, setStatusOpen] = useState(false);
  const [searchCategory, setSearchCategory] = useState<'username' | 'university' | 'course' | 'skills' | 'interests'>('username');

  // Profiles & Card states
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [showCard, setShowCard] = useState(false);

  // Friends states
  const [friendsList, setFriendsList] = useState<FriendUser[]>([]);
  const [requests, setRequests] = useState<FriendRequests>({ incoming: [], outgoing: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

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

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const prof = await profileService.getMyProfile();
      setMyProfile(prof);

      // Friends
      const friends = await socialService.getFriends();
      setFriendsList(friends);

      const reqs = await socialService.getRequests();
      setRequests(reqs);

      const blocks = await socialService.getBlocks();
      setBlockedUsers(blocks);

      // Groups
      const groupList = await socialService.getGroups();
      setGroups(groupList);

      const invites = await socialService.getInvites();
      setGroupInvites(invites);

      // Notebooks
      const sharedNotes = await socialService.getSharedNotebooks();
      setSharedNotebooks(sharedNotes);

      // My Notebooks for sharing
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

  // ==========================================
  // FRIENDS HANDLERS
  // ==========================================
  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await socialService.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (err) {
      showToast('Search request failed', 'error');
    }
  };

  const handleSendFriendRequest = async (receiverId: string) => {
    try {
      await socialService.sendRequest(receiverId);
      showToast('Friend request sent!', 'success');
      // Refresh
      const reqs = await socialService.getRequests();
      setRequests(reqs);
      handleSearchUsers();
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

  const handleUnblockUser = async (blockedId: string) => {
    try {
      await socialService.unblockUser(blockedId);
      showToast('User unblocked', 'success');
      const blocks = await socialService.getBlocks();
      setBlockedUsers(blocks);
    } catch (err) {
      showToast('Error unblocking user', 'error');
    }
  };

  // ==========================================
  // STUDY GROUPS HANDLERS
  // ==========================================
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

  const handleRejectInvite = async (inviteId: string) => {
    try {
      await socialService.rejectInvite(inviteId);
      showToast('Invite rejected', 'success');
      const invites = await socialService.getInvites();
      setGroupInvites(invites);
    } catch (err) {
      showToast('Error rejecting invite', 'error');
    }
  };

  const handleInviteMember = async (friendId: string) => {
    if (!activeGroup) return;
    try {
      await socialService.inviteFriend(activeGroup.id, friendId);
      showToast('Invitation dispatched!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error inviting friend', 'error');
    }
  };

  const handleKickMember = async (targetId: string) => {
    if (!activeGroup) return;
    try {
      await socialService.kickMember(activeGroup.id, targetId);
      showToast('Member removed from group', 'success');
      loadGroupDetails(activeGroup.id);
    } catch (err) {
      showToast('Error kicking member', 'error');
    }
  };

  const handlePromoteAdmin = async (targetUserId: string) => {
    if (!activeGroup) return;
    try {
      await socialService.updateRole(activeGroup.id, targetUserId, 'ADMIN');
      showToast('Role updated to admin', 'success');
      loadGroupDetails(activeGroup.id);
    } catch (err) {
      showToast('Error promotion admin', 'error');
    }
  };

  const handleDemoteMember = async (targetUserId: string) => {
    if (!activeGroup) return;
    try {
      await socialService.updateRole(activeGroup.id, targetUserId, 'MEMBER');
      showToast('Role demoted to member', 'success');
      loadGroupDetails(activeGroup.id);
    } catch (err) {
      showToast('Error demoting member', 'error');
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
      showToast('Error publishing announcement', 'error');
    }
  };

  const handleCreateChallenge = async () => {
    if (!activeGroup || !newChallengeTitle.trim()) return;
    try {
      await socialService.createChallenge(activeGroup.id, {
        title: newChallengeTitle,
        type: newChallengeType,
        target: Number(newChallengeTarget),
        period: newChallengePeriod
      });
      showToast('Challenge created!', 'success');
      setNewChallengeTitle('');
      setShowCreateChallenge(false);
      loadGroupDetails(activeGroup.id);
    } catch (err) {
      showToast('Error creating challenge', 'error');
    }
  };

  // ==========================================
  // NOTEBOOK HANDLERS
  // ==========================================
  const handleShareNotebook = async () => {
    if (!selectedNotebookId || !shareTargetUserId) return;
    try {
      await socialService.shareNotebook(selectedNotebookId, {
        targetUserId: shareTargetUserId,
        role: shareRole
      });
      showToast('Notebook shared successfully!', 'success');
      setShareTargetUserId('');
      const sharedNotes = await socialService.getSharedNotebooks();
      setSharedNotebooks(sharedNotes);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error sharing notebook', 'error');
    }
  };

  const handleRevokeShare = async (nbId: string, targetUid: string) => {
    try {
      await socialService.revokeShare(nbId, targetUid);
      showToast('Access revoked', 'success');
      const sharedNotes = await socialService.getSharedNotebooks();
      setSharedNotebooks(sharedNotes);
    } catch (err) {
      showToast('Error revoking share', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6 animate-pulse">
        <div className="h-28 bg-zinc-900 border border-zinc-800 rounded-3xl" />
        <div className="h-10 w-96 bg-zinc-900 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-zinc-900 border border-zinc-800 rounded-2xl" />
            <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <div className="h-32 bg-zinc-900 border border-zinc-800 rounded-2xl" />
            <div className="h-48 bg-zinc-900 border border-zinc-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // Filter search results locally
  const filteredSearchResults = searchResults.filter(user => {
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

  const onlineFriendsCount = friendsList.filter(f => f.status !== 'OFFLINE').length;
  const pendingRequestsCount = requests.incoming.length + groupInvites.length;

  const handleStatusChange = async (status: string) => {
    try {
      await socialService.heartbeat(status);
      setMyProfile(prev => prev ? { ...prev, status } : null);
      setStatusOpen(false);
      showToast(`Status updated to ${status.replace('_', ' ').toLowerCase()}`, 'success');
    } catch (err) {
      showToast('Error updating status', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6">
      
      {/* AAA Interactive Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-950/40 via-zinc-900 to-zinc-950 border border-zinc-800/80 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.06),transparent_45%)]" />
        
        <div className="flex items-center gap-4 relative z-10">
          {/* User Avatar with status pulse */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-0.5 shadow-lg">
              <div className="w-full h-full rounded-2xl bg-zinc-950 p-0.5 overflow-hidden flex items-center justify-center">
                {myProfile?.avatarUrl ? (
                  <img src={myProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <GraduationCap className="w-6 h-6 text-violet-400" />
                )}
              </div>
            </div>
            
            {/* Status dot */}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-950 flex items-center justify-center cursor-pointer ${
              myProfile?.status === 'ONLINE' ? 'bg-emerald-500' :
              myProfile?.status === 'STUDYING' || myProfile?.status === 'IN_POMODORO' ? 'bg-amber-500' :
              myProfile?.status === 'TAKING_QUIZ' ? 'bg-pink-500' :
              myProfile?.status === 'READING_NOTES' ? 'bg-blue-400' :
              myProfile?.status === 'IDLE' ? 'bg-yellow-500' : 'bg-zinc-650'
            }`}
              onClick={() => setStatusOpen(!statusOpen)}
              title="Set Custom Status"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-zinc-100">
                Hello, {myProfile?.displayName || myProfile?.firstName || 'Learner'}!
              </span>
              <span className="text-[9px] font-black bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-md uppercase tracking-wider">
                Lvl {myProfile?.level || 1}
              </span>
            </div>

            {/* Status Selector dropdown */}
            <div className="relative">
              <button 
                onClick={() => setStatusOpen(!statusOpen)}
                className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-lg cursor-pointer"
              >
                <Radio className="w-3 h-3 text-violet-400" />
                <span>Status: <span className="font-extrabold text-zinc-300">{myProfile?.status?.replace('_', ' ') || 'OFFLINE'}</span></span>
                <ChevronDown className="w-3 h-3 text-zinc-550" />
              </button>

              {statusOpen && (
                <div className="absolute left-0 mt-1.5 w-40 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1 z-50 animate-fadeIn">
                  {[
                    { label: 'Online', value: 'ONLINE', color: 'bg-emerald-500' },
                    { label: 'Studying', value: 'STUDYING', color: 'bg-amber-500' },
                    { label: 'In Pomodoro', value: 'IN_POMODORO', color: 'bg-amber-600' },
                    { label: 'Taking Quiz', value: 'TAKING_QUIZ', color: 'bg-pink-500' },
                    { label: 'Reading Notes', value: 'READING_NOTES', color: 'bg-blue-400' },
                    { label: 'Idle', value: 'IDLE', color: 'bg-yellow-500' },
                    { label: 'Offline', value: 'OFFLINE', color: 'bg-zinc-600' }
                  ].map(statusItem => (
                    <button
                      key={statusItem.value}
                      onClick={() => handleStatusChange(statusItem.value)}
                      className="w-full text-left px-2.5 py-1.5 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <span className={`w-2 h-2 rounded-full ${statusItem.color}`} />
                      {statusItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Communities stats grid summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 z-10 w-full md:w-auto">
          {[
            { label: 'Friends Online', value: `${onlineFriendsCount}/${friendsList.length}`, icon: Users, color: 'text-violet-400 bg-violet-500/5' },
            { label: 'Study Groups', value: groups.length, icon: Compass, color: 'text-indigo-400 bg-indigo-500/5' },
            { label: 'Active Milestones', value: challenges.length, icon: Target, color: 'text-emerald-400 bg-emerald-500/5' },
            { label: 'Alerts & Invites', value: pendingRequestsCount, icon: Bell, color: pendingRequestsCount > 0 ? 'text-amber-400 bg-amber-500/5 animate-pulse' : 'text-zinc-500 bg-zinc-900/40' }
          ].map((stat, idx) => {
            const IconComp = stat.icon;
            return (
              <div key={idx} className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex flex-col justify-between min-w-[90px] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                  <div className={`p-1.5 rounded-lg ${stat.color}`}>
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <span className="text-xs font-black text-zinc-150 mt-1 block">{stat.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation tabs row */}
      <div className="flex items-center justify-between border-b border-zinc-850 gap-4">
        <div className="flex gap-4">
          {(['friends', 'groups', 'challenges', 'notebooks'] as ActiveTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-xs font-bold uppercase tracking-wider relative transition cursor-pointer ${
                activeTab === tab ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400 animate-slideRight" />
              )}
            </button>
          ))}
        </div>
        
        {myProfile && (
          <button
            onClick={() => setShowCard(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-600 hover:to-indigo-600 text-[10px] font-extrabold rounded-xl transition shadow-lg shrink-0 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" /> Export Card
          </button>
        )}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Modules dashboards */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ==================================================
              FRIENDS TAB REDESIGN
              ================================================== */}
          {activeTab === 'friends' && (
            <div className="space-y-6">
              
              {/* Autocomplete Search learners */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Search Learners</h2>
                  
                  {/* Category filters */}
                  <div className="flex gap-1">
                    {(['username', 'university', 'course', 'skills', 'interests'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSearchCategory(cat)}
                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border transition cursor-pointer ${
                          searchCategory === cat
                            ? 'bg-violet-950/20 border-violet-500/40 text-violet-300'
                            : 'bg-zinc-950 border-zinc-850 text-zinc-550 hover:text-zinc-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <Search className="w-4 h-4 text-zinc-550 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder={`Search by ${searchCategory}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <button
                    onClick={handleSearchUsers}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Search
                  </button>
                </div>

                {/* Autocomplete dynamic result shelf */}
                {filteredSearchResults.length > 0 && (
                  <div className="divide-y divide-zinc-850/40 pt-2 space-y-3">
                    {filteredSearchResults.map(user => (
                      <div key={user.id} className="flex justify-between items-center pt-3 text-xs bg-zinc-950/20 border border-zinc-850/40 p-3 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-850 overflow-hidden flex items-center justify-center border border-zinc-800 shrink-0">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-4 h-4 text-zinc-500" />
                            )}
                          </div>
                          
                          <div className="text-left space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-200 block">{user.displayName}</span>
                              <span className="text-[8px] font-black bg-zinc-850 text-zinc-550 px-1 py-0.5 rounded">@{user.username}</span>
                            </div>
                            
                            {/* Academic metadata indicators */}
                            <span className="text-[9px] text-zinc-500 block">
                              {user.university} • {user.course}
                            </span>

                            {user.skills && (
                              <div className="flex gap-1.5 flex-wrap pt-1">
                                {user.skills.map(s => (
                                  <span key={s} className="px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-[8px] text-violet-400">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {user.relationship === 'NONE' && (
                          <button
                            onClick={() => handleSendFriendRequest(user.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-650 hover:bg-violet-600 text-[10px] font-bold rounded-lg transition cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Add
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Friends lists directory */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">All Friends ({friendsList.length})</h2>
                </div>

                {friendsList.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-800 rounded-3xl p-8 bg-zinc-950/20 flex flex-col items-center justify-center gap-3">
                    <div className="p-4 bg-zinc-900/60 border border-zinc-850 rounded-2xl">
                      <Users className="w-8 h-8 text-zinc-650" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-400">Connect with classmates to compare progress and motivate each other.</p>
                      <p className="text-[10px] text-zinc-550 mt-1 max-w-sm mx-auto">Use the search area above to look up user tags, skills, or courses and send your first request.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {friendsList.map(friend => (
                      <div key={friend.id} className="group bg-zinc-950 border border-zinc-850/80 p-4 rounded-2xl flex flex-col justify-between space-y-4 hover:border-violet-500/40 hover:shadow-lg transition relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-600/40 to-indigo-650/40" />
                        
                        <div className="flex justify-between items-start pt-1">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-11 h-11 rounded-full bg-zinc-900 overflow-hidden flex items-center justify-center border border-zinc-850">
                                {friend.avatarUrl ? (
                                  <img src={friend.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Users className="w-5 h-5 text-zinc-650" />
                                )}
                              </div>
                              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-950 ${
                                friend.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' :
                                friend.status === 'STUDYING' || friend.status === 'IN_POMODORO' ? 'bg-amber-500' :
                                friend.status === 'TAKING_QUIZ' ? 'bg-pink-500' :
                                friend.status === 'READING_NOTES' ? 'bg-blue-400' :
                                friend.status === 'IDLE' ? 'bg-yellow-500' : 'bg-zinc-650'
                              }`} />
                            </div>
                            <div className="text-left">
                              <span className="font-extrabold text-zinc-200 block text-xs">{friend.displayName}</span>
                              <span className="text-[9px] text-zinc-550 block">@{friend.username}</span>
                              
                              {/* Status text */}
                              <span className={`inline-block text-[8px] font-black uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded border ${
                                friend.status === 'ONLINE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                friend.status === 'STUDYING' || friend.status === 'IN_POMODORO' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                friend.status === 'TAKING_QUIZ' ? 'bg-pink-500/10 border-pink-500/20 text-pink-400' : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
                              }`}>
                                {friend.status.replace('_', ' ').toLowerCase()}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition duration-200">
                            <button
                              onClick={() => handleRemoveFriend(friend.id)}
                              className="p-1.5 hover:bg-zinc-900 text-zinc-550 hover:text-red-400 rounded-lg transition cursor-pointer animate-fadeIn"
                              title="Remove Friend"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleBlockUser(friend.id)}
                              className="p-1.5 hover:bg-zinc-900 text-zinc-550 hover:text-amber-500 rounded-lg transition cursor-pointer animate-fadeIn"
                              title="Block User"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Friend's mini profile card stats */}
                        <div className="flex justify-between items-center border-t border-zinc-900 pt-3 text-[10px] text-zinc-400">
                          <div className="flex gap-3">
                            <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-500" /> {friend.streak} Days</span>
                            <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-violet-400" /> Lvl {friend.level}</span>
                          </div>
                          
                          {/* Invite to Study button */}
                          <button
                            onClick={() => {
                              showToast(`Study invitation sent to @${friend.username}!`, 'success');
                            }}
                            className="text-[9px] font-black text-violet-400 hover:text-violet-300 uppercase tracking-wider shrink-0 cursor-pointer"
                          >
                            Invite to Study
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Requests shelf */}
              {(requests.incoming.length > 0 || requests.outgoing.length > 0) && (
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-4 shadow-xl">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-violet-400" /> Pending Invites ({requests.incoming.length})
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {requests.incoming.map(req => (
                      <div key={req.id} className="bg-zinc-950 border border-zinc-850 p-3 rounded-2xl flex justify-between items-center text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-900 overflow-hidden flex items-center justify-center border border-zinc-850">
                            {req.avatarUrl ? (
                              <img src={req.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-4 h-4 text-zinc-600" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-200 block text-xs">{req.displayName}</span>
                            <span className="text-[9px] text-zinc-550 block">@{req.username}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 rounded-lg cursor-pointer transition"
                            title="Accept"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            className="p-1.5 bg-red-500/20 hover:bg-red-500/35 text-red-400 rounded-lg cursor-pointer transition"
                            title="Reject"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================
              STUDY GROUPS TAB REDESIGN
              ================================================== */}
          {activeTab === 'groups' && (
            <div className="space-y-6">
              
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-5 shadow-xl">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Study Directory</h2>
                    <p className="text-[10px] text-zinc-550">Create teamspaces to pool XP logs and complete goals together.</p>
                  </div>
                  
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-650 hover:bg-violet-600 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" /> Create Group
                  </button>
                </div>

                {groups.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-800 rounded-3xl p-8 bg-zinc-950/20 flex flex-col items-center justify-center gap-3">
                    <div className="p-4 bg-zinc-900/60 border border-zinc-850 rounded-2xl">
                      <Compass className="w-8 h-8 text-zinc-650" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-400">Create your first study group and invite friends.</p>
                      <p className="text-[10px] text-zinc-550 mt-1 max-w-sm mx-auto">Get started by clicking the "Create Group" button on the top right.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map(g => (
                      <div key={g.id} className={`group border rounded-2xl p-4 transition relative overflow-hidden flex flex-col justify-between min-h-[160px] ${
                        activeGroup?.id === g.id
                          ? 'bg-violet-950/10 border-violet-500/40 text-violet-300'
                          : 'bg-zinc-950 border-zinc-850/80 hover:border-zinc-800 text-zinc-400'
                      }`}>
                        {/* Cover gradient placeholder banner */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500/40 to-violet-500/40" />
                        
                        <div className="pt-2 text-left space-y-1">
                          <span className="font-extrabold text-zinc-200 block text-xs">{g.name}</span>
                          <p className="text-[10px] text-zinc-550 line-clamp-2">{g.description || 'No focus description set.'}</p>
                        </div>

                        <div className="flex justify-between items-center border-t border-zinc-900 pt-3 mt-4">
                          <button
                            onClick={() => loadGroupDetails(g.id)}
                            className="text-[9px] font-black text-violet-400 hover:text-violet-300 uppercase tracking-wider cursor-pointer"
                          >
                            Open Workspace
                          </button>

                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-extrabold text-zinc-550 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded">
                              Owner ID: {g.ownerId.slice(0, 5)}...
                            </span>
                            
                            {/* Leave Group Icon */}
                            <button
                              onClick={async () => {
                                try {
                                  await socialService.leaveGroup(g.id);
                                  showToast('Left study group', 'success');
                                  loadInitialData();
                                } catch (err: any) {
                                  showToast(err.response?.data?.message || 'Error leaving group', 'error');
                                }
                              }}
                              className="p-1 hover:bg-red-500/10 text-zinc-650 hover:text-red-400 rounded transition cursor-pointer"
                              title="Leave Group"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Group Announcements and Shared Materials Dashboard */}
              {activeGroup && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                  
                  {/* Announcements widget */}
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-4 shadow-xl">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-violet-400" /> Group News
                    </h3>

                    <div className="space-y-3">
                      {activeGroup.announcements.length === 0 ? (
                        <p className="text-zinc-550 text-[10px]">No announcements published in this group yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {activeGroup.announcements.map(ann => (
                            <div key={ann.id} className="bg-zinc-950 border border-zinc-850/60 p-3 rounded-2xl text-xs space-y-1 text-left">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-zinc-200">{ann.title}</span>
                                <span className="text-[8px] text-zinc-550">{new Date(ann.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-zinc-450 text-[10px]">{ann.content}</p>
                              <span className="text-[8px] text-zinc-550 block font-bold mt-1">
                                Author: {ann.author?.profile?.displayName || 'Admin'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Announcement Composer */}
                      <div className="border-t border-zinc-850/60 pt-3 space-y-2">
                        <input
                          type="text"
                          placeholder="News Title..."
                          value={groupAnnounceTitle}
                          onChange={(e) => setGroupAnnounceTitle(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-[10px] text-zinc-300 focus:outline-none"
                        />
                        <textarea
                          placeholder="Compose news detail..."
                          value={groupAnnounceContent}
                          onChange={(e) => setGroupAnnounceContent(e.target.value)}
                          rows={2}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-[10px] text-zinc-300 focus:outline-none resize-none"
                        />
                        <button
                          onClick={handlePostAnnouncement}
                          className="w-full py-1.5 bg-violet-650 hover:bg-violet-600 text-[10px] font-bold rounded-lg cursor-pointer transition text-zinc-100"
                        >
                          Post News
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Shared Resources Panel */}
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-4 shadow-xl">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400" /> Share Library
                    </h3>

                    <div className="space-y-3">
                      {sharedResources.length === 0 ? (
                        <p className="text-zinc-550 text-[10px]">No library materials shared in this group yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {sharedResources.map(res => (
                            <div key={res.id} className="bg-zinc-950 border border-zinc-850/60 p-2.5 rounded-xl flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2 text-left">
                                <BookOpen className="w-3.5 h-3.5 text-zinc-650" />
                                <div>
                                  <span className="font-bold text-zinc-300 block text-[10px]">{res.resourceType}</span>
                                  <span className="text-[8px] text-zinc-550">ID: {res.resourceId.slice(0, 8)}</span>
                                </div>
                              </div>
                              
                              <button
                                onClick={async () => {
                                  try {
                                    await socialService.unshareResource(activeGroup.id, res.id);
                                    showToast('Resource removed', 'success');
                                    loadGroupDetails(activeGroup.id);
                                  } catch (e) {
                                    showToast('Error removing resource', 'error');
                                  }
                                }}
                                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Share resource action shortcuts */}
                      <div className="border-t border-zinc-850/60 pt-3 flex gap-2">
                        <button
                          onClick={async () => {
                            if (myNotebooks.length === 0) {
                              showToast('No notebooks available to share', 'error');
                              return;
                            }
                            try {
                              await socialService.shareResource(activeGroup.id, {
                                resourceType: 'NOTEBOOK',
                                resourceId: myNotebooks[0].id
                              });
                              showToast('Notebook shared with group!', 'success');
                              loadGroupDetails(activeGroup.id);
                            } catch (e) {
                              showToast('Error sharing notebook', 'error');
                            }
                          }}
                          className="flex-1 py-1.5 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-bold rounded-lg cursor-pointer transition text-zinc-400 hover:text-zinc-200"
                        >
                          + Share Notebook
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================
              WEEKLY CHALLENGES TAB
              ================================================== */}
          {activeTab === 'challenges' && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Weekly Collaborative Milestones</h2>
                  {activeGroup && (
                    <button
                      onClick={() => setShowCreateChallenge(true)}
                      className="px-3 py-1.5 bg-violet-650 hover:bg-violet-600 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      + Launch Milestone
                    </button>
                  )}
                </div>

                {challenges.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-800 rounded-3xl p-8 bg-zinc-950/20 flex flex-col items-center justify-center gap-3">
                    <div className="p-4 bg-zinc-900/60 border border-zinc-850 rounded-2xl">
                      <Target className="w-8 h-8 text-zinc-650" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-400">Start studying to build your activity timeline.</p>
                      <p className="text-[10px] text-zinc-550 mt-1 max-w-sm mx-auto">Launch a collaborative group study challenge to get started.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-left">
                    {challenges.map(chal => {
                      const completedCount = chal.progress.filter(p => p.completed).length;
                      return (
                        <div key={chal.id} className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-3 relative overflow-hidden">
                          <div className="absolute top-0 right-0 bg-violet-500/10 text-violet-400 text-[8px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl border-l border-b border-violet-500/20">
                            {chal.period}
                          </div>
                          
                          <div className="space-y-1">
                            <span className="font-extrabold text-zinc-200 block text-xs">{chal.title}</span>
                            <span className="text-[10px] text-zinc-500 block">Goal Type: {chal.type.replace('_', ' ')} • Target: {chal.target}</span>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-zinc-400 font-semibold">
                              <span>Completed: {completedCount} Students</span>
                              <span>Target Count: {chal.target}</span>
                            </div>
                            <div className="h-2 bg-zinc-900 border border-zinc-850 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                                style={{ width: `${Math.min(100, (completedCount / Math.max(1, chal.target)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================
              NOTEBOOKS TAB
              ================================================== */}
          {activeTab === 'notebooks' && (
            <div className="space-y-6">
              
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-5 shadow-xl">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Shared Notebooks</h2>

                {/* Notebook Share Composer */}
                <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-4">
                  <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider block">Share Notebook with Friend</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={selectedNotebookId}
                      onChange={(e) => setSelectedNotebookId(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-bold px-3 py-2 rounded-xl focus:outline-none"
                    >
                      <option value="">Select Notebook...</option>
                      {myNotebooks.map(nb => (
                        <option key={nb.id} value={nb.id}>{nb.title}</option>
                      ))}
                    </select>

                    <select
                      value={shareTargetUserId}
                      onChange={(e) => setShareTargetUserId(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-bold px-3 py-2 rounded-xl focus:outline-none"
                    >
                      <option value="">Choose Friend...</option>
                      {friendsList.map(f => (
                        <option key={f.id} value={f.id}>{f.displayName} (@{f.username})</option>
                      ))}
                    </select>

                    <select
                      value={shareRole}
                      onChange={(e) => setShareRole(e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-bold px-3 py-2 rounded-xl focus:outline-none"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="COMMENTER">Commenter</option>
                      <option value="EDITOR">Editor</option>
                    </select>
                  </div>

                  <button
                    onClick={handleShareNotebook}
                    className="w-full py-2 bg-violet-650 hover:bg-violet-600 text-xs font-bold rounded-xl transition cursor-pointer text-zinc-100"
                  >
                    Authorize Shared Access
                  </button>
                </div>

                {/* Shared Notebooks List */}
                <div className="space-y-3">
                  {sharedNotebooks.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/10 p-6 flex flex-col items-center justify-center gap-2">
                      <Lock className="w-8 h-8 text-zinc-650" />
                      <p className="text-xs font-bold text-zinc-400">No shared notebooks found.</p>
                      <p className="text-[9px] text-zinc-550 max-w-xs mx-auto">Authorize one of your notebooks or get invites from friends to collaborate.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sharedNotebooks.map(item => (
                        <div key={item.notebook.id} className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl flex flex-col justify-between min-h-[120px] text-left">
                          <div className="space-y-1">
                            <span className="font-extrabold text-zinc-200 block text-xs">{item.notebook.title}</span>
                            <span className="text-[10px] text-zinc-500 block">Owner: {item.ownerName} • Access Role: <span className="font-bold text-violet-400">{item.role}</span></span>
                          </div>
                          
                          <div className="flex justify-between items-center border-t border-zinc-900 pt-3 mt-4">
                            <span className="text-[9px] text-zinc-550">ID: {item.notebook.id.slice(0, 8)}...</span>
                            <button
                              onClick={() => handleRevokeShare(item.notebook.id, myProfile?.userId || '')}
                              className="text-[9px] font-black text-red-400 hover:text-red-300 uppercase tracking-wider cursor-pointer"
                            >
                              Revoke Access
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Live activity & select list */}
        <div className="space-y-6">
          
          {/* Incoming group invites alerts */}
          {groupInvites.length > 0 && (
            <div className="bg-gradient-to-tr from-amber-950/20 to-zinc-900 border border-amber-500/30 p-5 rounded-3xl space-y-4 shadow-xl animate-fadeIn">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Bell className="w-4 h-4 animate-bounce" /> Group Invitations ({groupInvites.length})
              </h2>

              <div className="space-y-3.5">
                {groupInvites.map(item => (
                  <div key={item.id} className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                    <div className="text-left space-y-0.5">
                      <span className="font-bold text-zinc-200 block">{item.groupName}</span>
                      <span className="text-[9px] text-zinc-550 block">Invited by {item.inviterName}</span>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleAcceptInvite(item.id)}
                        className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 rounded-lg cursor-pointer transition"
                        title="Accept"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRejectInvite(item.id)}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/35 text-red-400 rounded-lg cursor-pointer transition"
                        title="Reject"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active study group selector list */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-4 shadow-xl">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">My Study Groups</h2>
            {groups.length === 0 ? (
              <p className="text-zinc-550 text-[10px] text-left">You are not a member of any study groups yet.</p>
            ) : (
              <div className="space-y-2">
                {groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setActiveTab('groups');
                      loadGroupDetails(g.id);
                    }}
                    className={`w-full text-left p-3 rounded-2xl text-xs flex justify-between items-center border transition cursor-pointer ${
                      activeGroup?.id === g.id
                        ? 'bg-violet-950/20 border-violet-500/40 text-violet-300'
                        : 'bg-zinc-950 border-zinc-850 hover:bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    <span className="font-bold truncate max-w-[140px]">{g.name}</span>
                    <Compass className="w-3.5 h-3.5 text-zinc-650" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Group standing leaderboard */}
          {activeGroup && (
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-4 shadow-xl animate-fadeIn">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-500 animate-pulse" /> Group Standings
              </h2>

              <div className="space-y-2">
                {activeGroup.leaderboard.slice(0, 5).map((user, idx) => (
                  <div key={user.userId} className="flex justify-between items-center text-xs bg-zinc-950 border border-zinc-850/40 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-zinc-500 w-3 text-center">{idx + 1}</span>
                      <div className="w-6 h-6 rounded-full bg-zinc-850 overflow-hidden flex items-center justify-center border border-zinc-800 shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-3 h-3 text-zinc-500" />
                        )}
                      </div>
                      <span className="font-extrabold text-zinc-350 truncate max-w-[90px]">{user.displayName}</span>
                    </div>

                    <span className="font-black text-violet-400 shrink-0">{user.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live social Activity timeline */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-4 shadow-xl">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400 animate-pulse" /> Recent Group Activity
            </h2>
            <div className="space-y-4 text-left border-l border-zinc-850 pl-3">
              {[
                { time: '10 mins ago', name: 'Aryan Mehta', log: 'uploaded Physics Study Notes', color: 'bg-violet-400' },
                { time: '1 hour ago', name: 'Priya Sharma', log: 'reached Diamond League rank', color: 'bg-indigo-400' },
                { time: '3 hours ago', name: 'Neha Kapoor', log: 'completed Operating Systems Quiz', color: 'bg-fuchsia-400' },
                { time: 'Yesterday', name: 'Rohan Verma', log: 'logged 3.5h study session', color: 'bg-emerald-400' }
              ].map((activity, idx) => (
                <div key={idx} className="relative text-[10px] text-zinc-400 space-y-1">
                  <div className={`absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full border border-zinc-950 ${activity.color}`} />
                  <span className="text-zinc-550 block text-[8px] font-bold uppercase tracking-wider">{activity.time}</span>
                  <span className="text-zinc-300 font-extrabold">{activity.name}</span> <span className="text-zinc-500">{activity.log}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ==========================================
          MODALS / DIALOGS
          ========================================== */}
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-violet-500/50 text-zinc-300"
              />
              <textarea
                placeholder="Description / Subject focus..."
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-violet-500/50 resize-none text-zinc-300"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="px-4 py-2 hover:bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="px-4 py-2 bg-violet-650 hover:bg-violet-600 text-xs font-bold rounded-xl transition cursor-pointer"
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-violet-500/50 text-zinc-300"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newChallengeType}
                  onChange={(e) => setNewChallengeType(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-bold px-3 py-2 rounded-xl focus:outline-none"
                >
                  <option value="STUDY_HOURS">Study Hours</option>
                  <option value="FLASHCARDS">Flashcards Completed</option>
                  <option value="NOTES">Notes Generated</option>
                  <option value="QUIZZES">Quizzes Completed</option>
                </select>

                <select
                  value={newChallengePeriod}
                  onChange={(e) => setNewChallengePeriod(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-bold px-3 py-2 rounded-xl focus:outline-none"
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-violet-500/50 text-zinc-300"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreateChallenge(false)}
                className="px-4 py-2 hover:bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChallenge}
                className="px-4 py-2 bg-violet-650 hover:bg-violet-600 text-xs font-bold rounded-xl transition cursor-pointer"
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
