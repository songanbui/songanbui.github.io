/*@license
  CSV Translation Tool
  v1.0.0
  https://github.com/songanbui/csv-translation
  License: MIT
*/

let init = function () {
  /** ---- **/
  /** Link buttons to file-inputs **/
  /** ---- **/

  // Content CSV
  let content = document.getElementById('input-content');
  let contentInput = content.getElementsByClassName('input-file')[0];
  let contentButton = content.getElementsByClassName('input-button')[0];
  contentButton.addEventListener('click', function onContentButtonClick() {
    // Trigger click on the file-input
    contentInput.click();
  });

  // Dictionary CSV
  let dictionary = document.getElementById('input-dictionary');
  let dictionaryInput = dictionary.getElementsByClassName('input-file')[0];
  let dictionaryButton = dictionary.getElementsByClassName('input-button')[0];
  dictionaryButton.addEventListener('click', function onDictionaryButtonClick() {
    // Trigger click on the file-input
    dictionaryInput.click();
  });

  /** ---- **/
  /** Handle files selection **/
  /** ---- **/
  contentInput.addEventListener('change', _onFileSelection(content));
  dictionaryInput.addEventListener('change', _onFileSelection(dictionary));

  /** ---- **/
  /** Handle translate button **/
  /** ---- **/
  let submit = document.getElementById('submit-button');
  submit.addEventListener('click', function () {
    
    let error = 0;
    // Check a valid content file has been selected
    if (contentInput.files.length !== 1 || !contentInput.files[0] instanceof File) {
      error++;
      let contentLabel = content.getElementsByClassName('input-path')[0];
      contentLabel.classList.add('error');
    }

    // Check a valid content file has been selected
    if (dictionaryInput.files.length !== 1 || !dictionaryInput.files[0] instanceof File) {
      error++;
      let dictionaryLabel = dictionary.getElementsByClassName('input-path')[0];
      dictionaryLabel.classList.add('error');
    }

    if (error === 0) {
      // Set loading mask
      let loadingMask = document.getElementById('loading-mask');
      loadingMask.classList.add('active');

      // Translate
      _translate(contentInput.files[0], dictionaryInput.files[0]).then(function (translation) {

        // Parse back to CSV string
        let translatedCSV = Papa.unparse(translation);
        console.log('>>> translated csv >>>');
        console.log(translatedCSV);

        // Check selected encoding
        let encodingSelector = document.getElementById('select-encoding');
        let encoding = encodingSelector.value;

        let fileData;
        let fileOpts = {};
        if (encoding === 'SJIS') {
          // Encode in Shift-JIS
          let str_array = Encoding.stringToCode(translatedCSV);
          let sjis_array = Encoding.convert(str_array, "SJIS", "UNICODE");
          fileData = new Uint8Array(sjis_array);
          fileOpts.type = 'text/csv';
        } else {
          fileData = translatedCSV;
          fileOpts.encoding = "UTF-8";
          fileOpts.type = "text/csv;charset=UTF-8";
        }

        // Download as a CSV file
        let csvFile = new Blob([fileData], fileOpts);
        let fileName = contentInput.files[0].name.substring(0,contentInput.files[0].name.length-4) + '_TRANSLATED.csv';
        saveAs(csvFile, fileName); // FileSaver

      }).finally(function () {
        // Unset loading mask
        loadingMask.classList.remove('active');
      });
    }
  });
};

/**
 * Handler of input 'change' event (i.e once a file has been selected).
 * @param {Element} element - Either context(#input-content) or dictionary(#input-dictionary)
 * @private
 */
let _onFileSelection = function (element) {
  return function onDictionaryFileSelection(event) {
    let label = element.getElementsByClassName('input-path')[0];

    // Check a valid file has been selected
    if (event.currentTarget.files.length === 1 && event.currentTarget.files[0] instanceof File) {
      // Update input-path (label)
      let file = event.currentTarget.files[0];
      label.value = file.name;
      label.classList.remove('error');
    } else {
      label.classList.add('error');
    }
  };
};

