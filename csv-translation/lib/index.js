/*
  @license
  CSV Translation Tool
  v1.0.0
  https://github.com/songanbui/csv-translation
  License: MIT
*/

/**
 * Parse a file into a readable String.
 * @param {File} file
 * @returns {Promise}
 * @private
 */
const _parseFile = async (file) => new Promise((resolve) => {
  const r = new FileReader();
  r.onload = function (e) {
    const contents = e.target.result;
    resolve(contents);
  };
  r.readAsText(file);
});

/**
 * Parse a CSV File into a CSV Object (Papaparse).
 * @param {File} file
 * @returns {Promise}
 * @private
 */
const _parseCSVFile = async (file) => new Promise(((resolve) => {
  Papa.parse(file, {
    complete: resolve,
  });
}));

const _findInDictionary = (value, dictionary) => {
  let result = value;
  // Check value is not empty string
  if (typeof value === 'string' && value !== '') {
    // Look in dictionary translation
    for (let r = 0; r < dictionary.length; r++) {
      const current = dictionary[r][0];
      const translation = dictionary[r][1];
      if ((typeof current === 'string') && current !== '') {
        if (current === result) {
          // If exact match, replace totally and break
          result = translation;
          break;
        } else if (value.indexOf(current) !== -1) {
          // If partial match, replace and continue
          // If sentence finishes by 。(Japanese punctuation), add a space
          if (current.charAt(current.length - 1) === '。') {
            result = result.replace(current, `${translation} `);
          } else {
            result = result.replace(current, translation);
          }
        }
      }
    }
  }

  // // Check result has leading or trailing spaces
  // let regex = /^\s+|\s+$/g;
  // if (regex.test(result)) {
  //   result = '"' + result + '"';
  // }

  return result;
};

const _translateUnitPowerCMS = (currentUnit, dictionary) => {
  const translatedItem = JSON.parse(JSON.stringify(currentUnit));

  switch (currentUnit.type.toLowerCase()) {
    case 'text': {
      translatedItem.content = _findInDictionary(currentUnit.content, dictionary);
      break;
    }
    case 'headline': {
      translatedItem['headline-text'] = _findInDictionary(currentUnit['headline-text'], dictionary);
      break;
    }
    case 'image': {
      try {
        // Parse unit.content (expect an Array)
        const imageContents = JSON.parse(currentUnit.content);

        if (Array.isArray(imageContents) && imageContents.length > 0) {
          const translatedImageContents = [];
          for (let ic = 0; ic < imageContents.length; ic++) {
            const currentImageContent = imageContents[ic];
            const translatedImageContent = JSON.parse(JSON.stringify(currentImageContent));
            translatedImageContent.alt = _findInDictionary(currentImageContent.alt, dictionary);
            translatedImageContent.description = _findInDictionary(currentImageContent.description, dictionary);
            translatedImageContent.title = _findInDictionary(currentImageContent.title, dictionary);
            translatedImageContents.push(translatedImageContent);
          }
          translatedItem.content = JSON.stringify(translatedImageContents);
        }
      } catch (error) {
        console.error('Error when trying to parse image unit.');
        console.error(currentUnit);
      }
      break;
    }
    case 'link': {
      try {
        // Parse unit.content (expect an Array)
        const linkContents = JSON.parse(currentUnit.content);

        if (Array.isArray(linkContents) && linkContents.length > 0) {
          const translatedLinkContents = [];
          for (let lc = 0; lc < linkContents.length; lc++) {
            const currentLinkContent = linkContents[lc];
            const translatedLinkContent = JSON.parse(JSON.stringify(currentLinkContent));
            translatedLinkContent.description = _findInDictionary(currentLinkContent.description, dictionary);
            translatedLinkContent.title = _findInDictionary(currentLinkContent.title, dictionary);
            translatedLinkContents.push(translatedLinkContent);
          }
          translatedItem.content = JSON.stringify(translatedLinkContents);
        }
      } catch (error) {
        console.error('Error when trying to parse link unit.');
        console.error(currentUnit);
      }
      break;
    }
    case 'html': {
      const noLineBreak = currentUnit.content.replace(/(<br>\n|<br>)/gm, '');
      // noLineBreak = noLineBreak.content.replace(/(<br>)/gm, '');
      // var noLineBreak = currentUnit['content'].replace(/(\r\n|\n|\r|<br>)/gm, "");
      translatedItem.content = _findInDictionary(noLineBreak, dictionary);
      break;
    }
    case 'rich-text': {
      const noLineBreak = currentUnit.content.replace(/(<br>\n|<br>)/gm, '');
      // noLineBreak = noLineBreak.content.replace(/(<br>)/gm, '');
      // var noLineBreak = currentUnit['content'].replace(/(\r\n|\n|\r|<br>)/gm, "");
      translatedItem.content = _findInDictionary(noLineBreak, dictionary);
      break;
    }
    case 'accordion': {
      translatedItem['accordion-title'] = _findInDictionary(currentUnit['accordion-title'], dictionary);
      const noLineBreak = currentUnit['accordion-body'].replace(/(<br>\n|<br>)/gm, '');
      // noLineBreak = noLineBreak['accordion-body'].replace(/(<br>)/gm, '');
      // var noLineBreak = currentUnit['accordion-body'].replace(/(\r\n|\n|\r|<br>)/gm, "");
      translatedItem['accordion-body'] = _findInDictionary(noLineBreak, dictionary);
      break;
    }
    case 'table': {
      // TODO: content
      break;
    }
    default: {
      // NO OP
    }
  }

  return translatedItem;
};

