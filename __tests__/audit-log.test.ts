/**
 * Tests for audit-log — writeAuditLog fire-and-forget behaviour.
 * @jest-environment node
 */

jest.mock("@/lib/supabase/server", () => ({
  createServiceClient: jest.fn(),
}));

import { writeAuditLog } from "@/lib/audit-log";
import { createServiceClient } from "@/lib/supabase/server";

const mockCreateClient = createServiceClient as jest.Mock;

function makeClient(insertError: Error | null = null) {
  const mockInsert = jest.fn().mockResolvedValue({ error: insertError });
  const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
  return { client: { from: mockFrom }, mockFrom, mockInsert };
}

beforeEach(() => {
  mockCreateClient.mockReset();
});

const baseEvent = {
  adminId: "user-123",
  action: "sif_settings.update" as const,
  targetType: "sif_settings",
};

describe("writeAuditLog", () => {
  it("inserts the audit event into audit_logs table", async () => {
    const { client, mockInsert } = makeClient();
    mockCreateClient.mockResolvedValueOnce(client);

    await writeAuditLog(baseEvent);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_id: "user-123",
        action: "sif_settings.update",
        target_type: "sif_settings",
      })
    );
  });

  it("includes targetId and metadata in the insert payload", async () => {
    const { client, mockInsert } = makeClient();
    mockCreateClient.mockResolvedValueOnce(client);

    await writeAuditLog({
      ...baseEvent,
      targetId: "record-456",
      metadata: { field: "base_url", newValue: "https://example.com" },
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        target_id: "record-456",
        metadata: { field: "base_url", newValue: "https://example.com" },
      })
    );
  });

  it("uses null for targetId and empty object for metadata when absent", async () => {
    const { client, mockInsert } = makeClient();
    mockCreateClient.mockResolvedValueOnce(client);

    await writeAuditLog(baseEvent);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ target_id: null, metadata: {} })
    );
  });

  it("does not throw when the insert returns an error", async () => {
    const { client } = makeClient(new Error("DB constraint violation"));
    mockCreateClient.mockResolvedValueOnce(client);

    await expect(writeAuditLog(baseEvent)).resolves.toBeUndefined();
  });

  it("does not throw when createServiceClient itself throws", async () => {
    mockCreateClient.mockRejectedValueOnce(new Error("Supabase unavailable"));

    await expect(writeAuditLog(baseEvent)).resolves.toBeUndefined();
  });
});
