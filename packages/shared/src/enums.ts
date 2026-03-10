export const Role = { LAWYER: 'LAWYER', CLIENT: 'CLIENT' } as const;
export type Role = (typeof Role)[keyof typeof Role];

export const CaseStatus = {
  INTAKE: 'INTAKE', ANALYSIS: 'ANALYSIS', PREPARATION: 'PREPARATION',
  FILED: 'FILED', AWAITING: 'AWAITING', COMPLETED: 'COMPLETED',
} as const;
export type CaseStatus = (typeof CaseStatus)[keyof typeof CaseStatus];

export const CaseCategory = {
  FAMILY: 'FAMILY', CIVIL: 'CIVIL', COMMERCIAL: 'COMMERCIAL', CRIMINAL: 'CRIMINAL',
  MIGRATION: 'MIGRATION', REALESTATE: 'REALESTATE', LABOR: 'LABOR', OTHER: 'OTHER',
} as const;
export type CaseCategory = (typeof CaseCategory)[keyof typeof CaseCategory];

export const Urgency = { URGENT: 'URGENT', WEEK: 'WEEK', NORMAL: 'NORMAL' } as const;
export type Urgency = (typeof Urgency)[keyof typeof Urgency];

export const AppointmentStatus = {
  PENDING: 'PENDING', CONFIRMED: 'CONFIRMED', CANCELLED: 'CANCELLED', COMPLETED: 'COMPLETED',
} as const;
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const AppointmentType = { FREE: 'FREE', CONSULT: 'CONSULT', ANALYSIS: 'ANALYSIS' } as const;
export type AppointmentType = (typeof AppointmentType)[keyof typeof AppointmentType];

export const DocumentStatus = {
  DRAFT: 'DRAFT', PENDING_SIGNATURE: 'PENDING_SIGNATURE', READY: 'READY', ARCHIVED: 'ARCHIVED',
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const NotificationType = {
  CASE_UPDATE: 'CASE_UPDATE', APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER',
  DOCUMENT_READY: 'DOCUMENT_READY', MESSAGE: 'MESSAGE', SYSTEM: 'SYSTEM',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