const _translateUnitCraftCMS = (currentUnit, dictionary) => {
  const translatedItem = JSON.parse(JSON.stringify(currentUnit));

  switch (currentUnit.type.toLowerCase()) {
    case 'headline': {
      translatedItem.fields.headline_text = _findInDictionary(currentUnit.fields.headline_text, dictionary);
      break;
    }
    case 'link': {
      translatedItem.fields.link_text = _findInDictionary(currentUnit.fields.link_text, dictionary);
      break;
    }
    case 'html': {
      const noLineBreak = currentUnit.fields.html_text.replace(/(<br>\n|<br>)/gm, '');
      translatedItem.fields.html_text = _findInDictionary(noLineBreak, dictionary);
      break;
    }
    case 'richtext': {
      const noLineBreak = currentUnit.fields.richtext_text.replace(/(<br>\n|<br>)/gm, '');
      translatedItem.fields.richtext_text = _findInDictionary(noLineBreak, dictionary);
      break;
    }
    case 'image_text': {
      const noLineBreak = currentUnit.fields.image_text_text.replace(/(<br>\n|<br>)/gm, '');
      translatedItem.fields.image_text_text = _findInDictionary(noLineBreak, dictionary);
      break;
    }
    default: {
      // NO OP
    }
  }

  return translatedItem;
};

/**
 * Translate a CSV content file using a CSV dictionary file.
 * @param {Array} content
 * @param {Array} dictionary
 * @param {String} contentFormat - the CSV format of the contentFile
 * @param {Boolean} autosplit - Whether to split multi-lines in dictionary
 * @param {Array<String>} charsToEscape - Characters to be escaped in first position of each cell of dictionary
 * @return {Promise}
 * @private
 */
