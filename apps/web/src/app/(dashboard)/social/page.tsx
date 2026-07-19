'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, ShieldAlert, Award, BookOpen, Clock, 
  MessageSquare, PlusCircle, Trash2, Shield, Calendar, CheckSquare, 
  Check, X, Search, Flame, Trophy, Volume2, UserCheck, Lock, Share2 
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
        <div className="h-24 bg-zinc-900 border border-zinc-800 rounded-3xl" />
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-400" />
            <h1 className="text-xl font-black text-zinc-150">Social Learning Workspace</h1>
          </div>
          <p className="text-zinc-500 text-xs">Collaborate with peers, compete on study groups, and join weekly milestones.</p>
        </div>

        {myProfile && (
          <button
            onClick={() => setShowCard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-600 hover:to-indigo-600 text-xs font-bold rounded-xl transition shadow-lg cursor-pointer"
          >
            <Share2 className="w-4 h-4" /> Export Study Card
          </button>
        )}
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-zinc-850 gap-4">
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
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400" />
            )}
          </button>
        ))}
      </div>

      {/* Grid container layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Controls & Browsers depending on Tab */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ==================================================
              FRIENDS TAB
              ================================================== */}
          {activeTab === 'friends' && (
            <div className="space-y-6">
              
              {/* User search bar */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Search Learners</h2>
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search username or display name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <button
                    onClick={handleSearchUsers}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Search
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="divide-y divide-zinc-850/40 pt-2 space-y-3">
                    {searchResults.map(user => (
                      <div key={user.id} className="flex justify-between items-center pt-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-zinc-850 overflow-hidden flex items-center justify-center border border-zinc-800">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-4 h-4 text-zinc-500" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-200 block">{user.displayName}</span>
                            <span className="text-[10px] text-zinc-500 block">@{user.username} • Lvl {user.level}</span>
                          </div>
                        </div>

                        {user.relationship === 'NONE' && (
                          <button
                            onClick={() => handleSendFriendRequest(user.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-650 hover:bg-violet-600 text-[10px] font-bold rounded-lg transition cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Add Friend
                          </button>
                        )}
                        {user.relationship === 'SENT' && (
                          <span className="text-[10px] text-violet-400/80 font-bold bg-violet-500/10 px-2.5 py-1 rounded-lg">Sent</span>
                        )}
                        {user.relationship === 'RECEIVED' && (
                          <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-lg">Pending approval</span>
                        )}
                        {user.relationship === 'FRIEND' && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">Friends</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Friends list */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">All Friends ({friendsList.length})</h2>
                {friendsList.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border/60 rounded-xl bg-card/10 flex flex-col items-center justify-center">
                    <Users className="w-8 h-8 text-muted-foreground/30 mb-2 stroke-[1.25]" />
                    <p className="text-xs text-foreground font-semibold">No friends added yet</p>
                    <p className="text-[10px] text-muted-foreground max-w-xs mt-0.5">Search and add peers to start studying and sharing notebooks together.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {friendsList.map(friend => (
                      <div key={friend.id} className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl flex flex-col justify-between space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center border border-zinc-700">
                                {friend.avatarUrl ? (
                                  <img src={friend.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Users className="w-5 h-5 text-zinc-550" />
                                )}
                              </div>
                              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-zinc-950 ${
                                friend.status === 'ONLINE' ? 'bg-emerald-500' :
                                friend.status === 'STUDYING' || friend.status === 'IN_POMODORO' ? 'bg-amber-500 animate-pulse' :
                                friend.status === 'TAKING_QUIZ' ? 'bg-pink-500' : 'bg-zinc-650'
                              }`} />
                            </div>
                            <div>
                              <span className="font-bold text-zinc-200 block text-xs">{friend.displayName}</span>
                              <span className="text-[10px] text-zinc-500 block">@{friend.username}</span>
                              <span className="text-[9px] text-zinc-550 block font-bold capitalize mt-0.5">
                                {friend.status.replace('_', ' ').toLowerCase()}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleRemoveFriend(friend.id)}
                              className="p-1.5 hover:bg-zinc-900 text-zinc-500 hover:text-red-400 rounded-lg transition cursor-pointer"
                              title="Remove Friend"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleBlockUser(friend.id)}
                              className="p-1.5 hover:bg-zinc-900 text-zinc-500 hover:text-amber-500 rounded-lg transition cursor-pointer"
                              title="Block User"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Friend's mini profile card stats */}
                        <div className="flex gap-4 border-t border-zinc-850/60 pt-2 text-[10px] text-zinc-400">
                          <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" /> {friend.streak} Days</span>
                          <span className="flex items-center gap-1"><Award className="w-3 h-3 text-violet-400" /> Lvl {friend.level}</span>
                          {friend.weeklyRank > 0 && (
                            <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-yellow-500" /> #{friend.weeklyRank}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================
              STUDY GROUPS TAB
              ================================================== */}
          {activeTab === 'groups' && (
            <div className="space-y-6">
              
              {/* Active Group Details */}
              {activeGroup ? (
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-6">
                  
                  {/* Header Row */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-black text-zinc-200">{activeGroup.name}</h2>
                      <p className="text-zinc-500 text-xs">{activeGroup.description || 'Collaborative study space.'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCreateChallenge(true)}
                        className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-[10px] font-bold rounded-lg transition cursor-pointer"
                      >
                        Launch Challenge
                      </button>
                      <button
                        onClick={() => setShowCreateGroup(true)}
                        className="px-3.5 py-1.5 bg-violet-650 hover:bg-violet-600 text-[10px] font-bold rounded-lg transition cursor-pointer"
                      >
                        New Group
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl text-center space-y-1">
                      <Users className="w-4 h-4 text-violet-400 mx-auto" />
                      <span className="text-[10px] text-zinc-550 block font-bold uppercase tracking-wider">Members</span>
                      <span className="text-base font-extrabold text-zinc-250 block">{activeGroup.membersCount}</span>
                    </div>

                    <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl text-center space-y-1">
                      <Clock className="w-4 h-4 text-blue-400 mx-auto" />
                      <span className="text-[10px] text-zinc-550 block font-bold uppercase tracking-wider">Study Hours</span>
                      <span className="text-base font-extrabold text-zinc-250 block">{activeGroup.weeklyStudyHours.toFixed(1)} hrs</span>
                    </div>

                    <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl text-center space-y-1">
                      <Award className="w-4 h-4 text-pink-400 mx-auto" />
                      <span className="text-[10px] text-zinc-550 block font-bold uppercase tracking-wider">My Role</span>
                      <span className="text-xs font-black text-zinc-200 block uppercase tracking-wider mt-1">{activeGroup.myRole}</span>
                    </div>
                  </div>

                  {/* Announcements / Bulletin Board */}
                  <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-violet-400" /> Bulletins & Announcements
                    </h3>

                    {(activeGroup.myRole === 'OWNER' || activeGroup.myRole === 'ADMIN') && (
                      <div className="space-y-3 pt-2">
                        <input
                          type="text"
                          placeholder="Announcement title..."
                          value={groupAnnounceTitle}
                          onChange={(e) => setGroupAnnounceTitle(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-violet-500/50"
                        />
                        <textarea
                          placeholder="Publish news, upcoming midterms, or study goals..."
                          value={groupAnnounceContent}
                          onChange={(e) => setGroupAnnounceContent(e.target.value)}
                          rows={2}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-violet-500/50 resize-none"
                        />
                        <button
                          onClick={handlePostAnnouncement}
                          className="px-4 py-2 bg-violet-650 hover:bg-violet-600 text-[10px] font-bold rounded-xl transition cursor-pointer"
                        >
                          Post Announcement
                        </button>
                      </div>
                    )}

                    <div className="space-y-3 divide-y divide-zinc-850/40">
                      {activeGroup.announcements.length === 0 ? (
                        <p className="text-zinc-500 text-xs py-2">No announcements posted yet.</p>
                      ) : (
                        activeGroup.announcements.map((ann, idx) => (
                          <div key={ann.id} className={`pt-3 space-y-1 text-xs ${idx === 0 ? '!pt-0' : ''}`}>
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-zinc-200">{ann.title}</span>
                              <span className="text-[9px] text-zinc-550">
                                {ann.author?.profile?.displayName || 'Learner'} • {new Date(ann.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-zinc-400 text-[11px] leading-relaxed">{ann.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Resource Share / Group Files Drive */}
                  <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-400" /> Shared Study Assets
                    </h3>

                    {/* Expose sharing selectors if member has notebook resource */}
                    <div className="flex gap-2 bg-zinc-900 border border-zinc-800/80 p-3 rounded-xl">
                      <select
                        onChange={(e) => {
                          const [type, id] = e.target.value.split(':');
                          if (type && id) {
                            socialService.shareResource(activeGroup.id, { resourceType: type, resourceId: id })
                              .then(() => {
                                showToast('Study asset shared!', 'success');
                                loadGroupDetails(activeGroup.id);
                              })
                              .catch(() => showToast('Failed sharing asset', 'error'));
                          }
                        }}
                        className="bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 font-bold px-3 py-1.5 rounded-lg focus:outline-none"
                      >
                        <option value="">+ Share notebook or note...</option>
                        {myNotebooks.map(nb => (
                          <option key={nb.id} value={`NOTE:${nb.id}`}>{nb.title} (Notebook)</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {sharedResources.length === 0 ? (
                        <p className="text-zinc-500 text-xs col-span-2">No study assets shared in this group yet.</p>
                      ) : (
                        sharedResources.map(item => (
                          <div key={item.id} className="bg-zinc-900 border border-zinc-850 p-3.5 rounded-xl flex justify-between items-center text-xs">
                            <div className="space-y-0.5">
                              <span className="font-extrabold text-zinc-250 block text-[11px]">
                                {item.details?.title || 'Shared Resource'}
                              </span>
                              <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">
                                {item.resourceType} • Shared by @{item.sharedBy?.profile?.username || 'learner'}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                socialService.unshareResource(activeGroup.id, item.resourceId)
                                  .then(() => {
                                    showToast('Asset unshared', 'success');
                                    loadGroupDetails(activeGroup.id);
                                  });
                              }}
                              className="p-1 hover:bg-zinc-800 text-zinc-550 hover:text-red-400 rounded transition cursor-pointer"
                              title="Unshare"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center space-y-3">
                  <p className="text-zinc-400 text-xs">Create or accept a group invitation to start collaborative tracking.</p>
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="px-4 py-2 bg-violet-650 hover:bg-violet-600 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Create Study Group
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ==================================================
              CHALLENGES TAB
              ================================================== */}
          {activeTab === 'challenges' && (
            <div className="space-y-6 bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-extrabold text-zinc-200">Active Group Milestones</h2>
                  <p className="text-zinc-550 text-[10px]">Verify your completions based on Pomodoro focus hours, Quiz cards, or Notes.</p>
                </div>
                {activeGroup && (
                  <button
                    onClick={() => setShowCreateChallenge(true)}
                    className="px-3.5 py-1.5 bg-violet-650 hover:bg-violet-600 text-[10px] font-bold rounded-lg transition cursor-pointer"
                  >
                    Launch Milestone
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {challenges.length === 0 ? (
                  <p className="text-zinc-550 text-xs col-span-2 py-4">No active milestones created in this group.</p>
                ) : (
                  challenges.map(chal => {
                    const userProgress = chal.progress.find(p => p.userId === myProfile?.userId);
                    const percentage = userProgress ? Math.min(100, Math.round((userProgress.current / chal.target) * 100)) : 0;

                    return (
                      <div key={chal.id} className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-black text-zinc-200 block">{chal.title}</span>
                            <span className="text-[9px] font-black uppercase text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded block w-fit mt-1 tracking-wider">
                              {chal.period} • {chal.type.replace('_', ' ')}
                            </span>
                          </div>

                          <span className="text-xs font-black text-zinc-350">{percentage}%</span>
                        </div>

                        {/* Progress slider bar */}
                        <div className="space-y-1">
                          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-850">
                            <div className="bg-violet-500 h-full rounded-full transition-all" style={{ width: `${percentage}%` }} />
                          </div>
                          <div className="flex justify-between text-[9px] text-zinc-500">
                            <span>Progress: {userProgress?.current || 0} / {chal.target}</span>
                            <span>Ends: {new Date(chal.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Leader rankings within challenge */}
                        <div className="pt-2 border-t border-zinc-900/60 space-y-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Completions</span>
                          <div className="space-y-1.5">
                            {chal.progress.slice(0, 3).map(p => (
                              <div key={p.id} className="flex justify-between items-center text-[10px]">
                                <span className="text-zinc-400 flex items-center gap-1.5">
                                  <div className="w-4 h-4 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center">
                                    {p.user?.profile?.avatarUrl ? (
                                      <img src={p.user.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <Users className="w-2.5 h-2.5 text-zinc-650" />
                                    )}
                                  </div>
                                  @{p.user?.profile?.username || 'learner'}
                                </span>
                                <span className={`font-bold ${p.completed ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                  {p.completed ? 'Completed' : `${p.current} units`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ==================================================
              NOTEBOOKS TAB
              ================================================== */}
          {activeTab === 'notebooks' && (
            <div className="space-y-6">
              
              {/* Share a notebook form card */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Share Collaborative Notebook</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Select Notebook */}
                  <select
                    value={selectedNotebookId}
                    onChange={(e) => setSelectedNotebookId(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-bold px-3 py-2 rounded-xl focus:outline-none"
                  >
                    <option value="">Select Notebook...</option>
                    {myNotebooks.map(nb => (
                      <option key={nb.id} value={nb.id}>{nb.title}</option>
                    ))}
                  </select>

                  {/* Select Friend */}
                  <select
                    value={shareTargetUserId}
                    onChange={(e) => setShareTargetUserId(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-bold px-3 py-2 rounded-xl focus:outline-none"
                  >
                    <option value="">Select Friend...</option>
                    {friendsList.map(f => (
                      <option key={f.id} value={f.id}>{f.displayName} (@{f.username})</option>
                    ))}
                  </select>

                  {/* Select Permission Role */}
                  <select
                    value={shareRole}
                    onChange={(e) => setShareRole(e.target.value as any)}
                    className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-bold px-3 py-2 rounded-xl focus:outline-none"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="COMMENTER">Commenter</option>
                    <option value="EDITOR">Editor</option>
                  </select>

                  <button
                    onClick={handleShareNotebook}
                    className="px-4 py-2 bg-violet-650 hover:bg-violet-600 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Grant Access
                  </button>
                </div>
              </div>

              {/* Shared notebooks list */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Notebooks Shared With Me ({sharedNotebooks.length})</h2>
                {sharedNotebooks.length === 0 ? (
                  <p className="text-zinc-500 text-xs py-2">No notebooks shared with you yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sharedNotebooks.map(item => (
                      <div key={item.notebook.id} className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl flex justify-between items-center text-xs">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-zinc-250 block">{item.notebook.title}</span>
                          <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">
                            Owner: {item.ownerName} • Role: {item.role}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            socialService.revokeShare(item.notebook.id, myProfile?.userId || '')
                              .then(() => {
                                showToast('Notebook unlinked', 'success');
                                loadInitialData();
                              });
                          }}
                          className="p-1.5 hover:bg-zinc-900 text-zinc-550 hover:text-red-400 rounded-lg transition cursor-pointer"
                          title="Leave Shared Notebook"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Sidebar (Group Navigation, Incoming Friend Requests, Invites, Activity stream) */}
        <div className="space-y-6">
          
          {/* Incoming Friends/Group Notifications Panel */}
          {(requests.incoming.length > 0 || groupInvites.length > 0) && (
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-xl">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-violet-400">Pending Actions</h2>
              
              {/* Friend requests */}
              {requests.incoming.map(req => (
                <div key={req.id} className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl flex justify-between items-center text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-zinc-200 block">{req.displayName}</span>
                    <span className="text-[9px] text-zinc-500 block">sent you a request</span>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 rounded-lg cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="p-1.5 bg-red-500/20 hover:bg-red-500/35 text-red-400 rounded-lg cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Group invites */}
              {groupInvites.map(item => (
                <div key={item.id} className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl flex justify-between items-center text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-zinc-200 block">{item.groupName}</span>
                    <span className="text-[9px] text-zinc-500 block">Invited by {item.inviterName}</span>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAcceptInvite(item.id)}
                      className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 rounded-lg cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRejectInvite(item.id)}
                      className="p-1.5 bg-red-500/20 hover:bg-red-500/35 text-red-400 rounded-lg cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Study Group Selector/Standings (For Groups tab navigation) */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">My Study Groups</h2>
            {groups.length === 0 ? (
              <p className="text-zinc-500 text-xs">You are not a member of any study groups yet.</p>
            ) : (
              <div className="space-y-2">
                {groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => loadGroupDetails(g.id)}
                    className={`w-full text-left p-3 rounded-xl text-xs flex justify-between items-center border transition cursor-pointer ${
                      activeGroup?.id === g.id
                        ? 'bg-violet-950/20 border-violet-500/40 text-violet-300'
                        : 'bg-zinc-950 border-zinc-850 hover:bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    <span>{g.name}</span>
                    <Users className="w-3.5 h-3.5 text-zinc-650" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Group Leaderboard (Shown in sidebar when group is loaded) */}
          {activeGroup && (
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-500" /> Group Standing
              </h2>

              <div className="space-y-2">
                {activeGroup.leaderboard.slice(0, 5).map((user, idx) => (
                  <div key={user.userId} className="flex justify-between items-center text-xs bg-zinc-950 border border-zinc-850/40 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-zinc-500 w-3 text-center">{idx + 1}</span>
                      <div className="w-6 h-6 rounded-full bg-zinc-850 overflow-hidden flex items-center justify-center border border-zinc-800">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-3 h-3 text-zinc-500" />
                        )}
                      </div>
                      <span className="font-extrabold text-zinc-350">{user.displayName}</span>
                    </div>

                    <span className="font-bold text-violet-400">{user.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active study log (Purely learning activity feed) */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-xl">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Recent Group Activity</h2>
            <div className="space-y-3.5">
              <div className="text-[10px] text-zinc-400 space-y-1">
                <span className="text-zinc-500 block">10 minutes ago</span>
                <span className="text-zinc-300 font-bold block">✓ Mudit uploaded Operating Systems Notes</span>
              </div>
              <div className="text-[10px] text-zinc-400 space-y-1">
                <span className="text-zinc-500 block">1 hour ago</span>
                <span className="text-zinc-300 font-bold block">✓ Aryan earned Gold Fire Achievement</span>
              </div>
              <div className="text-[10px] text-zinc-400 space-y-1">
                <span className="text-zinc-500 block">Yesterday</span>
                <span className="text-zinc-300 font-bold block">✓ Priya completed DSA Midterm Quiz</span>
              </div>
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl relative">
            <h3 className="font-extrabold text-zinc-200 text-sm">Create Study Group</h3>
            
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Group Name (e.g. DSA Practice)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-violet-500/50"
              />
              <textarea
                placeholder="Description / Subject focus..."
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-violet-500/50 resize-none"
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl relative">
            <h3 className="font-extrabold text-zinc-200 text-sm">Create Group Milestone</h3>
            
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Challenge Title (e.g. Study 20 Hours)"
                value={newChallengeTitle}
                onChange={(e) => setNewChallengeTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-violet-500/50"
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-violet-500/50"
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
