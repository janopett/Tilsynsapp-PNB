/**
 * Tests for SIF ContactService — getCaseContacts, searchEnterprises,
 * and synchronizeContactPerson.
 * @jest-environment node
 */

jest.mock("@/lib/sif/client", () => ({
  sifRpcCall: jest.fn(),
}));

import {
  getCaseContacts,
  searchEnterprises,
  synchronizeContactPerson,
} from "@/lib/sif/contact-service";
import { sifRpcCall } from "@/lib/sif/client";

const mockRpc = sifRpcCall as jest.Mock;

const rawContact = {
  Recno: 10,
  ContactName: "Kari Testesen",
  Role: "Mottaker",
  RoleDescription: "Søker",
  Email: "kari@example.com",
  Phone: "12345678",
};

beforeEach(() => {
  mockRpc.mockReset();
});

// ── getCaseContacts ──────────────────────────────────────────────────────────

describe("getCaseContacts", () => {
  it("returns empty array and skips RPC when no caseRecno or caseNumber given", async () => {
    expect(await getCaseContacts({})).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns mapped contacts via GetCaseContacts(CaseRecno) on first success", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Contacts: [rawContact] });
    const contacts = await getCaseContacts({ caseRecno: 100 });
    expect(contacts).toHaveLength(1);
    expect(contacts[0].recno).toBe(10);
    expect(contacts[0].name).toBe("Kari Testesen");
    expect(contacts[0].role).toBe("Mottaker");
    expect(contacts[0].email).toBe("kari@example.com");
  });

  it("falls back to GetCaseContacts(CaseNumber) when CaseRecno returns empty", async () => {
    mockRpc
      .mockResolvedValueOnce({ Successful: true, Contacts: [] }) // 1a: empty
      .mockResolvedValueOnce({ Successful: true, Contacts: [rawContact] }); // 1b: success

    const contacts = await getCaseContacts({ caseRecno: 100, caseNumber: "25/100" });
    expect(contacts).toHaveLength(1);
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it("falls back to GetCases(IncludeCaseContacts) when both GetCaseContacts strategies fail", async () => {
    const caseWithContacts = {
      Recno: 100,
      CaseNumber: "25/100",
      Contacts: [rawContact],
    };
    mockRpc
      .mockResolvedValueOnce({ Successful: false }) // 1a fails
      .mockResolvedValueOnce({ Successful: false }) // 1b fails
      .mockResolvedValueOnce({ Successful: true, Cases: [caseWithContacts] }); // fallback

    const contacts = await getCaseContacts({ caseRecno: 100, caseNumber: "25/100" });
    expect(contacts).toHaveLength(1);
    expect(mockRpc).toHaveBeenCalledTimes(3);
  });

  it("returns empty array when fallback GetCases returns no case", async () => {
    mockRpc
      .mockResolvedValueOnce({ Successful: false })
      .mockResolvedValueOnce({ Successful: true, Cases: [] });

    const contacts = await getCaseContacts({ caseNumber: "99/999" });
    expect(contacts).toEqual([]);
  });

  it("uses 'Contact {Recno}' as placeholder name when ContactName is absent", async () => {
    const noName = { ...rawContact, ContactName: undefined };
    mockRpc.mockResolvedValueOnce({ Successful: true, Contacts: [noName] });
    const contacts = await getCaseContacts({ caseRecno: 100 });
    expect(contacts[0].name).toBe(`Contact ${rawContact.Recno}`);
  });

  it("does not call GetCases fallback when only caseRecno is given (no caseNumber)", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: false }); // 1a fails, 1b skipped, strategy 2 needs caseNumber
    const contacts = await getCaseContacts({ caseRecno: 100 });
    expect(contacts).toEqual([]);
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
});

// ── searchEnterprises ────────────────────────────────────────────────────────

describe("searchEnterprises", () => {
  it("returns empty array for blank query", async () => {
    expect(await searchEnterprises("   ")).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("searches by EnterpriseNumber for a 9-digit org number", async () => {
    const org = { Recno: 1, Name: "Firma AS" };
    mockRpc.mockResolvedValueOnce({ Successful: true, Enterprises: [org] });
    const result = await searchEnterprises("123456789");
    expect(result).toHaveLength(1);
    // searchEnterprises does not forward a correlationId — only 3 args
    expect(mockRpc).toHaveBeenCalledWith(
      "ContactService",
      "GetEnterprises",
      expect.objectContaining({ EnterpriseNumber: "123456789" })
    );
  });

  it("strips spaces and dashes before checking 9-digit org number format", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Enterprises: [] });
    await searchEnterprises("123 456 789");
    expect(mockRpc).toHaveBeenCalledWith(
      "ContactService",
      "GetEnterprises",
      expect.objectContaining({ EnterpriseNumber: "123456789" })
    );
  });

  it("searches by Name wildcard for a non-org-number query", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Enterprises: [] });
    await searchEnterprises("Brannvesen");
    expect(mockRpc).toHaveBeenCalledWith(
      "ContactService",
      "GetEnterprises",
      expect.objectContaining({ Name: "%Brannvesen%" })
    );
  });

  it("deduplicates enterprises with the same Recno across responses", async () => {
    const dup = { Recno: 1, Name: "Firma AS" };
    mockRpc.mockResolvedValueOnce({ Successful: true, Enterprises: [dup, dup] });
    const result = await searchEnterprises("Firma");
    expect(result).toHaveLength(1);
  });

  it("gracefully returns empty when ContactService call fails", async () => {
    mockRpc.mockRejectedValueOnce(new Error("network error"));
    expect(await searchEnterprises("Firma")).toEqual([]);
  });
});

