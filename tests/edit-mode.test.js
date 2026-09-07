import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDefaultEditorToolMode,
  shouldExitEditUIWhenDisabled
} from '../src/edit-mode.js';

test('default editor toolbar opens the media tools so upload/file actions are visible', () => {
  assert.equal(getDefaultEditorToolMode(), 'media');
});

test('edit mode should close an active editor immediately when the toggle is turned off', () => {
  assert.equal(
    shouldExitEditUIWhenDisabled({
      editModeEnabled: true,
      editorOpen: true,
      hasUnsavedChanges: false
    }),
    false
  );

  assert.equal(
    shouldExitEditUIWhenDisabled({
      editModeEnabled: false,
      editorOpen: true,
      hasUnsavedChanges: false
    }),
    true
  );

  assert.equal(
    shouldExitEditUIWhenDisabled({
      editModeEnabled: false,
      editorOpen: true,
      hasUnsavedChanges: true
    }),
    true
  );
});
