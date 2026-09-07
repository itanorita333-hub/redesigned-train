export function getDefaultEditorToolMode() {
  return 'media';
}

export function shouldExitEditUIWhenDisabled({
  editModeEnabled,
  editorOpen,
  hasUnsavedChanges
}) {
  if (editModeEnabled) return false;
  return Boolean(editorOpen || hasUnsavedChanges);
}
