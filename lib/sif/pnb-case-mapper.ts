import type { SifCaseResult, SifMilestone } from "./types";

export interface PnbMilestone {
  title?: string;
  date?: string;
  status?: string;
}

export interface PnbStage {
  title?: string;
  stageType?: string;
  stageStatus?: string;
  startDate?: string;
  deadlineDate?: string;
  remainingDays?: number;
  milestones: PnbMilestone[];
}

export interface PnbContact {
  name: string;
  role?: string;
  roleDescription?: string;
  email?: string;
  phone?: string;
}

export interface PnbEstate {
  estateNumber?: string;
  address?: string;
}

export interface PnbCaseItem {
  recno: number;
  caseNumber: string;
  title: string;
  status?: string;
  date?: string;
  lastChangedDate?: string;
  caseTypeDescription?: string;
  url?: string;
  contacts: PnbContact[];
  estates: PnbEstate[];
  stages: PnbStage[];
  /** Case-level milestones not tied to a specific stage */
  milestones: PnbMilestone[];
}

export function mapMilestones(ms: SifMilestone[] | undefined): PnbMilestone[] {
  return (ms ?? []).map((m) => ({
    title: m.Title,
    date: m.Date || m.DeadlineDate || m.Deadline || m.DueDate || m.ActualDate || m.PlannedDate || m.StartDate || m.CompletedDate || undefined,
    status: m.StatusDescription ?? m.Status,
  }));
}

export function mapPnbCase(raw: SifCaseResult, baseUrl = ""): PnbCaseItem {
  return {
    recno: raw.Recno,
    caseNumber: raw.CaseNumber,
    title: raw.Title,
    status: raw.Status,
    date: raw.Date,
    lastChangedDate: raw.LastChangedDate,
    caseTypeDescription: raw.CaseTypeDescription,
    url: raw.URL
      ? raw.URL.startsWith("/")
        ? `${baseUrl}${raw.URL}`
        : raw.URL
      : undefined,
    contacts: (raw.Contacts ?? []).map((c) => ({
      name: c.ContactName ?? "",
      role: c.Role,
      roleDescription: c.RoleDescription,
      email: c.Email,
      phone: c.Phone,
    })),
    estates: (raw.CaseEstates ?? []).map((e) => ({
      estateNumber: e.EstateNumber,
      address: [e.Address?.StreetAddress, e.Address?.ZipCode, e.Address?.ZipPlace]
        .filter(Boolean)
        .join(" "),
    })),
    stages: (raw.Stages ?? []).map((s) => ({
      title: s.Title,
      stageType: s.StageType?.Description,
      stageStatus: s.StageStatus?.Description,
      startDate: s.StartDate,
      deadlineDate: s.DeadlineDate,
      remainingDays: s.RemainingDays,
      milestones: mapMilestones(s.Milestones),
    })),
    milestones: mapMilestones(raw.Milestones),
  };
}
