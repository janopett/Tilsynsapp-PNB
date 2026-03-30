/**
 * UserService extension.
 *
 * Wraps UserService/GetUsers — not covered by the core SIF services.
 * Useful for populating inspector dropdowns, verifying AD accounts,
 * or checking which users have access to a given archive.
 */

import { sifRpcCall } from "../client";
import type {
  SifGetUsersQuery,
  SifGetUsersResult,
  SifUserResult,
} from "../types";

export type { SifUserResult };

// ── Public types ───────────────────────────────────────────────────────────

export interface GetUsersOptions {
  /** Filter by AD user ID / login name */
  userId?: string;
  /** Filter by the contact's ExternalId in 360° */
  contactExternalId?: string;
  maxResults?: number;
  correlationId?: string;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch users from the SIF/360° system.
 *
 * Without options this returns all users (up to maxResults).
 * Filter by userId to look up a specific AD account.
 *
 * Each SifUserResult includes:
 *   Login, ContactRecno, IsActive, IsServiceUser, Language,
 *   Profiles (Role, EnterpriseId, …), AccessGroups
 */
export async function getSifUsers(
  options?: GetUsersOptions
): Promise<SifUserResult[]> {
  const { userId, contactExternalId, maxResults = 50, correlationId } =
    options ?? {};

  const result = await sifRpcCall<SifGetUsersQuery, SifGetUsersResult>(
    "UserService",
    "GetUsers",
    {
      UserId: userId,
      ContactExternalId: contactExternalId,
      MaxRows: maxResults,
    },
    correlationId
  );

  if (!result.Successful) {
    console.warn("[SIF] UserService/GetUsers failed", {
      correlationId,
      error: result.ErrorMessage ?? result.ErrorDetails,
    });
    return [];
  }

  return result.Users ?? [];
}

/**
 * Look up a single user by their AD login (UserId).
 * Returns null if not found or if the request fails.
 */
export async function getSifUserByLogin(
  userId: string,
  correlationId?: string
): Promise<SifUserResult | null> {
  const users = await getSifUsers({ userId, maxResults: 1, correlationId });
  return users[0] ?? null;
}

/**
 * Return only active (non-disabled) users.
 */
export async function getActiveSifUsers(
  correlationId?: string
): Promise<SifUserResult[]> {
  const all = await getSifUsers({ correlationId });
  return all.filter((u) => u.IsActive !== false);
}