const _translate = (content, dictionary, contentFormat, autosplit, charsToEscape) => {
  // If multiple languages, split the dictionaries per language
  const multipleLanguages = dictionary[0].length > 2;
  // let multipleLanguages = false;
  const dictionaries = [];
  if (multipleLanguages) {
    const numberOfLanguages = dictionary[0].length - 1;
    for (let d = 0; d < numberOfLanguages; d++) {
      const dic = dictionary.map((fullDic) => [fullDic[0], fullDic[d + 1]]);
      dictionaries.push(dic);
    }
  } else {
    dictionaries.push(dictionary);
  }

  // Split dictionary cells containing multiple lines in 1 cell/line
  if (autosplit === true) {
    dictionaries.forEach((dic, dicIndex) => {
      // Loop in dictionary translation
      const { length } = dic;
      for (let r = 0; r < length; r++) {
        const current = dic[r][0];
        const translation = dic[r][1];

        if (current !== undefined && translation !== undefined) {
          const currentSplits = current.split(/[\r\n]+/gm);
          const translationSplits = translation.split(/[\r\n]+/gm);
          if (currentSplits.length > 1) {
            if (currentSplits.length === translationSplits.length) {
              for (let s = 0; s < currentSplits.length; s++) {
                dic.push([currentSplits[s].trim(), translationSplits[s].trim()]);
              }
            } else {
              console.error(`Autosplit error: could not split multi-lines cell on Column ${dicIndex + 2} Row ${r + 1} of the dictionary.`);
            }
          }
        }
      }
    });
  }

  /** ---- * */
  /** Escape characters on first position of each dictionary cell
  /** ---- * */
  if (charsToEscape.length > 0) {
    dictionaries.forEach((dic) => {
      // Loop in dictionary translation
      for (let r = 0; r < dic.length; r++) {
        for (let c = 0; c < dic[r].length; c++) {
          if (dic[r][c] !== undefined && charsToEscape.indexOf(dic[r][c].charAt(0)) !== -1) {
            // eslint-disable-next-line no-param-reassign
            dic[r][c] = dic[r][c].substr(1);
          }
        }
      }
    });
  }

  /** ---- * */
  /** Reorder dictionary by biggest length value * */
  /** ---- * */
  dictionaries.forEach((dic) => {
    dic.sort((a, b) => b[0].length - a[0].length);
  });

  /** ---- * */
  /** Translation algorithm * */
  /** ---- * */
  const translations = [];
  dictionaries.forEach((dic) => {
    switch (contentFormat) {
      /* ===== CraftCMS JSON Algorithm ==== */
      case 'CraftCMS': {
        const parsed = JSON.parse(content);
        const translation = JSON.parse(content);

        // Check if parsed object is an Array, then loop
        if (Array.isArray(parsed)) {
          for (let e = 0; e < parsed.length; e++) {
            const entry = parsed[e];
            const keys = Object.keys(entry);

            // Loop in all properties of each entry
            for (let k = 0; k < keys.length; k++) {
              const key = keys[k];
              switch (typeof entry[key]) {
                case 'object': {
                  if (key === 'tipunit') {
                    // Loop in all units
                    const unitKeys = Object.keys(entry[key]);
                    for (let u = 0; u < unitKeys.length; u++) {
                      const unitKey = unitKeys[u];
                      const unit = entry[key][unitKey];
                      translation[e][key][unitKey] = _translateUnitCraftCMS(unit, dic);
                    }
                  } else {
                    // NO OP
                  }
                  break;
                }
                case 'string': {
                  // Translate value as-is
                  translation[e][key] = _findInDictionary(entry[key], dic);
                  break;
                }
                default: {
                  // NO OP
                }
              }
            }
          }

          translations.push(translation);
        } else {
          // unexpected
          throw new Error('Unexpected non-array JSON');
        }
        break;
      }

      /* ===== PowerCMS CSV Algorithm ==== */
      default:
      case 'Standard':
      case 'PowerCMS': {
        // Compute options specific to CSV format
        let startIndex = 0; // Index of row from where to start the translation
        switch (contentFormat) {
          case 'PowerCMS':
            startIndex = 1;
            break;
          default:
          case 'Standard':
            startIndex = 0;
            break;
        }

        const translation = content.slice(0, startIndex);

        for (let r = startIndex; r < content.length; r++) {
          const currentRow = content[r];
          const translatedRow = [];

          for (let c = 0; c < currentRow.length; c++) {
            const currentCell = currentRow[c];
            let translatedCell;

            // Check if cell is empty
            if (currentCell === '') {
              translatedCell = currentCell;
            } else {
              // Check if cell is multi-line
              const lines = currentCell.split('\n');
              if (lines.length > 1) {
                const translatedLines = [];
                for (let l = 0; l < lines.length; l++) {
                  const currentLine = lines[l];
                  let translatedLine = '';

                  // Check if line is empty
                  if (currentLine === '') {
                    translatedLine = currentLine;
                  } else {
                    // Try to parse the line as JSON
                    try {
                      const parsedLine = JSON.parse(currentLine);

                      // Check if parsed object is an Array
                      if (Array.isArray(parsedLine)) {
                        // Check all units are object formatted in an expected way
                        const valid = parsedLine.every((unit) => typeof unit === 'object' && typeof unit.type === 'string');
                        if (valid) {
                          // Translate each unit.content
                          const translatedArray = [];
                          for (let pl = 0; pl < parsedLine.length; pl++) {
                            const currentUnit = parsedLine[pl];
                            translatedArray.push(_translateUnitPowerCMS(currentUnit, dic));
                          }
                          translatedLine = JSON.stringify(translatedArray);
                        } else {
                          // Not expected (no implementation). Keep as-is.
                          translatedLine = currentLine;
                        }
                      } else if (typeof parsedLine === 'object') { // Check if parsed object is an Object
                        translatedLine = JSON.stringify(_translateUnitPowerCMS(parsedLine, dic));
                      } else {
                        // Translate value as-is
                        translatedLine = _findInDictionary(currentLine, dic);
                      }
                    } catch (error) {
                      // Translate value as-is
                      translatedLine = _findInDictionary(currentLine, dic);
                    }
                  }

                  translatedLines.push(translatedLine);
                }
                translatedCell = translatedLines.join('\n');
              } else {
                // Translate value as-is
                translatedCell = _findInDictionary(currentCell, dic);
              }
            }

            translatedRow.push(translatedCell);
          }

          translation.push(translatedRow);
        }
        translations.push(translation);
        break;
      }
    }
  });
  return translations;
};