// ── synchronizeContactPerson ─────────────────────────────────────────────────

describe("synchronizeContactPerson", () => {
  const input = {
    externalId: "ext-001",
    firstName: "Kari",
    lastName: "Testesen",
    enterprise: "recno:99",
    title: "Brannvernleder",
  };

  it("returns existing Recno when contact found by name at the given enterprise", async () => {
    const existing = {
      Recno: 42,
      Name: "Kari Testesen",
      EnterpriseRecno: 99,
    };
    mockRpc.mockResolvedValueOnce({ Successful: true, ContactPersons: [existing] });

    const recno = await synchronizeContactPerson(input);
    expect(recno).toBe(42);
    expect(mockRpc).toHaveBeenCalledTimes(1); // only GetContactPersons, no Synchronize
  });

  it("calls SynchronizeContactPerson when contact is not found", async () => {
    mockRpc
      .mockResolvedValueOnce({ Successful: true, ContactPersons: [] }) // GetContactPersons
      .mockResolvedValueOnce({ Successful: true, Recno: 77 }); // SynchronizeContactPerson

    const recno = await synchronizeContactPerson(input);
    expect(recno).toBe(77);
    expect(mockRpc).toHaveBeenCalledWith(
      "ContactService",
      "SynchronizeContactPerson",
      expect.objectContaining({ ExternalId: "ext-001" }),
      undefined,
      true
    );
  });

  it("sends enterprise in recno:XXXX format to SynchronizeContactPerson", async () => {
    mockRpc
      .mockResolvedValueOnce({ Successful: true, ContactPersons: [] })
      .mockResolvedValueOnce({ Successful: true, Recno: 77 });

    await synchronizeContactPerson({ ...input, enterprise: "99" }); // bare integer
    const payload = mockRpc.mock.calls[1][2];
    expect(payload.Enterprise).toBe("recno:99");
  });

  it("omits Enterprise from payload when enterprise is a plain text name", async () => {
    mockRpc
      .mockResolvedValueOnce({ Successful: true, ContactPersons: [] })
      .mockResolvedValueOnce({ Successful: true, Recno: 77 });

    await synchronizeContactPerson({ ...input, enterprise: "Brannvesen Trondheim" });
    const payload = mockRpc.mock.calls[1][2];
    expect(payload.Enterprise).toBeUndefined();
  });

  it("throws when SynchronizeContactPerson returns Successful: false", async () => {
    mockRpc
      .mockResolvedValueOnce({ Successful: true, ContactPersons: [] })
      .mockResolvedValueOnce({ Successful: false, ErrorMessage: "Validation failed" });

    await expect(synchronizeContactPerson(input)).rejects.toThrow("Validation failed");
  });

  it("falls through to SynchronizeContactPerson when GetContactPersons lookup throws", async () => {
    mockRpc
      .mockRejectedValueOnce(new Error("lookup failed")) // GetContactPersons throws
      .mockResolvedValueOnce({ Successful: true, Recno: 55 }); // Synchronize succeeds

    const recno = await synchronizeContactPerson(input);
    expect(recno).toBe(55);
  });

  it("does not match contact found at a different enterprise", async () => {
    const wrongEnterprise = { Recno: 42, Name: "Kari Testesen", EnterpriseRecno: 999 };
    mockRpc
      .mockResolvedValueOnce({ Successful: true, ContactPersons: [wrongEnterprise] })
      .mockResolvedValueOnce({ Successful: true, Recno: 88 });

    const recno = await synchronizeContactPerson(input); // enterprise is recno:99
    expect(recno).toBe(88); // creates new instead of reusing wrong-enterprise contact
  });
});
