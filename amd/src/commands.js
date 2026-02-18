// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Recognise the speech and insert it into the editor.
 *
 * @module     tiny_dictate/commands
 * @copyright frumbert
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 *
 */
import {getButtonImage} from 'editor_tiny/utils';
import {get_string as getString} from 'core/str';
import {
    component,
    dictateButtonName,
    icon,
} from './common';

// ==========================
// Speech Recognition Engine
// ==========================

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
let recognizing = false;

if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language;
}

/**
 * Handle the action for your plugin.
 * @param {TinyMCE.editor} editor The tinyMCE editor instance.
 * @param {TinyMCE.buttonApi} buttonApi Probably the tinyMCE buttonApi instance.
 */
const handleAction = (editor, buttonApi) => {

    if (!recognition) {
        return;
    }

    recognizing = !recognizing;

    if (recognizing) {
        recognition.start();
        buttonApi.setActive(true);
    } else {
        recognition.stop();
    }

    recognition.onresult = (event) => {
        let final_transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                final_transcript += event.results[i][0].transcript;
            }
        }
        if (final_transcript) {
            editor.insertContent(final_transcript);
        }
    };

    recognition.onerror = (event) => {
        window.console.log(event);
    };

    recognition.onend = () => {
        if (recognizing) { // If recognition ends unexpectedly, restart it.
            recognition.start();
        } else {
          buttonApi.setActive(false);
        }
    };
};

export const getSetup = async() => {
    const [
        buttonTooltip,
        buttonImage,
    ] = await Promise.all([
        getString('button_toggle_dictate', component),
        getButtonImage('icon', component),
    ]);

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    return (editor) => {
        if (SpeechRecognition) {

          // Register the Moodle SVG as an icon suitable for use as a TinyMCE toolbar button.
          editor.ui.registry.addIcon(icon, buttonImage.html);

          // Register the Toolbar Button.
          editor.ui.registry.addToggleButton(dictateButtonName, {
              icon,
              tooltip: buttonTooltip,
              onAction: (buttonApi) => handleAction(editor, buttonApi),
              onSetup: (buttonApi) => {
                // When recognition ends, we need to update the button state.
                if (recognition) {
                    recognition.addEventListener('end', () => {
                        buttonApi.setActive(false);
                    });
                }
                // return () => {}; // No cleanup needed
              }
          });

        }
    };
};