/**
 * Translate a CSV content file using a CSV dictionary file.
 * @param {File} contentFile
 * @param {File} dictionaryFile
 * @return {Promise}
 * @private
 */
let _translate = function (contentFile, dictionaryFile) {

  /** ---- **/
  /** Parse CSV files **/
  /** ---- **/
  let parsePromises = [];

  // Content
  let parseContent = new Promise(function (resolve) {
    Papa.parse(contentFile, {
      complete: resolve
    });
  });
  parsePromises.push(parseContent);

  // Dictionary
  let parseDictionary = new Promise(function (resolve) {
    Papa.parse(dictionaryFile, {
      complete: resolve
    });
  });
  parsePromises.push(parseDictionary);

  return Promise.all(parsePromises).then(function (results) {
    /** ---- **/
    /** Reorder dictionary by biggest length value **/
    /** ---- **/
    let dictionary = results[1].data;
    console.log(dictionary);
    dictionary.sort(function (a, b) {
      return b[0].length - a[0].length;
    });
    console.log(dictionary);

    /** ---- **/
    /** Translation algorithm **/
    /** ---- **/
    let content = results[0].data;                console.log(content);
    let translation = [ content[0] ];
    for (let r = 1; r < content.length; r++) {
      let currentRow = content[r];
      let translatedRow = [];

      for (let c = 0; c < currentRow.length; c++) {
        let currentCell = currentRow[c];
        let translatedCell;

        // Check if cell is empty
        if (currentCell === '') {
          translatedCell = currentCell;
        } else {

          // Check if cell is multi-line
          let lines = currentCell.split("\n");
          if (lines.length > 1) {

            console.log('>>>lines>>>');
            console.log(lines);

            let translatedLines = [];
            for (let l = 0; l < lines.length; l++) {
              let currentLine = lines[l];
              let translatedLine = "pouet";

              // Check if line is empty
              if (currentLine === '') {
                translatedLine = currentLine;
              } else {

                // Check string starts with [ or {
                if (currentLine.charAt(0) === '[' || currentLine.charAt(0) === '{') {

                  // Try to parse the line as JSON
                  try {

                    let parsedLine = JSON.parse(currentLine);

                    // Check if parsed object is an Array
                    if (Array.isArray(parsedLine)) {

                      console.log('>>>parse line>>>');
                      console.log(parsedLine);

                      // Check all units are object formatted in an expected way
                      let valid = parsedLine.every(function (unit) {
                        return typeof unit === 'object' && typeof unit.type === 'string';
                      });
                      if (valid) {
                        // Translate each unit.content
                        let translatedArray = [];
                        for (let pl = 0; pl < parsedLine.length; pl++) {
                          let currentUnit = parsedLine[pl];
                          translatedArray.push(_translateUnit(currentUnit, dictionary));
                        }
                        console.log('>>>translatedArray>>>');
                        console.log(translatedArray);
                        translatedLine = JSON.stringify(translatedArray);
                      } else {

                        // Not expected (no implementation). Keep as-is.
                        translatedLine = currentLine;
                      }

                    } else if (typeof parsedLine === 'object') { // Check if parsed object is an Object

                      // Not expected (no implementation). Keep as-is.
                      translatedLine = JSON.stringify(_translateUnit(parsedLine, dictionary));

                    } else {

                      // Translate value as-is
                      translatedLine = _findInDictionary(currentLine, dictionary);
                    }

                  } catch (error) {

                    // Translate value as-is
                    translatedLine = _findInDictionary(currentLine, dictionary);
                  }

                } else {

                  // Translate value as-is
                  translatedLine = _findInDictionary(currentLine, dictionary);

                }
              }

              translatedLines.push(translatedLine);
            }
            translatedCell = translatedLines.join("\n");
          } else {
            // Translate value as-is
            translatedCell = _findInDictionary(currentCell, dictionary);
          }
        }

        translatedRow.push(translatedCell);
      }
      
      translation.push(translatedRow);
    }

    console.log('>>>translation>>>');
    console.log(translation);
    return translation;
  })

};

