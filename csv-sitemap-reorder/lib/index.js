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
  const parsePromises = files.map((file) => new Promise(((resolve) => {
    Papa.parse(file, {
      complete: resolve,
    });
  })));
  return Promise.all(parsePromises);
};

/**
 * Reorder URLs in a sitemap in hierarchical (paths tree) order.
 * @param {Array} content - Content CSV
 * @return {Promise}
 * @private
 */
const _reorder = async function _reorder(content) {
  const translation = [...content];

  translation.sort((a, b) => {
    const urlA = a[a.length - 1].replace('.html', '');
    const urlB = b[b.length - 1].replace('.html', '');

    if (urlA < urlB) {
      return -1;
    }
    if (urlA > urlB) {
      return 1;
    }
    return 0;
  });

  return translation;
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

  let error = 0;
  // Check a valid content file has been selected
  if (contentInput.files.length !== 1 || !(contentInput.files[0] instanceof File)) {
    error++;
    const contentLabel = content.getElementsByClassName('input-path')[0];
    contentLabel.classList.add('error');
  }

  if (error === 0) {
    // Set loading mask
    const loadingMask = document.getElementById('loading-mask');
    loadingMask.classList.add('active');

    // Parse files
    const files = [contentInput.files[0]];
    const parsedCSV = await _parseCSVFiles(files);

    // Reorder
    const translation = await _reorder(parsedCSV[0].data);

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
    const fileName = `${contentInput.files[0].name.substring(0, contentInput.files[0].name.length - 4)}_SLUGIFIED.csv`;
    saveAs(csvFile, fileName); // FileSaver

    // Unset loading mask
    loadingMask.classList.remove('active');
  }
};

const init = async function init() {
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

  /** ---- * */
  /** Handle files selection * */
  /** ---- * */
  contentInput.addEventListener('change', _onFileSelection(content));

  /** ---- * */
  /** Handle translate button * */
  /** ---- * */
  const submit = document.getElementById('submit-button');
  submit.addEventListener('click', async () => {
    await _onSubmit();
  });
};

window.addEventListener('load', init);