/**
 * Generate a Blob object from String data.
 * @param {String} data - the data to generate a Blob from.
 * @param {String} contentType - the Content-Type of the Blob.
 * @param {String} encoding - the Encoding of the Blob
 * @private
 */
const _generateBlob = (data, contentType, encoding) => {
  let fileData;
  const fileOpts = {};
  if (encoding === 'SJIS') {
    // Encode in Shift-JIS
    const strArray = Encoding.stringToCode(data);
    const sjisArray = Encoding.convert(strArray, 'SJIS', 'UNICODE');
    fileData = new Uint8Array(sjisArray);
    fileOpts.type = contentType;
  } else {
    fileData = data;
    fileOpts.encoding = 'UTF-8';
    fileOpts.type = `${contentType};charset=UTF-8`;
  }

  // Download file
  const universalBOM = '\uFEFF';
  return new Blob([universalBOM + fileData], fileOpts);
};

/**
 * Handler of input 'change' event (i.e once a file has been selected).
 * @param {Element} element - Either context(#input-content) or dictionary(#input-dictionary)
 * @returns {Function} onDictionaryFileSelection
 * @private
 */
const _onFileSelection = ((element) => function onDictionaryFileSelection(event) {
  const label = element.getElementsByClassName('input-path')[0];

  // Check a valid file has been selected
  if (event.currentTarget.files.length === 1 && event.currentTarget.files[0] instanceof File) {
    // Update input-path (label)
    const file = event.currentTarget.files[0];
    label.value = file.name;
    label.classList.remove('error');
  } else {
    label.classList.add('error');
  }
});

/**
 * Handler of button 'submit' event.
 * @returns {Promise<void>}
 * @private
 */