let _translateUnit = function (currentUnit, dictionary) {

  let translatedItem = JSON.parse(JSON.stringify(currentUnit));

  switch(currentUnit.type.toLowerCase()) {
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
        let imageContents = JSON.parse(currentUnit.content);
        console.log('>>>parse images>>>');
        console.log(imageContents);

        if (Array.isArray(imageContents) && imageContents.length > 0) {
          let translatedImageContents = [];
          for (let ic = 0; ic < imageContents.length; ic++) {
            let currentImageContent = imageContents[ic];
            let translatedImageContent = JSON.parse(JSON.stringify(currentImageContent));
            translatedImageContent['alt'] = _findInDictionary(currentImageContent['alt'], dictionary);
            translatedImageContent['description'] = _findInDictionary(currentImageContent['description'], dictionary);
            translatedImageContent['title'] = _findInDictionary(currentImageContent['title'], dictionary);
            translatedImageContents.push(translatedImageContent);
          }
          translatedItem['content'] = JSON.stringify(translatedImageContents);
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
        let linkContents = JSON.parse(currentUnit.content);
        console.log('>>>parse links>>>');
        console.log(linkContents);

        if (Array.isArray(linkContents) && linkContents.length > 0) {
          let translatedLinkContents = [];
          for (let lc = 0; lc < linkContents.length; lc++) {
            let currentLinkContent = linkContents[lc];
            let translatedLinkContent = JSON.parse(JSON.stringify(currentLinkContent));
            translatedLinkContent['description'] = _findInDictionary(currentLinkContent['description'], dictionary);
            translatedLinkContent['title'] = _findInDictionary(currentLinkContent['title'], dictionary);
            translatedLinkContents.push(translatedLinkContent);
          }
          translatedItem['content'] = JSON.stringify(translatedLinkContents);
        }

      } catch (error) {
        console.error('Error when trying to parse link unit.');
        console.error(currentUnit);
      }
      break;
    }
    case 'html': {
      console.log('>>>>>>>>>>>> html >>>>>>>>>>')
      var noLineBreak = currentUnit['content'].replace(/(<br>|<br>\n)/gm, "");
      // var noLineBreak = currentUnit['content'].replace(/(\r\n|\n|\r|<br>)/gm, "");
      translatedItem['content'] = _findInDictionary(noLineBreak, dictionary);
      break;
    }
    case 'rich-text': {
      console.log('>>>>>>>>>>>> rich-text >>>>>>>>>>')
      var noLineBreak = currentUnit['content'].replace(/(<br>|<br>\n)/gm, "");
      // var noLineBreak = currentUnit['content'].replace(/(\r\n|\n|\r|<br>)/gm, "");
      translatedItem['content'] = _findInDictionary(noLineBreak, dictionary);
      break;
    }
    case 'accordion': {
      translatedItem['accordion-title'] = _findInDictionary(currentUnit['accordion-title'], dictionary);
      var noLineBreak = currentUnit['accordion-body'].replace(/(<br>|<br>\n)/gm, "");
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

}

let _findInDictionary = function (value, dictionary) {
  let result = value;
  // Check value is not empty string
  if (typeof value === 'string' && value !== '') {
    // Look in dictionary translation
    let translatedCharCount = 0;
    for (let r = 0; r < dictionary.length; r++) {
      let current = dictionary[r][0];
      let translation = dictionary[r][1];
      if ((typeof current === 'string') && current !== '') {
        if (current === result) {
          // If exact match, replace totally and break
          result = translation;
          break;
        } else if (value.indexOf(current) !== -1) {
          // If partial match, replace and continue
          // If sentence finishes by 。(Japanese punctuation), add a space
          if (current.charAt(current.length-1) === '。') {
            result = result.replace(current, translation+' ');
          } else {
            result = result.replace(current, translation);
          }
          continue;
        }
      }
    }
  }
  return result;
};

window.addEventListener('load', init);