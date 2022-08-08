export enum DisbursementStatus {
  failed = 'failed',
  initiated = 'initiated',
  successful = 'successful',
}

export enum MarkActionType {
  markAsSuccessful = 'mark_as_successful',
  markAsFailed = 'mark_as_failed',
}

export enum ProcessingType {
  manual = 'manual',
  automatic = 'automatic',
  manualAndAutomatic = 'manual_and_automatic',
  company = 'company',
}

export enum charges {
  withPartner = 50,
  withoutPartner = 100,
}

export enum DisbursementType {
  bank = 'gain',
  charity = 'charity',
}
