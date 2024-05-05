class CoAWSaveManager {
  constructor() {}

  loadSaveSections(header, main, suspended, suspendedBackupHeader) {
    this.clear();
    Object.assign(this, { header, main, suspended, suspendedBackupHeader });
  }

  loadSaveStr(saveStr) {
    const { header, main, suspended, suspendedBackupHeader } =
      tWgm.tGameSave.splitSaveData(saveStr);

    this.loadSaveSections(header, main, suspended, suspendedBackupHeader);
  }

  setFilename(filename) {
    this.filename = filename;
  }

  isSaveLoaded() {
    return this.main !== undefined;
  }

  checkSaveUnloaded() {
    if (!this.isSaveLoaded()) throw new Error('No save data loaded');
  }

  clear() {
    this.main =
      this.header =
      this.suspended =
      this.suspendedBackupHeader =
      this.filename =
        undefined;
  }

  toSaveStr() {
    this.checkSaveUnloaded();
    const newSaveStr = tWgm.tGameSave.convertSaveData({
      header: this.header,
      main: this.main,
      suspended: this.suspended,
      suspendedBackupHeader: this.suspendedBackupHeader,
    });

    return newSaveStr;
  }

  async getMain() {
    this.checkSaveUnloaded();
    const b64decoded = tWgm.tGameSave.convertBase64ToUint8Array(this.main);
    const unzipped = await unzipData(b64decoded);

    return unzipped;
  }

  async setMain(main) {
    this.checkSaveUnloaded();
    const zipped = await zipData(main);
    const b64encoded = await convertUint8ArrayToBase64(zipped);
    this.main = b64encoded;
  }

  getHeader() {
    this.checkSaveUnloaded();
    return tFn.t.jsonDecode(this.header);
  }

  setHeader(header) {
    this.checkSaveUnloaded();
    const encoded = tFn.t.jsonEncode(header);
    this.header = encoded;
  }
}

// 次にブラウザ版異世界の創造者を起動してタイトル画面が表示された状態でこのコードを開発者コンソールにコピペして実行して下さい。
// 書き換え対象のファイル選択が開きますので選択して下さい。
// 変換が完了するとブラウザのダウンロードファイルとしてエクスポートされます。※実際にはインターネットアクセスはしていません

// なお変換作業実施後はゲームをスタートする前に一度ページをリロードしてください。

async function zipData(data) {
  return new Promise((resolve) => {
    tWgm.tGameSave.zipDataWorker(data, resolve);
  });
}

async function unzipData(zippedData) {
  return new Promise((resolve) => {
    tWgm.tGameSave.unzipDataWorker(zippedData, resolve);
  });
}

// same as the one in tGameSave.save
async function convertUint8ArrayToBase64(data) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([data], { type: 'application/gzip' });
    const fr = new FileReader();
    fr.addEventListener('load', (e) => {
      resolve(e.target.result.substr(29));
    });
    fr.addEventListener('error', reject);
    fr.readAsDataURL(blob);
  });
}

async function editSaveStr(saveStr, editFn) {
  const save = new CoAWSaveManager();
  save.loadSaveStr(saveStr);
  const headerData = save.getHeader();
  const mainData = await save.getMain();
  const [newHeaderData, newMainData] = editFn(headerData, mainData);
  await save.setMain(newMainData);
  save.setHeader(newHeaderData);

  const newSaveStr = save.toSaveStr();
  return newSaveStr;
}

const downloadLink = document.createElement('a');
downloadLink.href = 'javascript:void(0)';
downloadLink.download = 'temp.txt';
document.body.appendChild(downloadLink);

function export_(data, name) {
  downloadLink.download = name;
  const blob = new Blob([data], { type: 'text/plain' });
  window.navigator.msSaveBlob
    ? window.navigator.msSaveBlob(blob, name)
    : (downloadLink.href = window.URL.createObjectURL(blob));
  downloadLink.click();
}

function _getNewInputElement() {
  const rootElement = document.createElement('div');
  rootElement.className = 'none';
  document.body.appendChild(rootElement);
  const inputElement = document.createElement('input');
  inputElement.type = 'file';
  inputElement.name = 'import';
  inputElement.setAttribute('accept', '*');
  rootElement.appendChild(inputElement);
  return inputElement;
}

function _setTextFileAction(inputElement, fn) {
  $(inputElement).on('click', () => {
    inputElement.value = '';
  });
  $(inputElement).on('change', (e) => {
    const files = e.target.files;
    if (files.length === 0) throw new Error('No file selected');
    const filename = e.target.files[0].name;
    console.log('Loading...');
    const fr = new FileReader();
    fr.onload = (e) => fn(e, filename);
    fr.onerror = (e) => {
      throw e;
    };
    fr.readAsText(files[0]);
  });
}

const coawSave = new CoAWSaveManager();

const coawSaveInputElement = _getNewInputElement();

_setTextFileAction(coawSaveInputElement, (e, filename) => {
  coawSave.loadSaveStr(e.target.result);
  coawSave.setFilename(filename);
  console.log(`Save data has been loaded to coawSave`);
});

const jsonInputElement = _getNewInputElement();

_setTextFileAction(jsonInputElement, (e) => {
  const decoded = tFn.t.jsonDecode(e.target.result);
  coawSave.setMain(decoded).then(() => {
    console.log(`Updated main`);
  });
});

async function exportMainAsJson() {
  const main = await coawSave.getMain();
  const mainStr = tFn.t.jsonEncode(main);
  export_(mainStr, (coawSave.filename ?? 'tbrg_save_X.tbrgsv') + '.json');
}

async function importMainFromJson() {
  $(jsonInputElement).trigger('click');
}

function loadSaveFile() {
  $(coawSaveInputElement).trigger('click');
}

function saveSaveFile() {
  export_(coawSave.toSaveStr(), coawSave.filename ?? 'tbrg_save_X.tbrgsv');
}
