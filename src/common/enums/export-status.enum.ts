/**
 * Export types for generating different kinds of reports
 */
export enum ExportType {
  /**
   * Complete assessment report with findings and recommendations
   */
  ASSESSMENT_REPORT = 'ASSESSMENT_REPORT',

  /**
   * High-level compliance summary
   */
  COMPLIANCE_SUMMARY = 'COMPLIANCE_SUMMARY',

  /**
   * Raw assessment data export
   */
  RAW_DATA = 'RAW_DATA',

  /**
   * Executive summary for leadership
   */
  EXECUTIVE_SUMMARY = 'EXECUTIVE_SUMMARY',

  /**
   * Audit trail and activity log
   */
  AUDIT_TRAIL = 'AUDIT_TRAIL',
}

/**
 * Export formats supported for file generation
 */
export enum ExportFormat {
  /**
   * PDF document format
   */
  PDF = 'PDF',

  /**
   * Comma-separated values format
   */
  CSV = 'CSV',

  /**
   * JSON data format
   */
  JSON = 'JSON',

  /**
   * Excel spreadsheet format
   */
  XLSX = 'XLSX',
}

/**
 * Export status indicating the current state of export generation
 */
export enum ExportStatus {
  /**
   * Export is queued for generation
   */
  PENDING = 'PENDING',

  /**
   * Export is currently being generated
   */
  GENERATING = 'GENERATING',

  /**
   * Export is ready for download
   */
  READY = 'READY',

  /**
   * Export generation failed
   */
  FAILED = 'FAILED',

  /**
   * Export has expired and is no longer available
   */
  EXPIRED = 'EXPIRED',
}

/**
 * Export scope defining what data is included in the export
 */
export enum ExportScope {
  /**
   * Single profiling run export
   */
  SINGLE_RUN = 'SINGLE_RUN',

  /**
   * Organization-wide export
   */
  ORGANIZATION = 'ORGANIZATION',

  /**
   * Date range-based export
   */
  DATE_RANGE = 'DATE_RANGE',

  /**
   * Custom filtered export
   */
  CUSTOM = 'CUSTOM',
}
