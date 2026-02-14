/**
 * Pure logic for group chat member permissions.
 * Owner (założyciel) + profile admin (users.role='admin') have full control.
 * Moderator can remove only members. Owner/admin cannot be removed.
 */

export type ChannelMemberRole = 'owner' | 'moderator' | 'member';

export interface PermissionContext {
  currentUserId: string;
  currentUserProfileRole?: string; // users.role, e.g. 'admin'
  currentMemberRole?: ChannelMemberRole;
}

export interface TargetMember {
  userId: string;
  memberRole: ChannelMemberRole;
  userProfileRole?: string; // users.role
}

/**
 * Can current user remove target from the group?
 * No: self, owner, profile admin. Yes: owner/admin remove moderator/member, moderator removes member.
 */
export function canRemoveMember(ctx: PermissionContext, target: TargetMember): boolean {
  const isSelf = target.userId === ctx.currentUserId;
  const isMemberOwner = target.memberRole === 'owner';
  const isTargetProfileAdmin = target.userProfileRole === 'admin';
  const isOwnerOrProfileAdmin = ctx.currentMemberRole === 'owner' || ctx.currentUserProfileRole === 'admin';
  const isModerator = ctx.currentMemberRole === 'moderator';

  if (isSelf || isMemberOwner || isTargetProfileAdmin) return false;
  if (isOwnerOrProfileAdmin && (target.memberRole === 'moderator' || target.memberRole === 'member')) return true;
  if (isModerator && target.memberRole === 'member') return true;
  return false;
}

/**
 * Can current user promote target to moderator?
 * Only owner or profile admin, target must be member.
 */
export function canPromoteMember(ctx: PermissionContext, target: TargetMember): boolean {
  const isSelf = target.userId === ctx.currentUserId;
  const isOwnerOrProfileAdmin = ctx.currentMemberRole === 'owner' || ctx.currentUserProfileRole === 'admin';
  return !!isOwnerOrProfileAdmin && !isSelf && target.memberRole === 'member';
}

/**
 * Can current user demote target from moderator to member?
 * Only owner or profile admin, target must be moderator.
 */
export function canDemoteMember(ctx: PermissionContext, target: TargetMember): boolean {
  const isSelf = target.userId === ctx.currentUserId;
  const isOwnerOrProfileAdmin = ctx.currentMemberRole === 'owner' || ctx.currentUserProfileRole === 'admin';
  return !!isOwnerOrProfileAdmin && !isSelf && target.memberRole === 'moderator';
}

/**
 * Does current user see action buttons (promote/demote/remove)?
 * Owner, profile admin, or moderator (for remove only).
 */
export function canManageMembers(ctx: PermissionContext): boolean {
  const isOwnerOrProfileAdmin = ctx.currentMemberRole === 'owner' || ctx.currentUserProfileRole === 'admin';
  const isModerator = ctx.currentMemberRole === 'moderator';
  return !!isOwnerOrProfileAdmin || isModerator;
}
