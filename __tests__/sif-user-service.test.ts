/**
 * Tests for SIF extensions/user-service — getSifUsers, getSifUserByLogin, getActiveSifUsers.
 * @jest-environment node
 */

jest.mock("@/lib/sif/client", () => ({
  sifRpcCall: jest.fn(),
}));

import {
  getSifUsers,
  getSifUserByLogin,
  getActiveSifUsers,
} from "@/lib/sif/extensions/user-service";
import { sifRpcCall } from "@/lib/sif/client";

const mockRpc = sifRpcCall as jest.Mock;

const activeUser = { Login: "kari@example.com", ContactRecno: 42, IsActive: true };
const inactiveUser = { Login: "ola@example.com", ContactRecno: 99, IsActive: false };

beforeEach(() => {
  mockRpc.mockReset();
});

// ── getSifUsers ───────────────────────────────────────────────────────────────

describe("getSifUsers", () => {
  it("returns all users on success", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Users: [activeUser, inactiveUser] });
    const users = await getSifUsers();
    expect(users).toHaveLength(2);
    expect(users[0].Login).toBe("kari@example.com");
  });

  it("passes UserId filter to GetUsers RPC", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Users: [activeUser] });
    await getSifUsers({ userId: "kari@example.com" });
    expect(mockRpc).toHaveBeenCalledWith(
      "UserService",
      "GetUsers",
      expect.objectContaining({ UserId: "kari@example.com" }),
      undefined
    );
  });

  it("passes ContactExternalId filter to RPC", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Users: [activeUser] });
    await getSifUsers({ contactExternalId: "recno:42" });
    expect(mockRpc).toHaveBeenCalledWith(
      "UserService",
      "GetUsers",
      expect.objectContaining({ ContactExternalId: "recno:42" }),
      undefined
    );
  });

  it("returns empty array when Successful is false", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: false, ErrorMessage: "Permission denied" });
    expect(await getSifUsers()).toEqual([]);
  });

  it("returns empty array when Users field is absent", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true });
    expect(await getSifUsers()).toEqual([]);
  });

  it("defaults MaxRows to 50 when maxResults not specified", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Users: [] });
    await getSifUsers();
    expect(mockRpc).toHaveBeenCalledWith(
      "UserService",
      "GetUsers",
      expect.objectContaining({ MaxRows: 50 }),
      undefined
    );
  });
});

// ── getSifUserByLogin ─────────────────────────────────────────────────────────

describe("getSifUserByLogin", () => {
  it("returns the first matching user", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Users: [activeUser] });
    const user = await getSifUserByLogin("kari@example.com");
    expect(user?.ContactRecno).toBe(42);
  });

  it("returns null when no users found", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Users: [] });
    expect(await getSifUserByLogin("unknown@example.com")).toBeNull();
  });

  it("sets MaxRows to 1 to minimise data transfer", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Users: [] });
    await getSifUserByLogin("kari@example.com");
    expect(mockRpc).toHaveBeenCalledWith(
      "UserService",
      "GetUsers",
      expect.objectContaining({ MaxRows: 1 }),
      undefined
    );
  });
});

// ── getActiveSifUsers ─────────────────────────────────────────────────────────

describe("getActiveSifUsers", () => {
  it("filters out inactive users", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Users: [activeUser, inactiveUser] });
    const users = await getActiveSifUsers();
    expect(users).toHaveLength(1);
    expect(users[0].Login).toBe("kari@example.com");
  });

  it("returns all users when all are active", async () => {
    const two = [activeUser, { ...activeUser, Login: "per@example.com", ContactRecno: 43 }];
    mockRpc.mockResolvedValueOnce({ Successful: true, Users: two });
    expect(await getActiveSifUsers()).toHaveLength(2);
  });

  it("returns empty array when all users are inactive", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Users: [inactiveUser] });
    expect(await getActiveSifUsers()).toEqual([]);
  });
});