const _onSubmit = async () => {
  // Content CSV
  const content = document.getElementById('input-content');
  const contentInput = content.getElementsByClassName('input-file')[0];

  // Dictionary CSV
  const dictionary = document.getElementById('input-dictionary');
  const dictionaryInput = dictionary.getElementsByClassName('input-file')[0];

  let error = 0;
  // Check a valid content file has been selected
  if (contentInput.files.length !== 1 || !(contentInput.files[0] instanceof File)) {
    error++;
    const contentLabel = content.getElementsByClassName('input-path')[0];
    contentLabel.classList.add('error');
  }

  // Check a valid content file has been selected
  if (dictionaryInput.files.length !== 1 || !(dictionaryInput.files[0] instanceof File)) {
    error++;
    const dictionaryLabel = dictionary.getElementsByClassName('input-path')[0];
    dictionaryLabel.classList.add('error');
  }

  if (error === 0) {
    // Set loading mask
    const loadingMask = document.getElementById('loading-mask');
    loadingMask.classList.add('active');

    // Check Input CSV format
    const formatSelector = document.getElementById('select-format');
    const format = formatSelector.value;

    // Check Autosplit
    const autoSplitRadio = document.getElementById('radio-autosplit');
    const autosplit = autoSplitRadio.checked;

    // Check EscapeChar
    const escapeCharInput = document.getElementById('input-escapechar').getElementsByClassName('input-text')[0];
    const escapeChars = escapeCharInput.value.trim();
    let charsToEscape = escapeChars.split('|');
    if (charsToEscape.length === 1 && charsToEscape[0] === escapeChars) {
      charsToEscape = escapeChars.split('｜');
    }
    charsToEscape = charsToEscape.filter((item) => item);

    // Parse content
    let parsed;
    switch (contentInput.files[0].type) {
      case 'text/csv':
      case 'application/vnd.ms-excel':
        // eslint-disable-next-line no-case-declarations
        const parsedCSV = await _parseCSVFile(contentInput.files[0]);
        parsed = parsedCSV.data;
        break;
      case 'application/json':
        parsed = await _parseFile(contentInput.files[0]);
        break;
      case 'text/html':
      default:
        // eslint-disable-next-line no-case-declarations
        const defaultParsed = await _parseFile(contentInput.files[0]);
        parsed = [[defaultParsed]];
        break;
    }

    // Parse dictionary
    const dic = await _parseCSVFile(dictionaryInput.files[0]);

    // Translate
    const translation = await _translate(parsed, dic.data, format, autosplit, charsToEscape);

    // Check selected quoteChar
    const quoteCharInput = document.getElementById('input-quotechar').getElementsByClassName('input-text')[0];
    const quoteChar = quoteCharInput.value;

    // Check Data and Content-Type of output file
    let data;
    let fileContentType;
    switch (contentInput.files[0].type) {
      case 'text/csv':
      case 'application/vnd.ms-excel':
        // Parse back to CSV string
        if (translation.length > 1) {
          data = translation.map((t) => Papa.unparse(t, {
            quotes: false,
            quoteChar: (quoteChar.length === 1) ? quoteChar : '"',
          }));
        } else {
          data = Papa.unparse(translation[0], {
            quotes: false,
            quoteChar: (quoteChar.length === 1) ? quoteChar : '"',
          });
        }
        fileContentType = 'text/csv';
        break;
      case 'application/json':
        if (translation.length > 1) {
          data = translation.map((t) => JSON.stringify(t));
        } else {
          data = JSON.stringify(translation[0]);
        }
        fileContentType = contentInput.files[0].type;
        break;
      case 'text/html':
      default:
        if (translation.length > 1) {
          data = translation.map((t) => t[0][0]);
        } else {
          // eslint-disable-next-line prefer-destructuring
          data = translation[0][0][0];
        }
        fileContentType = contentInput.files[0].type;
        break;
    }

    // Check selected encoding
    const encodingSelector = document.getElementById('select-encoding');
    const encoding = encodingSelector.value;

    // Check input file extension
    let fileExtension = contentInput.files[0].name.split('.');
    fileExtension = fileExtension[fileExtension.length - 1];

    // Generate blob to be saved
    let blob;
    let fileName;
    if (typeof data === 'string') {
      blob = _generateBlob(data, fileContentType, encoding);
      fileName = `${contentInput.files[0].name.substring(0, contentInput.files[0].name.length - fileExtension.length - 1)}_TRANSLATED.${fileExtension}`;
    } else if (Array.isArray(data)) {
      const dataBlobs = data.map((item) => _generateBlob(item, fileContentType, encoding));
      const zip = new JSZip();
      dataBlobs.forEach((item, idx) => {
        const itemFileName = `${contentInput.files[0].name.substring(0, contentInput.files[0].name.length - fileExtension.length - 1)}_TRANSLATED_${idx + 1}.${fileExtension}`;
        zip.file(itemFileName, item);
      });
      blob = await zip.generateAsync({ type: 'blob' });
      fileName = `${contentInput.files[0].name}.TRANSLATED.zip`;
    }

    // Save the blob
    saveAs(blob, fileName); // FileSaver

    // Unset loading mask
    loadingMask.classList.remove('active');
  }
};

const init = function init() {
  /* ---- */
  /* Link buttons to file-inputs */
  /* ---- */

  // Content CSV
  const content = document.getElementById('input-content');
  const contentInput = content.getElementsByClassName('input-file')[0];
  const contentButton = content.getElementsByClassName('input-button')[0];
  contentButton.addEventListener('click', () => {
    // Trigger click on the file-input
    contentInput.click();
  });

  // Dictionary CSV
  const dictionary = document.getElementById('input-dictionary');
  const dictionaryInput = dictionary.getElementsByClassName('input-file')[0];
  const dictionaryButton = dictionary.getElementsByClassName('input-button')[0];
  dictionaryButton.addEventListener('click', () => {
    // Trigger click on the file-input
    dictionaryInput.click();
  });

  /** ---- * */
  /** Handle files selection * */
  /** ---- * */
  contentInput.addEventListener('change', _onFileSelection(content));
  dictionaryInput.addEventListener('change', _onFileSelection(dictionary));

  /** ---- * */
  /** Handle translate button * */
  /** ---- * */
  const submit = document.getElementById('submit-button');
  submit.addEventListener('click', _onSubmit);
};

window.addEventListener('load', init);
