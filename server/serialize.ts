function id(doc: any): string {
  return doc?._id ? doc._id.toString() : doc?.toString?.() ?? '';
}

export function serializeUser(u: any) {
  if (!u) return null;
  return {
    id: id(u),
    name: u.name,
    username: u.username,
    email: u.email,
    avatar: u.avatar,
    coverImage: u.coverImage,
    bio: u.bio,
    role: u.role,
    isBanned: u.isBanned,
    workplace: u.workplace,
    education: u.education,
    location: u.location,
    website: u.website,
    joinDate: u.joinDate ? new Date(u.joinDate).toISOString() : undefined,
    friendsCount: u.friendsCount ?? 0,
    isOnline: u.isOnline,
    lastActive: u.lastActive ? new Date(u.lastActive).toISOString() : undefined,
    isBot: !!u.isBot,
  };
}

// Adds fields that are private to the account owner — never call this with someone else's user doc.
export function serializeMe(u: any) {
  const base = serializeUser(u);
  if (!base) return null;
  return { ...base, blockedUserIds: (u.blockedUsers || []).map((id_: any) => id(id_)) };
}

export function serializePost(p: any, viewerId?: string) {
  return {
    id: id(p),
    author: serializeUser(p.author),
    wallOwnerId: p.wallOwner ? id(p.wallOwner) : undefined,
    wallOwnerName: p.wallOwner?.name,
    content: p.content,
    images: p.images && p.images.length > 0 ? p.images : undefined,
    video: p.video || undefined,
    privacy: p.privacy,
    feeling: p.feeling,
    location: p.location,
    groupId: p.group ? id(p.group) : undefined,
    groupName: p.group?.name,
    taggedUsers: (p.taggedUsers || []).map((u: any) => serializeUser(u)).filter(Boolean),
    createdAt: p.createdAt,
    updatedAt: p.editedAt,
    reactions: (p.reactions || []).map((r: any) => ({
      type: r.type,
      userId: id(r.userId),
      userName: r.userId?.name,
    })),
    commentsCount: p.commentsCount || 0,
    sharesCount: p.sharesCount || 0,
    pinned: p.pinned,
    isSaved: viewerId ? (p.savedBy || []).some((u: any) => id(u) === viewerId) : false,
  };
}

export function serializeComment(c: any) {
  return {
    id: id(c),
    postId: id(c.post),
    author: serializeUser(c.author),
    content: c.content,
    image: c.image,
    taggedUsers: (c.taggedUsers || []).map((u: any) => serializeUser(u)).filter(Boolean),
    createdAt: c.createdAt,
    likes: (c.likes || []).map((u: any) => id(u)),
    parentId: c.parent ? id(c.parent) : undefined,
  };
}

export function serializeStory(s: any) {
  return {
    id: id(s),
    user: serializeUser(s.user),
    type: s.type,
    privacy: s.privacy || 'public',
    mediaUrl: s.mediaUrl,
    textContent: s.textContent,
    backgroundGradient: s.backgroundGradient,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    viewers: (s.viewers || []).map((v: any) => ({
      userId: id(v.user),
      userName: v.user?.name,
      avatar: v.user?.avatar,
      viewedAt: v.viewedAt,
    })),
  };
}

export function serializeGroup(
  g: any,
  viewerId?: string,
  meta?: {
    hasPendingJoinRequest?: boolean;
    joinRequestsCount?: number;
    hasPendingInvite?: boolean;
  }
) {
  const viewerMembership = viewerId
    ? (g.members || []).find((m: any) => id(m.user) === viewerId)
    : undefined;
  return {
    id: id(g),
    name: g.name,
    description: g.description,
    privacy: g.privacy,
    avatar: g.avatar,
    coverImage: g.coverImage,
    creatorId: id(g.creator),
    membersCount: g.members?.length || 0,
    postsCount: g.postsCount || 0,
    members: (g.members || []).map((m: any) => ({
      userId: id(m.user),
      user: serializeUser(m.user),
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    isMember: !!viewerMembership,
    isAdmin: viewerMembership?.role === 'admin',
    hasPendingJoinRequest: !!meta?.hasPendingJoinRequest,
    joinRequestsCount: meta?.joinRequestsCount,
    hasPendingInvite: !!meta?.hasPendingInvite,
    rules: g.rules,
    createdAt: g.createdAt,
  };
}

export function serializeGroupJoinRequest(r: any) {
  return {
    id: id(r),
    groupId: id(r.group),
    user: serializeUser(r.user),
    createdAt: r.createdAt,
  };
}

export function serializeFriendRequest(r: any, mutualFriendsCount = 0) {
  return {
    id: id(r),
    sender: serializeUser(r.sender),
    receiverId: id(r.receiver),
    createdAt: r.createdAt,
    mutualFriendsCount,
  };
}

export function serializeNotification(n: any) {
  return {
    id: id(n),
    userId: id(n.user),
    actor: serializeUser(n.actor),
    type: n.type,
    content: n.content,
    targetId: n.targetId,
    targetType: n.targetType,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

export function serializeConversation(c: any, lastMessage?: any, unreadCount = 0) {
  const participantIds = (c.participants || []).map((p: any) => id(p));
  return {
    id: id(c),
    isGroup: c.isGroup,
    name: c.name,
    avatar: c.avatar,
    participants: (c.participants || []).map(serializeUser),
    adminIds: (c.admins || []).map((a: any) => id(a)),
    nicknames: c.nicknames ? Object.fromEntries(c.nicknames) : {},
    lastMessage: lastMessage ? serializeMessage(lastMessage, participantIds) : undefined,
    unreadCount,
    updatedAt: c.updatedAt,
  };
}

// `participantIds`, when given, makes `isRead` mean "every other participant has seen
// this" (correct for both 1:1 and group chats) instead of the old "at least one other
// person has read it" heuristic, which falsely flipped a group message to "read" the
// moment a single recipient opened the thread.
export function serializeMessage(m: any, participantIds?: string[]) {
  const senderId = id(m.sender);
  const readByIds = new Set((m.readBy || []).map((u: any) => id(u)));
  const isRead = participantIds
    ? participantIds.filter((pid) => pid !== senderId).every((pid) => readByIds.has(pid))
    : (m.readBy || []).some((u: any) => id(u) !== senderId);
  return {
    id: id(m),
    conversationId: id(m.conversation),
    kind: m.kind || 'text',
    senderId,
    senderName: m.sender?.name,
    senderAvatar: m.sender?.avatar,
    content: m.content,
    attachments: m.attachments && m.attachments.length > 0 ? m.attachments : undefined,
    sharedPostId: m.sharedPostId ? id(m.sharedPostId) : undefined,
    callType: m.callType,
    callStatus: m.callStatus,
    callDurationSec: m.callDurationSec,
    createdAt: m.createdAt,
    isRead,
    isRecalled: !!m.isRecalled,
    reactions: m.reactions && m.reactions.size > 0 ? Object.fromEntries(m.reactions) : undefined,
  };
}

export function serializeReport(r: any) {
  return {
    id: id(r),
    reporter: serializeUser(r.reporter),
    targetType: r.targetType,
    targetId: r.targetId,
    targetName: r.targetName,
    reason: r.reason,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt,
    resolutionNote: r.resolutionNote,
  };
}

export function serializeAnnouncement(a: any) {
  return {
    id: id(a),
    title: a.title,
    message: a.message,
    type: a.type,
    createdAt: a.createdAt,
    createdBy: a.createdBy?.name || 'Ban Quản Trị',
  };
}
