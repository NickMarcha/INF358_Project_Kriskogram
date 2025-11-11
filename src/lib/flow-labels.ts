const TITLE_CASE_WORD = /\b\w/g;

const FLOW_MODE_LABELS: Record<string, string> = {
  visible_incoming: 'Visible Incoming Flow',
  visible_outgoing: 'Visible Outgoing Flow',
  incoming: 'Visible Incoming Flow',
  outgoing: 'Visible Outgoing Flow',
  year_incoming: 'Total Incoming Flow (Year)',
  year_outgoing: 'Total Outgoing Flow (Year)',
  net_visible: 'Visible Net Flow',
  net_year: 'Total Net Flow (Year)',
  self_year: 'Self Flow (Year)',
};

const FLOW_FIELD_LABELS: Record<string, string> = {
  total_incoming_visible: FLOW_MODE_LABELS.visible_incoming,
  total_outgoing_visible: FLOW_MODE_LABELS.visible_outgoing,
  total_incoming_year: FLOW_MODE_LABELS.year_incoming,
  total_outgoing_year: FLOW_MODE_LABELS.year_outgoing,
  net_flow_visible: FLOW_MODE_LABELS.net_visible,
  net_flow_year: FLOW_MODE_LABELS.net_year,
  self_flow_year: FLOW_MODE_LABELS.self_year,
  temporal_overlay_past_total: 'Overlay Past Total',
  temporal_overlay_future_total: 'Overlay Future Total',
  temporal_overlay_delta: 'Overlay Δ (Future - Past)',
};

const GENERAL_LABEL_OVERRIDES: Record<string, string> = {
  id: 'ID',
  label: 'Label',
  value: 'Migrants',
  moe: 'Margin of Error (MOE)',
};

const toTitleCase = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(TITLE_CASE_WORD, (match) => match.toUpperCase());

export const formatFlowModeLabel = (mode: string) =>
  FLOW_MODE_LABELS[mode] ?? toTitleCase(mode);

export const formatDynamicFieldLabel = (field: string) =>
  FLOW_FIELD_LABELS[field] ??
  GENERAL_LABEL_OVERRIDES[field] ??
  toTitleCase(field.replace(/\./g, ' '));

export const isInternalFieldKey = (field: string) => field.startsWith('_');

export const FLOW_MODE_LABEL_ENTRIES = Object.entries(FLOW_MODE_LABELS);


