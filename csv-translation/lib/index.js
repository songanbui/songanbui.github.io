/*
  @license
  CSV Translation Tool
  v1.0.0
  https://github.com/songanbui/csv-translation
  License: MIT
*/

/**
 * Parse an Array of CSV Files into an Array of CSV Object (Papaparse).
 * @param {Array<File>} files
 * @returns {Promise}
 * @private
 */
const _parseCSVFiles = async (files) => {
  const parsePromises = files.map(file => new Promise(((resolve) => {
    Papa.parse(file, {
      complete: resolve,
    });
  })));
  return Promise.all(parsePromises);
};

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

const _translateUnit = (currentUnit, dictionary) => {
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

/**
 * Translate a CSV content file using a CSV dictionary file.
 * @param {Array} content
 * @param {Array} dictionary
 * @param {String} contentFormat - the CSV format of the contentFile
 * @param {Boolean} autosplit - Whether to split multi-lines in dictionary
 * @return {Promise}
 * @private
 */
const _translate = (content, dictionary, contentFormat, autosplit) => {
  // Compute options specific to CSV format
  let startIndex = 0; // Index of row from where to start the translation
  let multipleLanguages = false;
  switch (contentFormat) {
    case 'PowerCMS':
      startIndex = 1;
      break;
    case 'MultipleLanguages':
      startIndex = 0;
      multipleLanguages = true;
      break;
    default:
    case 'Standard':
      startIndex = 0;
      break;
  }

  // If multiple languages, split the dictionaries per language
  let dictionaries = [];
  if (multipleLanguages) {
    const numberOfLanguages = dictionary[0].length - 1;
    for (let d = 0; d < numberOfLanguages; d++) {
      let dic = dictionary.map((fullDic) => {
        return [fullDic[0], fullDic[d+1]];
      });
      dictionaries.push(dic);
    }
  } else {
    dictionaries.push(dictionary);
  }

  // Split dictionary cells containing multiple lines in 1 cell/line
  if (autosplit === true) {
    dictionaries.forEach((dictionary, dicIndex) => {

      // Loop in dictionary translation
      const length = dictionary.length;
      for (let r = 0; r < length; r++) {
        let current = dictionary[r][0];
        let translation = dictionary[r][1];

        if (current !== undefined && translation !== undefined) {
          const currentSplits = current.split(/[\r\n]+/gm);
          const translationSplits = translation.split(/[\r\n]+/gm);
          if (currentSplits.length > 1) {
            if (currentSplits.length === translationSplits.length) {
              for (let s = 0; s < currentSplits.length; s++) {
                dictionary.push([currentSplits[s].trim(), translationSplits[s].trim()]);
              }
            } else {
              console.error(`Autosplit error: could not split multi-lines cell on Column ${dicIndex+2} Row ${r+1} of the dictionary.`);
            }
          }
        }
      }
    });
  }

  /** ---- * */
  /** Reorder dictionary by biggest length value * */
  /** ---- * */
  dictionaries.forEach((dictionary) => {
    dictionary.sort((a, b) => b[0].length - a[0].length);
  });

  /** ---- * */
  /** Translation algorithm * */
  /** ---- * */
  const translation = content.slice(0, startIndex);
  for (let r = startIndex; r < content.length; r++) {
    const currentRow = content[r];
    const translatedRow = [];

    // If multiple languages, we only translate the first column of the Content CSV and keep it in result
    if (multipleLanguages) {
      translatedRow.push(currentRow[0]);
    }

    // Translate each cell of the row
    dictionaries.forEach((dictionary) => {
      for (let c = 0; c < (multipleLanguages ? 1 : currentRow.length); c++) {
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
                    const valid = parsedLine.every(unit => typeof unit === 'object' && typeof unit.type === 'string');
                    if (valid) {
                      // Translate each unit.content
                      const translatedArray = [];
                      for (let pl = 0; pl < parsedLine.length; pl++) {
                        const currentUnit = parsedLine[pl];
                        translatedArray.push(_translateUnit(currentUnit, dictionary));
                      }
                      translatedLine = JSON.stringify(translatedArray);
                    } else {
                      // Not expected (no implementation). Keep as-is.
                      translatedLine = currentLine;
                    }
                  } else if (typeof parsedLine === 'object') { // Check if parsed object is an Object
                    translatedLine = JSON.stringify(_translateUnit(parsedLine, dictionary));
                  } else {
                    // Translate value as-is
                    translatedLine = _findInDictionary(currentLine, dictionary);
                  }
                } catch (error) {
                  // Translate value as-is
                  translatedLine = _findInDictionary(currentLine, dictionary);
                }
              }

              translatedLines.push(translatedLine);
            }
            translatedCell = translatedLines.join('\n');
          } else {
            // Translate value as-is
            translatedCell = _findInDictionary(currentCell, dictionary);
          }
        }

        translatedRow.push(translatedCell);
      }

    });

    translation.push(translatedRow);
  }
  return translation;
};

/**
 * Handler of input 'change' event (i.e once a file has been selected).
 * @param {Element} element - Either context(#input-content) or dictionary(#input-dictionary)
 * @returns {Function} onDictionaryFileSelection
 * @private
 */
const _onFileSelection = (element => function onDictionaryFileSelection(event) {
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

    // Parse files
    const files = [contentInput.files[0], dictionaryInput.files[0]];
    const parsedCSV = await _parseCSVFiles(files);

    // Translate
    const translation = await _translate(parsedCSV[0].data, parsedCSV[1].data, format, autosplit);

    // Check selected quoteChar
    const quoteCharInput = document.getElementById('input-quotechar').getElementsByClassName('input-text')[0];
    const quoteChar = quoteCharInput.value;

    // Parse back to CSV string
    const translatedCSV = Papa.unparse(translation, {
      quotes: false,
      quoteChar: (quoteChar.length === 1) ? quoteChar : '"',
    });

    // Check selected encoding
    const encodingSelector = document.getElementById('select-encoding');
    const encoding = encodingSelector.value;

    let fileData;
    const fileOpts = {};
    if (encoding === 'SJIS') {
      // Encode in Shift-JIS
      const strArray = Encoding.stringToCode(translatedCSV);
      const sjisArray = Encoding.convert(strArray, 'SJIS', 'UNICODE');
      fileData = new Uint8Array(sjisArray);
      fileOpts.type = 'text/csv';
    } else {
      fileData = translatedCSV;
      fileOpts.encoding = 'UTF-8';
      fileOpts.type = 'text/csv;charset=UTF-8';
    }

    // Download as a CSV file
    const universalBOM = '\uFEFF';
    const csvFile = new Blob([universalBOM + fileData], fileOpts);
    const fileName = `${contentInput.files[0].name.substring(0, contentInput.files[0].name.length - 4)}_TRANSLATED.csv`;
    saveAs(csvFile, fileName); // FileSaver

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
