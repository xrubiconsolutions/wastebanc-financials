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
}
