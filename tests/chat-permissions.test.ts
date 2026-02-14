/**
 * Testy dla lib/chat/permissions.ts
 * Logika uprawnień czatu: owner, moderator, member, profile admin
 */
import { describe, it, expect } from 'vitest';
import {
  canRemoveMember,
  canPromoteMember,
  canDemoteMember,
  canManageMembers,
  type PermissionContext,
  type TargetMember,
} from '@/lib/chat/permissions';

const ctx = (
  currentUserId: string,
  currentMemberRole?: PermissionContext['currentMemberRole'],
  currentUserProfileRole?: string
): PermissionContext => ({
  currentUserId,
  currentMemberRole,
  currentUserProfileRole,
});

const target = (
  userId: string,
  memberRole: TargetMember['memberRole'],
  userProfileRole?: string
): TargetMember => ({
  userId,
  memberRole,
  userProfileRole,
});

describe('canRemoveMember', () => {
  it('owner can remove moderator', () => {
    expect(
      canRemoveMember(ctx('a', 'owner'), target('m', 'moderator'))
    ).toBe(true);
  });

  it('owner can remove member', () => {
    expect(canRemoveMember(ctx('a', 'owner'), target('m', 'member'))).toBe(true);
  });

  it('owner cannot remove owner', () => {
    expect(canRemoveMember(ctx('a', 'owner'), target('b', 'owner'))).toBe(false);
  });

  it('owner cannot remove profile admin (even if member)', () => {
    expect(
      canRemoveMember(ctx('a', 'owner'), target('admin1', 'member', 'admin'))
    ).toBe(false);
  });

  it('profile admin can remove moderator', () => {
    expect(
      canRemoveMember(ctx('admin1', 'member', 'admin'), target('m', 'moderator'))
    ).toBe(true);
  });

  it('profile admin can remove member', () => {
    expect(
      canRemoveMember(ctx('admin1', 'member', 'admin'), target('m', 'member'))
    ).toBe(true);
  });

  it('moderator can remove member', () => {
    expect(
      canRemoveMember(ctx('mod1', 'moderator'), target('m', 'member'))
    ).toBe(true);
  });

  it('moderator cannot remove moderator', () => {
    expect(
      canRemoveMember(ctx('mod1', 'moderator'), target('mod2', 'moderator'))
    ).toBe(false);
  });

  it('moderator cannot remove owner', () => {
    expect(
      canRemoveMember(ctx('mod1', 'moderator'), target('o', 'owner'))
    ).toBe(false);
  });

  it('member cannot remove anyone', () => {
    expect(
      canRemoveMember(ctx('m1', 'member'), target('m2', 'member'))
    ).toBe(false);
  });

  it('cannot remove self', () => {
    expect(
      canRemoveMember(ctx('a', 'owner'), target('a', 'member'))
    ).toBe(false);
  });
});

describe('canPromoteMember', () => {
  it('owner can promote member', () => {
    expect(
      canPromoteMember(ctx('a', 'owner'), target('m', 'member'))
    ).toBe(true);
  });

  it('profile admin can promote member', () => {
    expect(
      canPromoteMember(ctx('admin1', 'member', 'admin'), target('m', 'member'))
    ).toBe(true);
  });

  it('owner cannot promote self', () => {
    expect(
      canPromoteMember(ctx('a', 'owner'), target('a', 'member'))
    ).toBe(false);
  });

  it('owner cannot promote moderator (already promoted)', () => {
    expect(
      canPromoteMember(ctx('a', 'owner'), target('m', 'moderator'))
    ).toBe(false);
  });

  it('moderator cannot promote', () => {
    expect(
      canPromoteMember(ctx('mod1', 'moderator'), target('m', 'member'))
    ).toBe(false);
  });

  it('member cannot promote', () => {
    expect(
      canPromoteMember(ctx('m1', 'member'), target('m2', 'member'))
    ).toBe(false);
  });
});

describe('canDemoteMember', () => {
  it('owner can demote moderator', () => {
    expect(
      canDemoteMember(ctx('a', 'owner'), target('m', 'moderator'))
    ).toBe(true);
  });

  it('profile admin can demote moderator', () => {
    expect(
      canDemoteMember(ctx('admin1', 'member', 'admin'), target('m', 'moderator'))
    ).toBe(true);
  });

  it('owner cannot demote self (if moderator)', () => {
    expect(
      canDemoteMember(ctx('a', 'owner'), target('a', 'moderator'))
    ).toBe(false);
  });

  it('owner cannot demote member (not moderator)', () => {
    expect(
      canDemoteMember(ctx('a', 'owner'), target('m', 'member'))
    ).toBe(false);
  });

  it('moderator cannot demote', () => {
    expect(
      canDemoteMember(ctx('mod1', 'moderator'), target('m', 'moderator'))
    ).toBe(false);
  });
});

describe('canManageMembers', () => {
  it('owner can manage', () => {
    expect(canManageMembers(ctx('a', 'owner'))).toBe(true);
  });

  it('profile admin can manage', () => {
    expect(canManageMembers(ctx('admin1', 'member', 'admin'))).toBe(true);
  });

  it('moderator can manage (remove only)', () => {
    expect(canManageMembers(ctx('mod1', 'moderator'))).toBe(true);
  });

  it('member cannot manage', () => {
    expect(canManageMembers(ctx('m1', 'member'))).toBe(false);
  });

  it('non-member with profile admin can manage', () => {
    expect(canManageMembers(ctx('admin1', undefined, 'admin'))).toBe(true);
  });
});
